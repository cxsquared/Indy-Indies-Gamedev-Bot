import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client, Guild, GuildChannel } from 'discord.js';
import {
  DiscordService,
  type CreateEventDto,
} from 'src/services/discord/discord.service';
import { MeetupService } from 'src/services/meetup/meetup.service';
import { AutoSync } from 'src/services/typeorm/entities/auto-sync.entity';
import { Event } from 'src/types/__generated__/graphql';
import { In, Repository } from 'typeorm';

@Injectable()
export class EventSyncUseCase {
  // The event sync is idempotent so it's fine for this to get cleared if we reset the server
  private readonly createdEvents = new Set<string>();
  private readonly logger: Logger = new Logger(EventSyncUseCase.name);

  constructor(
    private readonly discordClient: Client,
    private readonly meetupService: MeetupService,
    private readonly discordService: DiscordService,
    @InjectRepository(AutoSync) private autoSyncRepo: Repository<AutoSync>,
  ) {}

  async eventAutoSync(guildIdsToSync?: string[]) {
    const autoSyncGuilds =
      guildIdsToSync && guildIdsToSync.length > 0
        ? await this.autoSyncRepo.findBy({
            guildId: In(guildIdsToSync),
          })
        : await this.autoSyncRepo.find();

    for (const autoSync of autoSyncGuilds) {
      try {
        const guild = await this.discordClient.guilds.fetch(autoSync.guildId);
        const channel = (await guild.channels.fetch(
          autoSync.channelId,
        )) as GuildChannel;

        if (guild == null || channel == null) {
          this.logger.error(
            `Couldn't find guild and/or channel for ${JSON.stringify(autoSync)}. Skipping sync...`,
          );
          continue;
        }

        this.syncEvents(guild, channel, autoSync.urlname);
      } catch (e) {
        this.logger.error(
          `Failed to auto sync for ${JSON.stringify(autoSync)}`,
          e,
        );
      }
    }
  }

  async syncEvents(guild: Guild, channel: GuildChannel, meetupUrlname: string) {
    const meetupEvents = await this.meetupService.getEvents(meetupUrlname);

    const meetupEventsToCreate = meetupEvents
      ?.filter((e) => !this.createdEvents.has(e.node.title))
      .map((e) => {
        return {
          name: e.node.title,
          description: e.node.description,
          startDateTimeUtc: e.node.dateTime,
          endDateTimeUtc: e.node.endTime,
          location: this.createLocation(e.node),
          channel: channel,
        } as CreateEventDto;
      });

    if (!meetupEventsToCreate) return;

    for (const event of meetupEventsToCreate) {
      this.createdEvents.add(event.name);
      await this.discordService.createEvent(guild, event);
    }
  }

  private createLocation(node: Event) {
    if (
      node.venues == null ||
      node.venues?.length <= 0 ||
      node.venues[0].venueType == 'online'
    )
      return null;

    const venue = node.venues[0];
    return `${venue.address} ${venue.city}, ${venue.state} ${venue.postalCode}`;
  }
}

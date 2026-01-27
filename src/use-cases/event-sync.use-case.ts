import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client, Guild, GuildChannel } from 'discord.js';
import {
  DiscordService,
  type CreateEventDto,
} from 'src/services/discord/discord.service';
import { MeetupService } from 'src/services/meetup/meetup.service';
import { AutoSync } from 'src/services/typeorm/entities/auto-sync.entity';
import { SyncedEvent } from 'src/services/typeorm/entities/synced-event.entity';
import { Event } from 'src/types/__generated__/graphql';
import { In, Repository } from 'typeorm';

@Injectable()
export class EventSyncUseCase {
  // The event sync is idempotent so it's fine for this to get cleared if we reset the server
  private readonly logger: Logger = new Logger(EventSyncUseCase.name);

  constructor(
    private readonly discordClient: Client,
    private readonly meetupService: MeetupService,
    private readonly discordService: DiscordService,
    @InjectRepository(AutoSync) private autoSyncRepo: Repository<AutoSync>,
    @InjectRepository(SyncedEvent)
    private syncedEventRepo: Repository<SyncedEvent>,
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

    if (!meetupEvents || meetupEvents.length <= 0) {
      this.logger.warn(`Failed to get meetup events for ${guild.id}`);
      return;
    }

    const meetupEventsToCreate = meetupEvents.map((e) => {
      return {
        eventId: e.node.id,
        name: e.node.title,
        description: e.node.description,
        startDateTimeUtc: e.node.dateTime,
        endDateTimeUtc: e.node.endTime,
        location: this.createLocation(e.node),
        channel: channel,
      } as CreateEventDto;
    });

    const eventsAlreadySynced = await this.syncedEventRepo.findBy({
      eventId: In(meetupEventsToCreate.map((m) => m.eventId)),
      guildId: guild.id,
    });

    const alreadySyncedIds = new Set<string>(
      eventsAlreadySynced.map((e) => e.eventId),
    );

    const eventsToSync = meetupEventsToCreate.filter(
      (m) => !alreadySyncedIds.has(m.eventId),
    );

    if (eventsToSync.length <= 0) return;

    const eventsSynced: CreateEventDto[] = [];
    for (const event of eventsToSync) {
      try {
        await this.discordService.createEvent(guild, event);
        eventsSynced.push(event);
      } catch (e) {
        this.logger.error(
          `Failed to create event ${event.eventId} for guild ${guild.id}`,
          e,
        );
      }
    }

    await this.syncedEventRepo.insert(
      eventsSynced.map((es) => {
        return {
          eventId: es.eventId,
          guildId: guild.id,
          eventSource: 'meetup',
          created: new Date(),
        } as SyncedEvent;
      }),
    );
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

import { Injectable } from '@nestjs/common';
import { Guild, GuildChannel } from 'discord.js';
import {
  DiscordService,
  type CreateEventDto,
} from 'src/services/discord/discord.service';
import { MeetupService } from 'src/services/meetup/meetup.service';
import { Event } from 'src/types/__generated__/graphql';

@Injectable()
export class EventSyncUseCase {
  // The event sync is idempotent so it's fine for this to get cleared if we reset the server
  private readonly createdEvents = new Set<string>();

  constructor(
    private readonly meetupService: MeetupService,
    private readonly discordService: DiscordService,
  ) {}

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

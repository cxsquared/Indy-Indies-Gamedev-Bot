import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import {
  ChannelType,
  Client,
  Guild,
  GuildChannel,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildMember,
} from 'discord.js';

export type CreateEventDto = {
  eventId: string;
  name: string;
  startDateTimeUtc: Date;
  endDateTimeUtc: Date;
  description: string;
  location?: string;
  channel?: GuildChannel; // required if not using a location
};

@Injectable()
export class DiscordService {
  readonly discord_url = 'https://discord.com/api/v10';
  readonly event_cache_key = 'discord_events';
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly client: Client,
  ) {}

  public async createEvent(guild: Guild, event: CreateEventDto): Promise<void> {
    const manager = await this.client.guilds.fetch({
      guild,
    });

    if (!manager) {
      console.log("couldn't find guild");
      return;
    }

    // check if event exists already
    let cachedEvents = await this.cacheManager.get<Set<string>>(
      this.event_cache_key,
    );

    if (cachedEvents) {
      if (cachedEvents.has(event.name)) {
        // We found a match in name so we aren't going to create a new one
        return;
      }
    } else {
      const events = await manager.scheduledEvents.fetch();

      const eventsByName = new Set(events.map((e) => e.name));

      await this.cacheManager.set(this.event_cache_key, eventsByName, 60_000);

      if (eventsByName.has(event.name)) {
        // We found a match in name so we aren't going to create a new one
        return;
      }
    }

    await manager.scheduledEvents.create({
      channel: event.location ? undefined : event.channel?.id,
      entityMetadata: event.location
        ? {
            location: event.location,
          }
        : undefined,
      name: event.name,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      scheduledStartTime: event.startDateTimeUtc,
      scheduledEndTime: event.endDateTimeUtc,
      description: event.description.replace(/\[([^\[\]]*)\]\((.*?)\)/gm, '$1'),
      entityType: this.getEventEntityType(event),
    });
  }

  public async banMember(guild: Guild, member: GuildMember) {
    const manager = await this.client.guilds.fetch({
      guild,
    });

    if (!manager) {
      console.log("couldn't find guild");
      return;
    }

    await manager.members.ban(member, {
      deleteMessageDays: 1,
      reason: 'Triggered honeypot',
    });
  }

  private getEventEntityType(
    event: CreateEventDto,
  ): GuildScheduledEventEntityType {
    if (event.location) {
      return GuildScheduledEventEntityType.External;
    }

    return event.channel?.type === ChannelType.GuildStageVoice
      ? GuildScheduledEventEntityType.StageInstance
      : GuildScheduledEventEntityType.Voice;
  }
}

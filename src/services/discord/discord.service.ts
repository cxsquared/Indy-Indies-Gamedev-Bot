import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  Client,
  Guild,
  GuildChannel,
  GuildMember,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  Message,
  Snowflake,
  TextChannel,
} from 'discord.js';
import { matchesGlob } from 'path';

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

  private readonly logger = new Logger(DiscordService.name);

  public async createEvent(guild: Guild, event: CreateEventDto): Promise<void> {
    const manager = await this.client.guilds.fetch({
      guild,
    });

    if (!manager) {
      this.logger.warn(`Could not find Guild ${guild.id}`)
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
        return; }
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
      this.logger.warn(`Could not find Guild ${guild.id}`)
      return;
    }

    await manager.members.ban(member, {
      deleteMessageSeconds: 60 * 60 * 24,
      reason: 'Triggered honeypot',
    });
  }

  public async timeoutMember(member: GuildMember) {
    await member.timeout(60 * 60 * 24, 'Triggered honeypot');
  }

  public async deleteMessage(message: Message) {
    await message.delete(); 
  }

  public async sendMessage(message: string, guild: Guild, channelId: Snowflake) {
    const fetchedChannel = await guild.channels.fetch(channelId)

    if (!fetchedChannel) {
      this.logger.warn(`Could not find channel ${channelId} for Guild ${guild.id}`)
      return
    }

    if (!fetchedChannel.isSendable() || !fetchedChannel.isTextBased()) {
      this.logger.warn(`Could not send to the channel ${channelId} for Guild ${guild.id}`)
      return
    }

    await (fetchedChannel as TextChannel).send(message);
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

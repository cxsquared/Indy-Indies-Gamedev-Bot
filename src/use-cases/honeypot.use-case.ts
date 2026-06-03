import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DiscordService } from '@services/discord/discord.service';
import { HoneypotEvent } from '@services/typeorm/entities/honeypot-event.entity';
import { Honeypot } from '@services/typeorm/entities/honeypot.entity';
import { Channel, Guild, GuildChannel, GuildMember } from 'discord.js';
import { Repository } from 'typeorm';

export enum UpsertResult {
  CREATED,
  UPDATED,
  ERROR,
}

@Injectable()
export class HoneypotUseCase {
  // The event sync is idempotent so it's fine for this to get cleared if we reset the server
  private readonly logger: Logger = new Logger(HoneypotUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly discordService: DiscordService,
    @InjectRepository(Honeypot)
    private honeypotRepo: Repository<Honeypot>,
    @InjectRepository(HoneypotEvent)
    private honeypotEventRepo: Repository<HoneypotEvent>,
  ) {}

  async upsertHoneypot(
    guild: Guild,
    channel: GuildChannel,
    notifyChannel?: GuildChannel
  ): Promise<UpsertResult> {
    try {
      const existingHoneypot = await this.honeypotRepo.findOneBy({
        guildId: guild.id,
      });

      if (existingHoneypot) {
        await this.honeypotRepo.save({
          ...existingHoneypot,
          channelId: channel.id,
          notifyChannelId: notifyChannel?.id
        });

        return UpsertResult.UPDATED;
      }

      await this.honeypotRepo.save({
        guildId: guild.id,
        channelId: channel.id,
        notifyChannelId: notifyChannel?.id
      } as Honeypot);

      return UpsertResult.CREATED;
    } catch (e) {
      this.logger.error('Error upserting honeypot', e);
      return UpsertResult.ERROR;
    }
  }

  async onDiscordMessage(
    guild: Guild | null,
    channel: Channel,
    member: GuildMember | null,
    content: string,
  ) {
    if (guild === null) {
      this.logger.warn('got a message from a null guild');
      return;
    }

    if (member === null) {
      this.logger.warn('got a message from a null member');
      return;
    }

    const honeypot = await this.honeypotRepo.findOneBy({
      guildId: guild.id,
    });

    if (!honeypot) return; // no honeypot setup

    if (honeypot.channelId !== channel.id) return; // not the honeypot channel

    const ignoredRole = this.configService.get<string>('ADMIN_ROLE');
    const fetchedMember = await member.fetch(true)
    const roles = fetchedMember != null ? fetchedMember['_roles'] : [];

    if (roles.some(role => role === ignoredRole)) {
      this.logger.debug(`Not banning admin: ${JSON.stringify(member)}`)
      await this.notify(`Did not ban ${member?.displayName} but they should stop posting in the honeypot channel`, honeypot, guild);
      return;
    }

    this.logger.debug(`Banning: ${JSON.stringify(member)}`)

    await this.discordService.banMember(guild, member);

    const user = await member.user.fetch();
    const guildChannel = await guild.channels.fetch(channel.id);
    await this.notify(`${user.globalName} (${member.displayName}) was banned for posting "${content}" in the channel "${guildChannel?.name ?? "**unknown channel name**"} (${channel.id})"`, honeypot, guild);

    await this.honeypotEventRepo.save({
      honeypot: honeypot,
      memberId: member.id,
      event: 'BAN',
      message: content,
    } as HoneypotEvent);
  }

  private async notify(message: string, honeypot:Honeypot, guild: Guild) {
    if (honeypot.notifyChannelId) {
      await this.discordService.sendMessage(message, guild, honeypot.notifyChannelId);
    }
  }
}

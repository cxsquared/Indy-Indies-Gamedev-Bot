import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Channel, Guild, GuildChannel, GuildMember } from 'discord.js';
import { DiscordService } from 'src/services/discord/discord.service';
import { HoneypotEvent } from 'src/services/typeorm/entities/honeypot-event.entity';
import { Honeypot } from 'src/services/typeorm/entities/honeypot.entity';
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
    private readonly discordService: DiscordService,
    @InjectRepository(Honeypot)
    private honeypotRepo: Repository<Honeypot>,
    @InjectRepository(HoneypotEvent)
    private honeypotEventRepo: Repository<HoneypotEvent>,
  ) {}

  async upsertHoneypot(
    guild: Guild,
    channel: GuildChannel,
  ): Promise<UpsertResult> {
    try {
      const existingHoneypot = await this.honeypotRepo.findOneBy({
        guildId: guild.id,
      });

      if (existingHoneypot) {
        await this.honeypotRepo.save({
          ...existingHoneypot,
          channelId: channel.id,
        });

        return UpsertResult.UPDATED;
      }

      await this.honeypotRepo.save({
        guildId: guild.id,
        channelId: channel.id,
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

    await this.discordService.banMember(guild, member);

    await this.honeypotEventRepo.save({
      honeypot: honeypot,
      memberId: member.id,
      event: 'BAN',
      message: content,
    } as HoneypotEvent);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  Options,
  SlashCommand,
  StringOption,
  type SlashCommandContext,
} from 'necord';
import { EventSyncUseCase } from './use-cases/event-sync.use-case';
import { ChannelType, GuildChannel, MessageFlags } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AutoSync } from './services/typeorm/entities/auto-sync.entity';
import { Repository } from 'typeorm';
import { HoneypotUseCase, UpsertResult } from './use-cases/honeypot.use-case';

export class SyncEventsDto {
  @StringOption({
    name: 'urlname',
    description: 'The urlname for the meetup org you want to sync events with',
    required: true,
  })
  urlname: string;

  @ChannelOption({
    name: 'channel',
    description: 'The voice channel to attach to online events',
    required: true,
    channel_types: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
  })
  channel: GuildChannel;
}

export class HoneypotDto {
  @ChannelOption({
    name: 'channel',
    description: 'The text channel to designate as the honeypot. Any posts in this channel will ban the user',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel: GuildChannel;
  @ChannelOption({
    name: 'notification-channel',
    description: 'What channel should we post in if the honeypot bans a user',
    required: false,
    channel_types: [ChannelType.GuildText],
  })
  notificationChannel?: GuildChannel;
}

@Injectable()
export class AppCommands {
  private readonly logger = new Logger(AppCommands.name);
  constructor(
    private readonly eventSyncUseCase: EventSyncUseCase,
    private readonly honeypotUseCase: HoneypotUseCase,
    private readonly configService: ConfigService,
    @InjectRepository(AutoSync)
    private readonly autoSyncRepo: Repository<AutoSync>,
  ) { }

  @SlashCommand({
    name: 'sync',
    description: 'Syncs events from the given meetup urlname to discord events',
  })
  public async onSyncEvents(
    @Context() [interaction]: SlashCommandContext,
    @Options() { urlname, channel }: SyncEventsDto,
  ) {
    try {
      const acceptedRole = this.configService.get<string>('ADMIN_ROLE');
      const member = interaction.member;

      // something is really dumb here where the private _roles has the roles
      // but the getter roles doesn't
      //@ts-expect-error
      const roles: string[] = member != null ? member['_roles'] : [];

      if (!roles.some((r) => r == acceptedRole)) {
        this.logger.debug(`this user is not an admin: ${JSON.stringify(member)}`)
        await interaction.reply({
          content: 'Only admins can initiate a sync',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      if (interaction.guild === null) {
        await interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      if (urlname === null || urlname.replaceAll(' ', '') === '') {
        await interaction.reply({
          content: 'urlname is not valid',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      await this.eventSyncUseCase.syncEvents(
        interaction.guild,
        channel,
        urlname,
      );

      await interaction.reply({
        content: 'Events synced',
        flags: MessageFlags.Ephemeral,
      });
      return
    } catch (e) {
      this.logger.error(`Sync Event error: ${JSON.stringify(e)}`);
    }
  }

  @SlashCommand({
    name: 'autosync',
    description: 'Schedules an event sync ever hour',
  })
  public async onAutoSyncEvents(
    @Context() [interaction]: SlashCommandContext,
    @Options() { urlname, channel }: SyncEventsDto,
  ) {
    try {
      const acceptedRole = this.configService.get<string>('ADMIN_ROLE');
      const member = interaction.member;

      // something is really dumb here where the private _roles has the roles
      // but the getter roles doesn't
      //@ts-expect-error
      const roles: string[] = member != null ? member['_roles'] : [];

      if (!roles.some((r) => r == acceptedRole)) {
        await interaction.reply({
          content: 'Only admins can initiate an auto sync',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      if (interaction.guild === null) {
        await interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      if (urlname === null || urlname.replaceAll(' ', '') === '') {
        await interaction.reply({
          content: 'urlname is not valid',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      const existingAutoSync = await this.autoSyncRepo.findOneBy({
        guildId: interaction.guild.id,
      });

      if (existingAutoSync) {
        existingAutoSync.channelId = channel.id;
        existingAutoSync.urlname = urlname;

        await this.autoSyncRepo.save(existingAutoSync);
        await interaction.reply({
          content: 'Auto sync updated',
          flags: MessageFlags.Ephemeral,
        });
        return
      }

      await this.autoSyncRepo.save(
        this.autoSyncRepo.create({
          guildId: interaction.guild.id,
          channelId: channel.id,
          urlname: urlname,
        }),
      );

      await interaction.reply({
        content: 'Auto sync scheduled',
        flags: MessageFlags.Ephemeral,
      });

      return
    } catch (e) {
      this.logger.error(`Auto sync Event error: `, e);
    }
  }

  @SlashCommand({
    name: 'stopautosync',
    description: 'Removes schedule for event sync ever hour',
  })
  public async onStopSyncEvents(@Context() [interaction]: SlashCommandContext) {
    try {
      const acceptedRole = this.configService.get<string>('ADMIN_ROLE');
      const member = interaction.member;

      // something is really dumb here where the private _roles has the roles
      // but the getter roles doesn't
      //@ts-expect-error
      const roles: string[] = member != null ? member['_roles'] : [];

      if (!roles.some((r) => r == acceptedRole)) {
        await interaction.reply({
          content: 'Only admins can initiate an auto sync',
          flags: MessageFlags.Ephemeral,
        });

        return
      }

      if (interaction.guild === null) {
        await interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });

        return
      }

      const existingAutoSync = await this.autoSyncRepo.findOneBy({
        guildId: interaction.guild.id,
      });

      if (existingAutoSync) {
        await this.autoSyncRepo.softDelete(existingAutoSync.id);

        await interaction.reply({
          content: 'Auto sync stopped',
          flags: MessageFlags.Ephemeral,
        });

        return
      }

      await interaction.reply({
        content: 'No Auto sync scheduled',
        flags: MessageFlags.Ephemeral,
      });

      return
    } catch (e) {
      this.logger.error(`Stop auto sync Event error: ${JSON.stringify(e)}`);
    }
  }

  @SlashCommand({
    name: 'honeypot',
    description: 'Desigantes a channel as a honeypot',
  })
  public async onHoneypotEvent(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, notificationChannel }: HoneypotDto,
  ) {
    try {
      const acceptedRole = this.configService.get<string>('ADMIN_ROLE');
      const member = interaction.member;

      // something is really dumb here where the private _roles has the roles
      // but the getter roles doesn't
      //@ts-expect-error
      const roles: string[] = member != null ? member['_roles'] : [];

      if (!roles.some((r) => r == acceptedRole)) {
        await interaction.reply({
          content: 'Only admins can preform this action',
          flags: MessageFlags.Ephemeral,
        });

        return
      }

      if (interaction.guild === null) {
        await interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });

        return
      }

      if (channel === null) {
        await interaction.reply({
          content: 'Channel is not valid',
          flags: MessageFlags.Ephemeral,
        });

        return
      }

      const result = await this.honeypotUseCase.upsertHoneypot(
        interaction.guild,
        channel,
        notificationChannel
      );

      switch (result) {
        case UpsertResult.CREATED:
          await interaction.reply({
            content: 'Honeypot created',
            flags: MessageFlags.Ephemeral,
          });

          return
        case UpsertResult.UPDATED:
          await interaction.reply({
            content: 'Honeypot updated',
            flags: MessageFlags.Ephemeral,
          });

          return
        default: // Includes error
          await interaction.reply({
            content: 'Honeypot failed to create',
            flags: MessageFlags.Ephemeral,
          });

          return
      }
    } catch (e) {
      this.logger.error(`Honeypot Event error: `, e);
    }
  }
}

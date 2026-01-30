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
    description: 'The voice channel to attach to online events',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel: GuildChannel;
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
  ) {}

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
        return interaction.reply({
          content: 'Only admins can initiate a sync',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.guild === null) {
        return interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (urlname === null || urlname.replaceAll(' ', '') === '') {
        return interaction.reply({
          content: 'urlname is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      await this.eventSyncUseCase.syncEvents(
        interaction.guild,
        channel,
        urlname,
      );

      return interaction.reply({
        content: 'Events synced',
        flags: MessageFlags.Ephemeral,
      });
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
        return interaction.reply({
          content: 'Only admins can initiate an auto sync',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.guild === null) {
        return interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (urlname === null || urlname.replaceAll(' ', '') === '') {
        return interaction.reply({
          content: 'urlname is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      const existingAutoSync = await this.autoSyncRepo.findOneBy({
        guildId: interaction.guild.id,
      });

      if (existingAutoSync) {
        existingAutoSync.channelId = channel.id;
        existingAutoSync.urlname = urlname;

        this.autoSyncRepo.save(existingAutoSync);
        return interaction.reply({
          content: 'Auto sync updated',
          flags: MessageFlags.Ephemeral,
        });
      }

      await this.autoSyncRepo.save(
        this.autoSyncRepo.create({
          guildId: interaction.guild.id,
          channelId: channel.id,
          urlname: urlname,
        }),
      );

      return interaction.reply({
        content: 'Auto sync scheduled',
        flags: MessageFlags.Ephemeral,
      });
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
        return interaction.reply({
          content: 'Only admins can initiate an auto sync',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.guild === null) {
        return interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      const existingAutoSync = await this.autoSyncRepo.findOneBy({
        guildId: interaction.guild.id,
      });

      if (existingAutoSync) {
        await this.autoSyncRepo.softDelete(existingAutoSync.id);

        return interaction.reply({
          content: 'Auto sync stopped',
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        content: 'No Auto sync scheduled',
        flags: MessageFlags.Ephemeral,
      });
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
    @Options() { channel }: HoneypotDto,
  ) {
    try {
      const acceptedRole = this.configService.get<string>('ADMIN_ROLE');
      const member = interaction.member;

      // something is really dumb here where the private _roles has the roles
      // but the getter roles doesn't
      //@ts-expect-error
      const roles: string[] = member != null ? member['_roles'] : [];

      if (!roles.some((r) => r == acceptedRole)) {
        return interaction.reply({
          content: 'Only admins can initiate an auto sync',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.guild === null) {
        return interaction.reply({
          content: 'GuildId is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (channel === null) {
        return interaction.reply({
          content: 'Channel is not valid',
          flags: MessageFlags.Ephemeral,
        });
      }

      const result = await this.honeypotUseCase.upsertHoneypot(
        interaction.guild,
        channel,
      );

      switch (result) {
        case UpsertResult.CREATED:
          return interaction.reply({
            content: 'Honeypot created',
            flags: MessageFlags.Ephemeral,
          });
        case UpsertResult.UPDATED:
          return interaction.reply({
            content: 'Honeypot updated',
            flags: MessageFlags.Ephemeral,
          });
        default: // Includes error
          return interaction.reply({
            content: 'Honeypot failed to create',
            flags: MessageFlags.Ephemeral,
          });
      }
    } catch (e) {
      this.logger.error(`Auto sync Event error: `, e);
    }
  }
}

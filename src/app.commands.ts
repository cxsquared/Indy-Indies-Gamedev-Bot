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
    channel_types: [ChannelType.GuildVoice],
  })
  channel: GuildChannel;
}

@Injectable()
export class AppCommands {
  private readonly logger = new Logger(AppCommands.name);
  constructor(private readonly eventSyncUseCase: EventSyncUseCase) {}

  @SlashCommand({
    name: 'sync',
    description: 'Syncs events from the given meetup urlname to discord events',
  })
  public async onSyncEvents(
    @Context() [interaction]: SlashCommandContext,
    @Options() { urlname, channel }: SyncEventsDto,
  ) {
    try {
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
}

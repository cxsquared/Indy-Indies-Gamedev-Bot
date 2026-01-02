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
import {
  ChannelType,
  Collection,
  GuildChannel,
  GuildMemberRoleManager,
  MessageFlags,
  Role,
} from 'discord.js';
import { ConfigService } from '@nestjs/config';

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
  constructor(
    private readonly eventSyncUseCase: EventSyncUseCase,
    private readonly configService: ConfigService,
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
}

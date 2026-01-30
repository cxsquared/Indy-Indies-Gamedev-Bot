import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscordModule } from 'src/services/discord/discord.module';
import { MeetupModule } from 'src/services/meetup/meetup.module';
import { EventSyncUseCase } from './event-sync.use-case';
import { DiscordCommandsUseCase } from './discord-commands.use-case';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoSync } from 'src/services/typeorm/entities/auto-sync.entity';
import { SyncedEvent } from 'src/services/typeorm/entities/synced-event.entity';
import { Honeypot } from 'src/services/typeorm/entities/honeypot.entity';
import { HoneypotEvent } from 'src/services/typeorm/entities/honeypot-event.entity';
import { HoneypotUseCase } from './honeypot.use-case';

@Module({
  imports: [
    DiscordModule,
    MeetupModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AutoSync, SyncedEvent, Honeypot, HoneypotEvent]),
  ],
  providers: [EventSyncUseCase, DiscordCommandsUseCase, HoneypotUseCase],
  exports: [EventSyncUseCase, DiscordCommandsUseCase, HoneypotUseCase],
})
export class UseCaseModule {}

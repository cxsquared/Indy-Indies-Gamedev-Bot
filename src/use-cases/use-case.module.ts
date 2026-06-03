import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetupModule } from '@services/meetup/meetup.module';
import { AutoSync } from '@services/typeorm/entities/auto-sync.entity';
import { HoneypotEvent } from '@services/typeorm/entities/honeypot-event.entity';
import { Honeypot } from '@services/typeorm/entities/honeypot.entity';
import { SyncedEvent } from '@services/typeorm/entities/synced-event.entity';
import { EventSyncUseCase } from './event-sync.use-case';
import { HoneypotUseCase } from './honeypot.use-case';
import { DiscordModule } from '@services/discord/discord.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MeetupModule,
    DiscordModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AutoSync, SyncedEvent, Honeypot, HoneypotEvent]),
  ],
  providers: [EventSyncUseCase, HoneypotUseCase],
  exports: [EventSyncUseCase, HoneypotUseCase],
})
export class UseCaseModule {}


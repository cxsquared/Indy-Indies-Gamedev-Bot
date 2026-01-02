import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscordModule } from 'src/services/discord/discord.module';
import { MeetupModule } from 'src/services/meetup/meetup.module';
import { EventSyncUseCase } from './event-sync.use-case';
import { DiscordCommandsUseCase } from './discord-commands.use-case';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoSync } from 'src/services/typeorm/entities/auto-sync.entity';

@Module({
  imports: [
    DiscordModule,
    MeetupModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AutoSync]),
  ],
  providers: [EventSyncUseCase, DiscordCommandsUseCase],
  exports: [EventSyncUseCase, DiscordCommandsUseCase],
})
export class UseCaseModule {}

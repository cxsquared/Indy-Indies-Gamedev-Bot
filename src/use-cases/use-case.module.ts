import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscordModule } from 'src/services/discord/discord.module';
import { MeetupModule } from 'src/services/meetup/meetup.module';
import { EventSyncUseCase } from './event-sync.use-case';

@Module({
  imports: [DiscordModule, MeetupModule, ScheduleModule.forRoot()],
  providers: [EventSyncUseCase],
  exports: [EventSyncUseCase],
})
export class UseCaseModule {}

import { Controller, Get, Post } from '@nestjs/common';
import { MeetupService } from './services/meetup/meetup.service';
import { EventSyncUseCase } from './use-cases/event-sync.use-case';

@Controller()
export class AppController {
  constructor(
    private readonly meetupService: MeetupService,
    private readonly eventSyncUseCase: EventSyncUseCase,
  ) {}

  @Get('events')
  async getEvents() {
    const events = await this.meetupService.getEvents();

    return events?.map((e) => {
      return {
        ...e.node,
      };
    });
  }

  @Post('sync-events')
  async postSyncEvents() {
    this.eventSyncUseCase.syncEvents();
  }
}

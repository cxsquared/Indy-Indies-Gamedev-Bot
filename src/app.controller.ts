import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MeetupService } from './services/meetup/meetup.service';
import { EventSyncUseCase } from './use-cases/event-sync.use-case';

@Controller()
export class AppController {
  constructor(private readonly meetupService: MeetupService) {}

  @Get('events')
  async getEvents(@Query('urlname') urlname: string) {
    const events = await this.meetupService.getEvents(urlname);

    return events?.map((e) => {
      return {
        ...e.node,
      };
    });
  }
}

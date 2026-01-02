import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { MeetupService } from './services/meetup/meetup.service';
import { EventSyncUseCase } from './use-cases/event-sync.use-case';

@Controller()
export class AppController {
  constructor(
    private readonly meetupService: MeetupService,
    private readonly eventSyncUseCase: EventSyncUseCase,
  ) {}

  @Get('events')
  async getEvents(@Query('urlname') urlname: string) {
    const events = await this.meetupService.getEvents(urlname);

    return events?.map((e) => {
      return {
        ...e.node,
      };
    });
  }

  @Post('autosync')
  async postAutoSync(@Body('guildId') guildId: string) {
    if (!guildId || guildId == '') {
      return new HttpException('guildId is required', HttpStatus.BAD_REQUEST);
    }

    this.eventSyncUseCase.eventAutoSync([guildId]);
  }
}

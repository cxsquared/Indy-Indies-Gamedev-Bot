import { Injectable } from '@nestjs/common';
import { EventSyncUseCase } from './use-cases/event-sync.use-case';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AppScheduler {
  constructor(private readonly eventSyncUseCase: EventSyncUseCase) {}

  @Cron(CronExpression.EVERY_HOUR)
  async eventAutoSync() {
    this.eventSyncUseCase.eventAutoSync();
  }
}

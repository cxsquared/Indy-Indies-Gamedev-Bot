import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { MeetupModule } from './services/meetup/meetup.module';
import { UseCaseModule } from './use-cases/use-case.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    MeetupModule,
    UseCaseModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

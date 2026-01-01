import { Module } from '@nestjs/common';
import { MeetupAuth } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { MeetupService } from './meetup.service';

@Module({
  imports: [HttpModule, JwtModule.register({}), CacheModule.register()],
  providers: [MeetupAuth, MeetupService],
  exports: [MeetupService],
})
export class MeetupModule {}

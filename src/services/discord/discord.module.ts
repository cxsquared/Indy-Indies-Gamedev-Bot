import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register()],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}

import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NecordModule } from 'necord/dist/necord.module';
import { AppCommands } from './app.commands';
import { AppController } from './app.controller';
import { AppScheduler } from './app.scheduler';
import { AppListener } from './app.listener';
import { MeetupModule } from './services/meetup/meetup.module';
import { AutoSync } from './services/typeorm/entities/auto-sync.entity';
import { UseCaseModule } from './use-cases/use-case.module';
import { GatewayIntentBits } from 'discord.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
    }),
    MeetupModule,
    UseCaseModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('DISCORD_TOKEN') ?? '',
        intents: [GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildScheduledEvents],
        development: configService.get<string>('DEV_SERVER_ID')
          ? [configService.get<string>('DEV_SERVER_ID') ?? '']
          : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'indybotdb.db',
      enableWAL: true,
      synchronize: true,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([AutoSync]),
  ],
  controllers: [AppController],
  providers: [AppListener, AppCommands, AppScheduler],
})
export class AppModule {}

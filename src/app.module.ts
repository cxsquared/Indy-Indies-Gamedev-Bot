import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { MeetupModule } from './services/meetup/meetup.module';
import { UseCaseModule } from './use-cases/use-case.module';
import { NecordModule } from 'necord/dist/necord.module';
import { IntentsBitField } from 'discord.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppUpdate } from './app.update';
import { AppCommands } from './app.commands';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoSync } from './services/typeorm/entities/auto-sync.entity';
import { AppScheduler } from './app.scheduler';

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
        intents: [IntentsBitField.Flags.GuildScheduledEvents],
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
  providers: [AppUpdate, AppCommands, AppScheduler],
})
export class AppModule {}

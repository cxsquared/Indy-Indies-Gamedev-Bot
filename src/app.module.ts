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
        development: configService.get<string>('SERVER_WHITELIST')?.split(','),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppUpdate, AppCommands],
})
export class AppModule {}

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

export type CreateEventDto = {
  name: string;
  startDateTimeUtc: Date;
  endDateTimeUtc: Date;
  description: string;
  location?: string;
};

type ScheduledEvent = {
  channel_id: string;
  name: string;
};

const bot_id = 'bot_token';
const guild_id = '333942314789502977'; // not private info

@Injectable()
export class DiscordService {
  readonly discord_url = 'https://discord.com/api/v10';
  readonly event_cache_key = 'discord_events';
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  public async createEvent(event: CreateEventDto): Promise<void> {
    // Get discord auth token

    // check if event exists already
    let cachedEvents = await this.cacheManager.get<ScheduledEvent[]>(
      this.event_cache_key,
    );

    if (cachedEvents) {
      if (cachedEvents.filter((e) => e.name == event.name)) {
        // We found a match in name so we aren't going to create a new one
        return;
      }
    } else {
      const { data } = await firstValueFrom(
        this.httpService
          .get<
            ScheduledEvent[]
          >(this.discord_url + `/guilds/${guild_id}/scheduled-events`, this.getHeaders())
          .pipe(
            catchError((e: AxiosError) => {
              console.log(e.message);
              throw e;
            }),
          ),
      );

      await this.cacheManager.set(this.event_cache_key, data, 60_000);

      if (data.filter((e) => e.name == event.name)) {
        // We found a match in name so we aren't going to create a new one
        return;
      }
    }

    // create event
    let newScheduledEvent = {
      channel_id: event.location ? null : '1447710820711796736',
      entity_metadata: event.location,
      name: event.name,
      privacy_level: 2, // guild only aka anyone in the discord
      scheduled_start_time: event.startDateTimeUtc, // ISO8601
      scheduled_end_time: event.endDateTimeUtc, // ISO8601
      description: event.description,
      event_type: event.location ? 3 : 2, // 3 is external, 2 is in voice chat
    };

    const { status } = await firstValueFrom(
      this.httpService.post<ScheduledEvent>(
        this.discord_url + `/guilds/${guild_id}/scheduled-events`,
        newScheduledEvent,
        this.getHeaders(),
      ),
    );

    if (status != 200) {
      // we messed up
    }
  }

  private getHeaders() {
    return {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bot ${bot_id}`,
        'User-Agent': 'DiscordBot (url, 1.0.0)',
      },
    };
  }
}

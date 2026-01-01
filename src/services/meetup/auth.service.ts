import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, of } from 'rxjs';

type MeetupAccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

@Injectable()
export class MeetupAuth {
  private readonly ACCESS_TOKEN_KEY = 'meetup_access_token';
  private readonly REFRESH_TOKEN_KEY = 'meetup_refresh_token';

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
  ) {}

  public async getToken(): Promise<string> {
    // Check if we already have a token
    const existingToken = await this.cacheManager.get<string>(
      this.ACCESS_TOKEN_KEY,
    );

    if (existingToken) {
      return existingToken;
    }

    // Check if we can just refresh the token
    const refreshToken = await this.cacheManager.get<string>(
      this.REFRESH_TOKEN_KEY,
    );

    if (refreshToken) {
      const refreshTokenResponse = await firstValueFrom(
        this.httpService
          .post(
            'https://secure.meetup.com/oauth2/access',
            {
              client_id: '{YOUR_CLIENT_KEY}',
              client_secret: '{YOUR_CLIENT_SECRET}',
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              console.log(
                `Error using refresh token to authenticate with Meetup.com: ${error.message}, ${error.response?.data}`,
              );

              return of(null);
            }),
          ),
      );

      if (refreshTokenResponse?.data) {
        // Store Access Token
        await this.updateCache(refreshTokenResponse.data);

        return refreshTokenResponse.data.access_token;
      }

      // Otherwise we failed to refresh so we should try and get a new token
    }

    // Build JWT to get access token
    const jwt = await this.jwtService.signAsync(
      {},
      {
        algorithm: 'RS256',
        issuer: '{YOUR_CONSUMER_KEY}',
        subject: '{AUTHORIZED_MEMBER_ID}',
        audience: 'api.meetup.com',
        keyid: '{SIGNING_KEY_ID}',
        privateKey: '{RSA_KEY}',
        expiresIn: 120,
      },
    );

    // Request new Access Token
    const { data } = await firstValueFrom(
      this.httpService
        .post(
          'https://secure.meetup.com/oauth2/access',
          {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            throw `Error using JWT to authenticate with Meetup.com: ${error.message}, ${error.response?.data}`;
          }),
        ),
    );

    // Store Access Token
    await this.updateCache(data);

    return data.access_token;
  }

  private async updateCache(authResponse: MeetupAccessTokenResponse) {
    try {
      await this.cacheManager.set(
        this.ACCESS_TOKEN_KEY,
        authResponse.access_token,
        authResponse.expires_in,
      );

      await this.cacheManager.set(
        this.REFRESH_TOKEN_KEY,
        authResponse.refresh_token,
      );
    } catch (e) {
      // We don't care if the cache fails so we aren't throwing
      console.error(e);
    }
  }
}

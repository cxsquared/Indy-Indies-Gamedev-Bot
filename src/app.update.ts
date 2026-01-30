import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, type ContextOf } from 'necord';
import { HoneypotUseCase } from './use-cases/honeypot.use-case';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  public constructor(private readonly honeypotUseCase: HoneypotUseCase) {}

  @Once('clientReady')
  public onReady(@Context() [client]: ContextOf<'clientReady'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public onMessageCreated(@Context() [message]: ContextOf<'messageCreate'>) {
    this.honeypotUseCase.onDiscordMessage(
      message.guild,
      message.channel,
      message.member,
      message.content,
    );
  }
}

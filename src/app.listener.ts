import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, type ContextOf } from 'necord';
import { HoneypotUseCase } from './use-cases/honeypot.use-case';

@Injectable()
export class AppListener {
  private readonly logger = new Logger(AppListener.name);

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
    try {
      if (message.author.bot) {
        return;
      }

      this.logger.debug(`checking message : ${JSON.stringify(message)}`)


      this.honeypotUseCase.onDiscordMessage(message);
    } catch (e) {
      this.logger.error(`Failed to parse message: ${e}`)
    }
  }
}

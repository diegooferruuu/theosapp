import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../push/push.service.js';
import { TelegramService } from '../telegram/telegram.service.js';
import type { AppNotification } from './app-notification.js';

/** Envía un aviso por todos los canales: Telegram y notificaciones push. */
@Injectable()
export class NotifierService {
  private readonly logger = new Logger('Avisos');

  constructor(
    private readonly telegram: TelegramService,
    private readonly push: PushService,
  ) {}

  /** Hay al menos un canal real configurado. */
  get anyChannel(): boolean {
    return this.telegram.enabled || this.push.enabled;
  }

  /** Devuelve cuántos chats o dispositivos recibieron el aviso. */
  async broadcast(n: AppNotification): Promise<number> {
    const [telegram, push] = await Promise.all([
      this.telegram.broadcast(n.html).catch((e: Error) => {
        this.logger.error(`Telegram: ${e.message}`);
        return 0;
      }),
      this.push.broadcast(n).catch((e: Error) => {
        this.logger.error(`Push: ${e.message}`);
        return 0;
      }),
    ]);
    return telegram + push;
  }
}

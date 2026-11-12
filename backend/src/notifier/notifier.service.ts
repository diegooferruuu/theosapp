import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../push/push.service.js';
import type { AppNotification } from './app-notification.js';

/** Punto único de envío de avisos (hoy: notificaciones push de la PWA). */
@Injectable()
export class NotifierService {
  private readonly logger = new Logger('Avisos');

  constructor(private readonly push: PushService) {}

  /** Hay al menos un canal configurado. */
  get anyChannel(): boolean {
    return this.push.enabled;
  }

  /**
   * Envía a todos los usuarios que aceptan avisos (opcionalmente excepto uno,
   * p. ej. quien hizo la acción). Devuelve cuántos dispositivos lo recibieron.
   */
  async broadcast(
    n: AppNotification,
    opts: { exceptUserId?: number } = {},
  ): Promise<number> {
    try {
      return await this.push.broadcast(n, opts.exceptUserId);
    } catch (e) {
      this.logger.error(`Push: ${(e as Error).message}`);
      return 0;
    }
  }
}

/** Un aviso listo para enviarse por cualquier canal. */
export interface AppNotification {
  /** Título de la notificación push. */
  title: string;
  /** Texto plano para la notificación push. */
  body: string;
  /** Versión HTML para Telegram. */
  html: string;
  /** Ruta de la app que se abre al tocar la notificación. */
  url: string;
  /** Las notificaciones con la misma etiqueta se reemplazan entre sí. */
  tag?: string;
  /** Segundos que el servicio de push guarda el aviso si el teléfono está apagado. */
  ttl?: number;
  urgency?: 'normal' | 'high';
}

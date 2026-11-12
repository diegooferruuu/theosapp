/** Un aviso listo para enviarse como notificación push. */
export interface AppNotification {
  title: string;
  /** Texto plano (puede tener saltos de línea). */
  body: string;
  /** Ruta de la app que se abre al tocar la notificación. */
  url: string;
  /** Las notificaciones con la misma etiqueta se reemplazan entre sí. */
  tag?: string;
  /** Segundos que el servicio de push guarda el aviso si el teléfono está apagado. */
  ttl?: number;
  urgency?: 'normal' | 'high';
}

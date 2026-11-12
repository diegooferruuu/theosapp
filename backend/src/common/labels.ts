export const HEALTH_TYPE_LABEL: Record<string, string> = {
  VACCINE: 'Vacuna',
  DEWORMING_INTERNAL: 'Desparasitación interna',
  DEWORMING_EXTERNAL: 'Desparasitación externa',
};

export const GROOMING_TYPE_LABEL: Record<string, string> = {
  BATH: 'Baño',
  HAIRCUT: 'Corte de pelo',
  NAIL_TRIM: 'Corte de uñas',
  DENTAL_CLEANING: 'Limpieza dental',
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

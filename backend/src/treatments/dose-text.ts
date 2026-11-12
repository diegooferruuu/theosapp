/** Texto legible de la dosis según el tipo de tratamiento ("½ pastilla de 50 mg (25 mg) · con comida"). */

export type TreatmentKind =
  | 'PILL'
  | 'CAPSULE'
  | 'LIQUID'
  | 'ORAL_DROPS'
  | 'EAR_DROPS'
  | 'EYE_DROPS'
  | 'OINTMENT'
  | 'INJECTION'
  | 'CLEANING'
  | 'MEDICATED_BATH'
  | 'SUPPLEMENT'
  | 'OTHER';

export interface DoseFields {
  type: TreatmentKind;
  amount: number | null;
  unit: string | null;
  strength: string | null;
  site: string | null;
  foodTiming: 'WITH_FOOD' | 'FASTING' | null;
  dosage: string;
}

const FRACTIONS: Record<string, string> = {
  '0.25': '¼',
  '0.5': '½',
  '0.75': '¾',
};

const PLURAL: Record<string, string> = {
  pastilla: 'pastillas',
  cápsula: 'cápsulas',
  gota: 'gotas',
  tira: 'tiras',
  unidad: 'unidades',
  cucharada: 'cucharadas',
  sobre: 'sobres',
  aplicación: 'aplicaciones',
  uso: 'usos',
};

const num = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 2 });

/** 0.5 → "½", 1.5 → "1½", 2.5 ml → "2,5". */
export function formatAmount(n: number, fractions = true): string {
  if (fractions) {
    const whole = Math.floor(n);
    const frac = FRACTIONS[String(Math.round((n - whole) * 100) / 100)];
    if (frac) return whole ? `${whole}${frac}` : frac;
  }
  return num(n);
}

export function unitLabel(unit: string | null, amount: number | null): string {
  if (!unit) return '';
  return amount !== null && amount > 1 && PLURAL[unit] ? PLURAL[unit] : unit;
}

/** Principio activo total: "50 mg" × ½ = "25 mg"; "50 mg/ml" × 2,5 = "125 mg". */
function activeDose(
  strength: string | null,
  amount: number | null,
): string | null {
  if (!strength || amount === null) return null;
  const m = strength.match(
    /^\s*(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|µg|ui)(\s*\/\s*ml)?\s*$/i,
  );
  if (!m) return null;
  return `${num(parseFloat(m[1].replace(',', '.')) * amount)} ${m[2]}`;
}

export function describeDose(d: DoseFields): string {
  const a = d.amount;
  const site = d.site?.trim() ? d.site.trim().toLowerCase() : null;
  let text: string;
  switch (d.type) {
    case 'PILL':
    case 'CAPSULE': {
      const unit = d.type === 'PILL' ? 'pastilla' : 'cápsula';
      text = `${formatAmount(a ?? 1)} ${unitLabel(unit, a ?? 1)}`;
      if (d.strength) {
        text += ` de ${d.strength}`;
        const active = activeDose(d.strength, a);
        if (active && a !== 1) text += ` (${active})`;
      }
      break;
    }
    case 'LIQUID': {
      text = `${formatAmount(a ?? 1, false)} ml`;
      const active = activeDose(d.strength, a);
      if (active) text += ` (${active})`;
      break;
    }
    case 'ORAL_DROPS':
      text = `${num(a ?? 1)} ${unitLabel('gota', a ?? 1)}`;
      break;
    case 'EAR_DROPS':
    case 'EYE_DROPS': {
      const unit = d.unit || 'gota';
      text = `${num(a ?? 1)} ${unitLabel(unit, a ?? 1)}`;
      if (site) text += ` · ${site}`;
      break;
    }
    case 'OINTMENT':
      text = [d.unit?.trim() || 'Aplicar', site ? `en ${site}` : null]
        .filter(Boolean)
        .join(' ');
      break;
    case 'INJECTION':
      text = `${formatAmount(a ?? 1, false)} ${d.unit || 'ml'}`;
      if (d.strength) text += ` de ${d.strength}`;
      break;
    case 'CLEANING':
      text = site ? `Limpieza de ${site}` : 'Limpieza';
      break;
    case 'MEDICATED_BATH':
      text = 'Baño medicado';
      break;
    case 'SUPPLEMENT':
      text =
        a !== null
          ? `${formatAmount(a)} ${unitLabel(d.unit || 'unidad', a)}`
          : d.unit || '1 unidad';
      break;
    default:
      text = d.dosage?.trim() || '—';
  }
  if (d.foodTiming === 'WITH_FOOD') text += ' · con comida';
  if (d.foodTiming === 'FASTING') text += ' · en ayunas';
  return text;
}

/** Unidad en la que se cuenta el stock (y cuánto descuenta cada toma). */
export function stockUnit(d: Pick<DoseFields, 'type' | 'unit'>): string {
  switch (d.type) {
    case 'PILL':
      return 'pastilla';
    case 'CAPSULE':
      return 'cápsula';
    case 'LIQUID':
      return 'ml';
    case 'ORAL_DROPS':
      return 'gota';
    case 'EAR_DROPS':
    case 'EYE_DROPS':
      return d.unit || 'gota';
    case 'INJECTION':
      return d.unit || 'ml';
    case 'SUPPLEMENT':
      return d.unit || 'unidad';
    default:
      return 'uso';
  }
}

/** Cuánto se descuenta del stock por toma. */
export function perDose(d: Pick<DoseFields, 'type' | 'amount'>): number {
  const usesAmount = ![
    'OINTMENT',
    'CLEANING',
    'MEDICATED_BATH',
    'OTHER',
  ].includes(d.type);
  return usesAmount && d.amount ? d.amount : 1;
}

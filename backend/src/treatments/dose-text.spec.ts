import {
  describeDose,
  formatAmount,
  perDose,
  stockUnit,
  type DoseFields,
} from './dose-text.js';

const base: DoseFields = {
  type: 'OTHER',
  amount: null,
  unit: null,
  strength: null,
  site: null,
  foodTiming: null,
  dosage: '',
};

describe('texto de la dosis', () => {
  it('fracciones', () => {
    expect(formatAmount(0.5)).toBe('½');
    expect(formatAmount(1.5)).toBe('1½');
    expect(formatAmount(2.5, false)).toBe('2,5');
  });

  it('pastillas con concentración y comida', () => {
    expect(
      describeDose({
        ...base,
        type: 'PILL',
        amount: 0.5,
        strength: '50 mg',
        foodTiming: 'WITH_FOOD',
      }),
    ).toBe('½ pastilla de 50 mg (25 mg) · con comida');
    expect(describeDose({ ...base, type: 'PILL', amount: 2 })).toBe(
      '2 pastillas',
    );
    expect(
      describeDose({ ...base, type: 'CAPSULE', amount: 1, strength: '20 mg' }),
    ).toBe('1 cápsula de 20 mg');
  });

  it('jarabe en ml con mg/ml', () => {
    expect(
      describeDose({
        ...base,
        type: 'LIQUID',
        amount: 2.5,
        strength: '50 mg/ml',
      }),
    ).toBe('2,5 ml (125 mg)');
  });

  it('gotas en oídos y ojos con zona', () => {
    expect(
      describeDose({
        ...base,
        type: 'EAR_DROPS',
        amount: 4,
        site: 'Oído derecho',
      }),
    ).toBe('4 gotas · oído derecho');
    expect(
      describeDose({
        ...base,
        type: 'EYE_DROPS',
        amount: 1,
        unit: 'tira',
        site: 'Ambos ojos',
      }),
    ).toBe('1 tira · ambos ojos');
  });

  it('limpieza, pomada, baño y otro', () => {
    expect(describeDose({ ...base, type: 'CLEANING', site: 'Oídos' })).toBe(
      'Limpieza de oídos',
    );
    expect(
      describeDose({
        ...base,
        type: 'OINTMENT',
        unit: 'Capa fina',
        site: 'Pata delantera',
      }),
    ).toBe('Capa fina en pata delantera');
    expect(describeDose({ ...base, type: 'MEDICATED_BATH' })).toBe(
      'Baño medicado',
    );
    expect(describeDose({ ...base, dosage: '5 ml' })).toBe('5 ml');
  });

  it('stock', () => {
    expect(stockUnit({ type: 'PILL', unit: null })).toBe('pastilla');
    expect(perDose({ type: 'PILL', amount: 0.5 })).toBe(0.5);
    expect(perDose({ type: 'CLEANING', amount: null })).toBe(1);
  });
});

import type PDFDocument from 'pdfkit';

type Doc = InstanceType<typeof PDFDocument>;

export const COLORS = {
  text: '#1f2a44',
  muted: '#656b78',
  line: '#e4dfd4',
  head: '#f1eee7',
  accent: '#3a7a1f',
  chart: '#4a9a2c',
  danger: '#b42318',
};

export const MARGIN = 48;

export function pageWidth(doc: Doc) {
  return doc.page.width - MARGIN * 2;
}

function bottom(doc: Doc) {
  return doc.page.height - MARGIN - 20;
}

/** Asegura `height` puntos libres; si no, agrega una página. */
export function ensureSpace(doc: Doc, height: number) {
  if (doc.y + height > bottom(doc)) doc.addPage();
}

/** Título de sección; `following` reserva espacio para que no quede solo al final de la página. */
export function sectionTitle(doc: Doc, title: string, following = 50) {
  ensureSpace(doc, 40 + following);
  doc.moveDown(0.8);
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(COLORS.accent)
    .text(title, MARGIN, doc.y);
  const y = doc.y + 2;
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + pageWidth(doc), y)
    .lineWidth(1)
    .strokeColor(COLORS.accent)
    .stroke();
  doc.y = y + 8;
  doc.fillColor(COLORS.text);
}

export function emptyNote(doc: Doc, text = 'Sin registros en el período.') {
  doc
    .font('Helvetica-Oblique')
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(text, MARGIN, doc.y);
  doc.fillColor(COLORS.text);
}

export interface Column {
  header: string;
  /** Proporción del ancho disponible. */
  width: number;
  align?: 'left' | 'right' | 'center';
}

/** Tabla con ajuste de texto y salto de página (repite el encabezado). */
export function table(doc: Doc, columns: Column[], rows: string[][]) {
  const total = columns.reduce((a, c) => a + c.width, 0);
  const widths = columns.map((c) => (c.width / total) * pageWidth(doc));
  const pad = 4;
  const fontSize = 8.5;

  const drawHeader = () => {
    doc.font('Helvetica-Bold').fontSize(fontSize);
    const h =
      Math.max(
        ...columns.map((c, i) =>
          doc.heightOfString(c.header, { width: widths[i] - pad * 2 }),
        ),
      ) +
      pad * 2;
    doc.rect(MARGIN, doc.y, pageWidth(doc), h).fill(COLORS.head);
    let x = MARGIN;
    const y = doc.y;
    columns.forEach((c, i) => {
      doc
        .fillColor(COLORS.text)
        .text(c.header, x + pad, y + pad, {
          width: widths[i] - pad * 2,
          align: c.align ?? 'left',
        });
      x += widths[i];
    });
    doc.y = y + h;
  };

  ensureSpace(doc, 40);
  drawHeader();
  doc.font('Helvetica').fontSize(fontSize);
  for (const row of rows) {
    const h =
      Math.max(
        ...row.map((cell, i) =>
          doc.heightOfString(cell || '—', { width: widths[i] - pad * 2 }),
        ),
      ) +
      pad * 2;
    if (doc.y + h > bottom(doc)) {
      doc.addPage();
      drawHeader();
      doc.font('Helvetica').fontSize(fontSize);
    }
    const y = doc.y;
    let x = MARGIN;
    row.forEach((cell, i) => {
      doc
        .fillColor(COLORS.text)
        .text(cell || '—', x + pad, y + pad, {
          width: widths[i] - pad * 2,
          align: columns[i].align ?? 'left',
        });
      x += widths[i];
    });
    doc
      .moveTo(MARGIN, y + h)
      .lineTo(MARGIN + pageWidth(doc), y + h)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    doc.y = y + h;
  }
}

/** Gráfico de línea simple (una serie) para el peso. */
export function lineChart(
  doc: Doc,
  points: { label: string; value: number }[],
  unit: string,
) {
  const height = 120;
  ensureSpace(doc, height + 30);
  const left = MARGIN + 34;
  const width = pageWidth(doc) - 34 - 40;
  const top = doc.y + 6;
  const values = points.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const padding = Math.max((hi - lo) * 0.15, 0.5);
  lo = Math.max(0, lo - padding);
  hi += padding;
  const x = (i: number) =>
    left +
    (points.length === 1 ? width / 2 : (i / (points.length - 1)) * width);
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * height;

  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted);
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3;
    doc
      .moveTo(left, y(v))
      .lineTo(left + width, y(v))
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    doc.text(
      v.toLocaleString('es', { maximumFractionDigits: 1 }),
      MARGIN,
      y(v) - 4,
      { width: 30, align: 'right' },
    );
  }
  if (points.length > 1) {
    doc.moveTo(x(0), y(values[0]));
    values.forEach((v, i) => i && doc.lineTo(x(i), y(v)));
    doc.lineWidth(2).lineJoin('round').strokeColor(COLORS.chart).stroke();
  }
  values.forEach((v, i) => doc.circle(x(i), y(v), 2.8).fill(COLORS.chart));
  const last = points[points.length - 1];
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(COLORS.text)
    .text(
      `${last.value.toLocaleString('es', { maximumFractionDigits: 2 })} ${unit}`,
      x(points.length - 1) + 6,
      y(last.value) - 4,
    );
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted);
  doc.text(points[0].label, left, top + height + 6);
  if (points.length > 1)
    doc.text(last.label, left + width - 70, top + height + 6, {
      width: 70,
      align: 'right',
    });
  doc.y = top + height + 20;
  doc.fillColor(COLORS.text);
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dateOnly, formatDate, formatShortDate } from "@/lib/format";

interface Point {
  date: string;
  weightKg: number;
}

const PAD = { top: 16, right: 56, bottom: 26, left: 40 };
const fmtKg = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 2 });

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; ; v += step) {
    ticks.push(Number(v.toFixed(6)));
    if (v >= max - step * 0.001) break;
  }
  return ticks;
}

/** Línea de peso en el tiempo: una sola serie, eje Y en kg, tooltip al pasar el dedo/cursor. */
export function WeightChart({ points, height = 200, label }: { points: Point[]; height?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () =>
      [...points]
        .map((p) => ({ ...p, t: Date.parse(dateOnly(p.date)) }))
        .sort((a, b) => a.t - b.t),
    [points],
  );

  const geo = useMemo(() => {
    if (!data.length) return null;
    const ws = data.map((d) => d.weightKg);
    let lo = Math.min(...ws);
    let hi = Math.max(...ws);
    const padding = Math.max((hi - lo) * 0.15, 0.5);
    lo = Math.max(0, lo - padding);
    hi = hi + padding;
    const ticks = niceTicks(lo, hi);
    lo = Math.min(lo, ticks[0]);
    hi = Math.max(hi, ticks[ticks.length - 1]);
    const t0 = data[0].t;
    const t1 = data[data.length - 1].t;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = (t: number) => PAD.left + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
    const y = (w: number) => PAD.top + (1 - (w - lo) / (hi - lo)) * innerH;
    const xs = data.length > 1 ? [data[0], data[Math.floor((data.length - 1) / 2)], data[data.length - 1]] : [data[0]];
    return { x, y, ticks, xs: [...new Map(xs.map((d) => [d.t, d])).values()] };
  }, [data, width, height]);

  if (!geo) return null;
  const { x, y, ticks } = geo;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d.weightKg).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  const active = hover !== null ? data[hover] : null;

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    for (let i = 1; i < data.length; i++) {
      if (Math.abs(x(data[i].t) - px) < Math.abs(x(data[best].t) - px)) best = i;
    }
    setHover(best);
  }

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${label}: ${data.length} registros, último ${fmtKg(last.weightKg)} kg`}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
        className="touch-pan-y overflow-visible"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
              {fmtKg(t)}
            </text>
          </g>
        ))}
        {geo.xs.map((d, i) => (
          <text
            key={d.t}
            x={x(d.t)}
            y={height - 6}
            fontSize={11}
            fill="var(--muted)"
            textAnchor={geo.xs.length === 1 ? "middle" : i === 0 ? "start" : i === geo.xs.length - 1 ? "end" : "middle"}
          >
            {formatShortDate(d.date)}
          </text>
        ))}

        {active && (
          <line
            x1={x(active.t)}
            x2={x(active.t)}
            y1={PAD.top}
            y2={height - PAD.bottom}
            stroke="var(--muted)"
            strokeWidth={1}
            opacity={0.5}
          />
        )}

        <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle
            key={`${d.t}-${i}`}
            cx={x(d.t)}
            cy={y(d.weightKg)}
            r={hover === i ? 5.5 : 4}
            fill="var(--chart-1)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}
        {/* Etiqueta directa solo en el último valor */}
        <text
          x={x(last.t) + 10}
          y={y(last.weightKg)}
          dy="0.32em"
          fontSize={12}
          fontWeight={600}
          fill="var(--fg)"
        >
          {fmtKg(last.weightKg)} kg
        </text>
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${(x(active.t) / width) * 100}%`,
            top: Math.max(0, y(active.weightKg) - 52),
          }}
        >
          <p className="text-muted">{formatDate(active.date)}</p>
          <p className="font-semibold tabular-nums text-fg">{fmtKg(active.weightKg)} kg</p>
        </div>
      )}
    </div>
  );
}

/** Variación entre el primer y el último registro, para el texto que acompaña al gráfico. */
export function weightTrend(points: Point[]): string | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => Date.parse(dateOnly(a.date)) - Date.parse(dateOnly(b.date)));
  const prev = sorted[sorted.length - 2].weightKg;
  const last = sorted[sorted.length - 1].weightKg;
  const diff = Math.round((last - prev) * 100) / 100;
  if (diff === 0) return "Sin cambios desde el registro anterior";
  return `${diff > 0 ? "▲ Subió" : "▼ Bajó"} ${fmtKg(Math.abs(diff))} kg desde el registro anterior`;
}

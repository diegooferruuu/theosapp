"use client";

import { useState } from "react";
import { formatTime } from "@/lib/format";
import { symptomPhotoUrl } from "@/lib/images";
import { SEVERITIES, symptomOf } from "@/lib/labels";
import type { SymptomLog } from "@/lib/types";
import { Badge, Modal } from "./ui";

/** Un registro del diario de síntomas (con miniaturas de fotos). */
export function SymptomEntry({ s, showPet, actions }: { s: SymptomLog; showPet?: boolean; actions?: React.ReactNode }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const info = symptomOf(s.category);
  const severity = SEVERITIES.find((x) => x.value === s.severity)!;
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl" aria-hidden>
        {info.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{info.label}</p>
          <Badge tone={severity.tone}>{severity.label}</Badge>
        </div>
        <p className="text-xs text-muted">
          {formatTime(s.occurredAt)}
          {showPet && ` · ${s.pet.name}`}
          {s.createdBy && ` · anotó ${s.createdBy.name}`}
        </p>
        {s.description && <p className="mt-1 whitespace-pre-line text-sm">{s.description}</p>}
        {s.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {s.photos.map((p) => (
              <button key={p.id} type="button" onClick={() => setZoom(p.id)} className="overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={symptomPhotoUrl(p.id)} alt={`Foto de ${info.label}`} loading="lazy" className="size-20 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {actions}
      {zoom !== null && (
        <Modal open title={info.label} onClose={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={symptomPhotoUrl(zoom)} alt={`Foto de ${info.label}`} className="w-full rounded-xl" />
        </Modal>
      )}
    </div>
  );
}

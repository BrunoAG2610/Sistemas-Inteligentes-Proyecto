import type { JSX } from "react";
import { MAIN_POSITIONS, POSITIONS, type TirePosition } from "../domain/positions";
import { countNoun } from "../domain/text";
import { needsReview } from "../domain/threshold";
import { isDone, wheelStatus, type PhotoState, type WheelStatus } from "../state/photos";
import { Icon, type IconName } from "./Icon";

interface VehiclePanelProps {
  readonly items: PhotoState;
  readonly threshold: number;
  readonly onWheel: (position: TirePosition) => void;
}

interface WheelView {
  readonly className: string;
  readonly icon: IconName | null;
  readonly label: string;
  /** Final del nombre accesible: estado + qué hace el botón. */
  readonly spoken: string;
}

const WHEEL_VIEWS = {
  empty: { className: "", icon: null, label: "Sin foto", spoken: "sin foto. Subir foto." },
  pending: { className: "", icon: null, label: "Analizando…", spoken: "analizando." },
  review: { className: "warn", icon: "alert", label: "Revisar", spoken: "revisar con medidor. Ver resultado." },
  ok: { className: "ok", icon: "check", label: "Sin hallazgos", spoken: "sin hallazgos visibles. Ver resultado." },
} as const satisfies Readonly<Record<WheelStatus, WheelView>>;

function Summary({ items, threshold }: Omit<VehiclePanelProps, "onWheel">): JSX.Element {
  const done = items.filter(isDone);
  if (!done.length) {
    return <span className="muted">Sube al menos una foto para ver el resumen de la unidad.</span>;
  }
  const review = done.filter((item) => needsReview(item.probability, threshold)).length;
  const missing = MAIN_POSITIONS.filter((p) => wheelStatus(items, p.id, threshold) === "empty").length;
  const total = MAIN_POSITIONS.length;
  return (
    <>
      <p className="big">
        <span className="n-warn">{review}</span> de {countNoun(done.length, "llanta", "llantas")} para revisar con
        medidor
      </p>
      <span className="muted">
        {missing ? `Faltan ${missing} de ${total} posiciones` : `Las ${total} posiciones tienen foto`}
      </span>
    </>
  );
}

export function VehiclePanel({ items, threshold, onWheel }: VehiclePanelProps): JSX.Element {
  return (
    <section className="panel" aria-labelledby="h-unidad">
      <div className="panel-head">
        <h2 id="h-unidad">Unidad</h2>
        <span className="muted">Toca una llanta para subir su foto o ver su resultado</span>
      </div>
      <div className="vehicle">
        <svg className="car" viewBox="0 0 120 200" aria-hidden="true" focusable="false">
          <text x="60" y="12" textAnchor="middle">
            Frente
          </text>
          <path d="M60 18 l-5 6 h10 z" fill="currentColor" />
          <rect x="22" y="30" width="76" height="160" rx="26" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M32 66 q28 -12 56 0 M32 150 q28 10 56 0" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="58" x2="108" y2="58" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
          <line x1="12" y1="160" x2="108" y2="160" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
        </svg>
        {POSITIONS.map((position) => {
          const view: WheelView = WHEEL_VIEWS[wheelStatus(items, position.id, threshold)];
          return (
            <button
              key={position.id}
              type="button"
              className={`wheel w-${position.id} ${view.className}`}
              aria-label={`${position.id}, ${position.name}: ${view.spoken}`}
              onClick={() => onWheel(position)}
            >
              <span className="w-id">{position.id}</span>
              <span className="w-state">
                {view.icon && <Icon name={view.icon} />}
                {view.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="summary" aria-live="polite">
        <Summary items={items} threshold={threshold} />
      </div>
    </section>
  );
}

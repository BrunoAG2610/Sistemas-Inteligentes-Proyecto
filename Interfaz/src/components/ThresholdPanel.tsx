import type { JSX } from "react";
import {
  formatPercent,
  formatProbability,
  metricsAt,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  THRESHOLD_STEP,
} from "../domain/threshold";

interface ThresholdPanelProps {
  readonly threshold: number;
  readonly onChange: (value: number) => void;
}

const PLACEHOLDER = "—";

export function ThresholdPanel({ threshold, onChange }: ThresholdPanelProps): JSX.Element {
  const value = formatProbability(threshold);
  const metrics = metricsAt(threshold);
  return (
    <section className="panel" aria-labelledby="h-umbral">
      <div className="panel-head">
        <h2 id="h-umbral">Umbral de alerta</h2>
        <output className="thr-value mono" htmlFor="thr" aria-hidden="true">
          {value}
        </output>
      </div>
      <div>
        <input
          className="range"
          type="range"
          id="thr"
          min={THRESHOLD_MIN}
          max={THRESHOLD_MAX}
          step={THRESHOLD_STEP}
          value={threshold}
          aria-labelledby="h-umbral"
          aria-describedby="thr-explain"
          aria-valuetext={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <div className="range-scale" aria-hidden="true">
          <span>Más alertas</span>
          <span>Menos alertas</span>
        </div>
      </div>
      <p className="thr-explain" id="thr-explain">
        Una llanta pasa a “Revisar” cuando su probabilidad de defecto es igual o mayor que el umbral. Con un umbral bajo
        se escapan menos defectos, pero el técnico mide más llantas que estaban bien.
      </p>
      <dl className="metrics">
        <div>
          <dt>Recall de “defectuosa”</dt>
          <dd>{metrics ? formatPercent(metrics.recall) : PLACEHOLDER}</dd>
        </div>
        <div>
          <dt>Falsas alarmas</dt>
          <dd>{metrics ? formatPercent(metrics.falseAlarmRate) : PLACEHOLDER}</dd>
        </div>
      </dl>
      {!metrics && (
        <p className="pending-note">
          Pendiente: estas cifras salen del conjunto de validación del notebook de evaluación. No se muestran hasta
          tenerlas.
        </p>
      )}
    </section>
  );
}

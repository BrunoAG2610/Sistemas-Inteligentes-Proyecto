import type { CSSProperties, JSX } from "react";
import { AnalysisSource, IS_SIMULATED } from "../api/predict";
import { describeDepth, depthTone, evaluateDepth, isInvalidDepth } from "../domain/depth";
import { findPosition, isPositionId, POSITIONS, type PositionId } from "../domain/positions";
import { formatProbability, needsReview, toPercent } from "../domain/threshold";
import { isDone, type PhotoItem, type PhotoStatus } from "../state/photos";
import { Icon } from "./Icon";

export interface ResultRowHandlers {
  readonly onPosition: (id: string, position: PositionId | null) => void;
  readonly onDepth: (id: string, value: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onRetry: (id: string) => void;
}

interface ResultRowProps extends ResultRowHandlers {
  readonly item: PhotoItem;
  readonly threshold: number;
}

const THUMB_PX = 88;
const UNASSIGNED = "";

/** IDs estables para que App pueda llevar el foco a una fila desde el vehículo. */
export const rowDomId = (id: string): string => `row-${id}`;
export const positionDomId = (id: string): string => `pos-${id}`;
export const removeDomId = (id: string): string => `rm-${id}`;

// ---------- Etiqueta de origen ----------

interface BadgeView {
  readonly className: string;
  readonly text: string;
}

const BADGES = {
  example: { className: "badge", text: "Ejemplo" },
  simulated: { className: "badge sim", text: "Simulado" },
  api: null,
} as const satisfies Readonly<Record<AnalysisSource, BadgeView | null>>;

/** Una subida aún sin resultado va a terminar con el origen del modo actual. */
const UPLOAD_SOURCE: AnalysisSource = IS_SIMULATED ? AnalysisSource.Simulated : AnalysisSource.Api;

function Badge({ item }: { readonly item: PhotoItem }): JSX.Element | null {
  const badge: BadgeView | null = BADGES[isDone(item) ? item.source : UPLOAD_SOURCE];
  return badge && <span className={badge.className}>{badge.text}</span>;
}

// ---------- Veredicto por estado ----------

interface VerdictProps<TStatus extends PhotoStatus> {
  readonly item: Extract<PhotoItem, { status: TStatus }>;
  readonly threshold: number;
  readonly onRetry: (id: string) => void;
}

function DoneVerdict({ item, threshold }: VerdictProps<"done">): JSX.Element {
  const review = needsReview(item.probability, threshold);
  const fill: CSSProperties = { width: `${toPercent(item.probability)}%` };
  const tick: CSSProperties = { left: `${toPercent(threshold)}%` };
  return (
    <>
      <span className={review ? "chip warn" : "chip ok"}>
        <Icon name={review ? "alert" : "check"} />
        {review ? "Revisar con medidor" : "Sin hallazgos visibles"}
      </span>
      <div className="prob">
        <div className="bar" aria-hidden="true">
          <span className="fill" style={fill} />
          <span className="tick" style={tick} />
        </div>
        <span className="pval mono">
          P(defecto) <b>{formatProbability(item.probability)}</b>
        </span>
      </div>
    </>
  );
}

function FailedVerdict({ item, onRetry }: VerdictProps<"failed">): JSX.Element {
  return (
    <>
      <span className="chip fail">
        <Icon name="alert" />
        No se pudo analizar
      </span>
      <p className="fail-msg">{item.message}</p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRetry(item.id)}>
        <Icon name="retry" />
        Reintentar
      </button>
    </>
  );
}

function PendingVerdict(): JSX.Element {
  return (
    <>
      <span className="chip wait">Analizando…</span>
      <div className="prob">
        <span className="skeleton" aria-hidden="true" />
      </div>
    </>
  );
}

const VERDICTS: { readonly [K in PhotoStatus]: (props: VerdictProps<K>) => JSX.Element } = {
  done: DoneVerdict,
  failed: FailedVerdict,
  analyzing: PendingVerdict,
};

function Verdict(props: VerdictProps<PhotoStatus>): JSX.Element {
  // TypeScript no correlaciona el componente indexado con la variante de `item`;
  // el mapa total de arriba garantiza que cada estado recibe su propia variante.
  const Render = VERDICTS[props.item.status] as (p: VerdictProps<PhotoStatus>) => JSX.Element;
  return <Render {...props} />;
}

// ---------- Fila ----------

export function ResultRow({ item, threshold, onPosition, onDepth, onRemove, onRetry }: ResultRowProps): JSX.Element {
  const evaluation = evaluateDepth(item.depthInput, findPosition(item.position));
  const evalId = `eval-${item.id}`;
  const depthId = `dep-${item.id}`;
  const flagged = isDone(item) && needsReview(item.probability, threshold);
  const rowState = flagged ? "is-warn" : "is-ok";

  return (
    <li className={`row ${rowState}`} id={rowDomId(item.id)}>
      <img className="thumb" src={item.src} alt={`Foto de la llanta: ${item.name}`} width={THUMB_PX} height={THUMB_PX} />

      <div className="row-main">
        <div className="row-top">
          <span className="file">{item.name}</span>
          <Badge item={item} />
        </div>
        <Verdict item={item} threshold={threshold} onRetry={onRetry} />
      </div>

      <div className="row-fields">
        <div className="field">
          <label htmlFor={positionDomId(item.id)}>Posición</label>
          <select
            id={positionDomId(item.id)}
            value={item.position ?? UNASSIGNED}
            onChange={(event) => {
              const value = event.currentTarget.value;
              onPosition(item.id, isPositionId(value) ? value : null);
            }}
          >
            <option value={UNASSIGNED}>Sin asignar</option>
            {POSITIONS.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={depthId}>Medición del técnico</label>
          <div className="depth">
            {/* type="text": con type="number" el navegador vacía "3,2" y la medición se pierde sin aviso. */}
            <input
              id={depthId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.0"
              value={item.depthInput}
              aria-describedby={evalId}
              aria-invalid={isInvalidDepth(evaluation)}
              onChange={(event) => onDepth(item.id, event.currentTarget.value)}
            />
            <span>mm</span>
          </div>
        </div>
        <p className={`eval ${depthTone(evaluation)}`} id={evalId}>
          {describeDepth(evaluation, flagged)}
        </p>
      </div>

      <button
        type="button"
        className="icon-btn"
        id={removeDomId(item.id)}
        aria-label={`Quitar foto ${item.name}`}
        title="Quitar foto"
        onClick={() => onRemove(item.id)}
      >
        <Icon name="trash" />
      </button>
    </li>
  );
}

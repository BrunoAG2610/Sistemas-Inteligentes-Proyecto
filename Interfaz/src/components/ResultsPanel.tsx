import type { JSX } from "react";
import { isExample, type PhotoState } from "../state/photos";
import { ResultRow, type ResultRowHandlers } from "./ResultRow";

interface ResultsPanelProps extends ResultRowHandlers {
  readonly items: PhotoState;
  readonly threshold: number;
  readonly onClearExamples: () => void;
}

export function ResultsPanel({ items, threshold, onClearExamples, ...handlers }: ResultsPanelProps): JSX.Element {
  return (
    <section className="panel" aria-labelledby="h-res">
      <div className="panel-head">
        <h2 id="h-res">Resultados</h2>
        {items.some(isExample) && (
          <button type="button" className="btn btn-ghost" onClick={onClearExamples}>
            Quitar ejemplos
          </button>
        )}
      </div>
      {items.length ? (
        <ul className="results" aria-labelledby="h-res">
          {items.map((item) => (
            <ResultRow key={item.id} item={item} threshold={threshold} {...handlers} />
          ))}
        </ul>
      ) : (
        <div className="empty">
          <strong>Todavía no hay fotos.</strong>
          <span>
            Sube la foto del costado de cada llanta. Aquí verás su probabilidad de defecto y su posición en la unidad.
          </span>
        </div>
      )}
    </section>
  );
}

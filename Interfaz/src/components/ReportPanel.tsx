import { useMemo, useRef, useState, type JSX } from "react";
import { buildReport } from "../domain/report";
import { isDone, type PhotoState } from "../state/photos";
import { Icon } from "./Icon";

interface ReportPanelProps {
  readonly items: PhotoState;
  readonly threshold: number;
}

/** Copia el reporte; si el portapapeles no está disponible, deja el texto seleccionado. */
async function copyText(text: string, fallbackTarget: HTMLElement | null): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return "Reporte copiado.";
  } catch (err) {
    console.warn("navigator.clipboard.writeText falló; se selecciona el texto", err);
    const selection = window.getSelection();
    if (fallbackTarget && selection) {
      const range = document.createRange();
      range.selectNodeContents(fallbackTarget);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return "No se pudo copiar automáticamente. El texto quedó seleccionado: cópialo con Ctrl+C.";
  }
}

export function ReportPanel({ items, threshold }: ReportPanelProps): JSX.Element {
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("");
  const reportRef = useRef<HTMLPreElement>(null);

  const done = useMemo(() => items.filter(isDone), [items]);
  const report = buildReport({ unit, date: new Date(), threshold, entries: done });

  const onCopy = async (): Promise<void> => {
    setStatus(await copyText(report, reportRef.current));
  };

  return (
    <section className="panel" aria-labelledby="h-rep">
      <div className="panel-head">
        <h2 id="h-rep">Reporte</h2>
        <span className="muted">Para mandarlo por WhatsApp o correo</span>
      </div>
      <div className="form">
        <div className="field unit-field">
          <label htmlFor="unit">Número económico de la unidad</label>
          <input
            type="text"
            id="unit"
            autoComplete="off"
            placeholder="Ej. U-014"
            value={unit}
            onChange={(event) => {
              setUnit(event.currentTarget.value);
              setStatus("");
            }}
          />
        </div>

        <pre className="report" ref={reportRef} tabIndex={0} aria-label="Vista previa del reporte">
          {report}
        </pre>

        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => void onCopy()}>
            <Icon name="copy" />
            Copiar reporte
          </button>
        </div>
        <p className="status" role="status">
          {status}
        </p>
      </div>
    </section>
  );
}

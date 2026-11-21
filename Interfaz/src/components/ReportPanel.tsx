import { useMemo, useRef, useState, type FormEvent, type JSX } from "react";
import { checkContact } from "../domain/contact";
import { buildReport } from "../domain/report";
import { countNoun } from "../domain/text";
import { needsReview } from "../domain/threshold";
import { isDone, isExample, type PhotoState } from "../state/photos";
import { Icon } from "./Icon";

interface ReportPanelProps {
  readonly items: PhotoState;
  readonly threshold: number;
}

const CONTACT_ERROR_ID = "contact-error";

/** Por qué no se puede pedir cotización todavía; `null` = se puede. */
function quoteBlocker(reviewCount: number, consent: boolean): string | null {
  if (!reviewCount) return "Se activa cuando al menos una llanta de tus fotos queda en “Revisar”. Los ejemplos no cuentan.";
  if (!consent) return "Para pedir cotizaciones, acepta compartir tus fotos y tu contacto.";
  return null;
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
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const reportRef = useRef<HTMLPreElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  const done = useMemo(() => items.filter(isDone), [items]);
  // Solo se cotizan llantas reales: los ejemplos tienen probabilidades fijas de demostración.
  const reviewCount = done.filter((item) => !isExample(item) && needsReview(item.probability, threshold)).length;
  const blocker = quoteBlocker(reviewCount, consent);

  const report = buildReport({ unit, date: new Date(), threshold, entries: done });

  const onCopy = async (): Promise<void> => {
    setStatus(await copyText(report, reportRef.current));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (blocker) return;
    const check = checkContact(contact);
    if (!check.ok) {
      setContactError(check.message);
      contactRef.current?.focus();
      return;
    }
    setContactError(null);
    // TODO: conectar al servicio de cotizaciones cuando exista; hoy no hay endpoint en el backend.
    setStatus("Aún no se envía nada: falta conectar el servicio de cotizaciones. Mientras tanto, copia el reporte y compártelo.");
  };

  const contactDescribedBy = contactError ? `contact-help ${CONTACT_ERROR_ID}` : "contact-help";

  return (
    <section className="panel" aria-labelledby="h-rep">
      <div className="panel-head">
        <h2 id="h-rep">Reporte y cotización</h2>
      </div>
      <form className="form" noValidate onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="unit">Número económico de la unidad</label>
            <input
              type="text"
              id="unit"
              autoComplete="off"
              placeholder="Ej. U-014"
              value={unit}
              onChange={(event) => setUnit(event.currentTarget.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="contact">Teléfono o correo para la cotización</label>
            <input
              ref={contactRef}
              type="text"
              id="contact"
              aria-describedby={contactDescribedBy}
              aria-invalid={Boolean(contactError)}
              value={contact}
              onChange={(event) => {
                setContact(event.currentTarget.value);
                setContactError(null);
              }}
            />
            {contactError && (
              <span className="field-error" id={CONTACT_ERROR_ID}>
                {contactError}
              </span>
            )}
          </div>
        </div>
        <p className="helper" id="contact-help">
          Solo se comparte si aceptas abajo.
        </p>

        <pre className="report" ref={reportRef} tabIndex={0} aria-label="Vista previa del reporte">
          {report}
        </pre>

        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => void onCopy()}>
            <Icon name="copy" />
            Copiar reporte
          </button>
        </div>

        <label className="check" htmlFor="consent">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(event) => {
              setConsent(event.currentTarget.checked);
              setStatus("");
            }}
          />
          <span>
            Acepto compartir mis fotos y mi contacto con llanteras para recibir cotizaciones.
            <span className="muted">Es opcional. Puedes usar el reporte sin aceptar.</span>
          </span>
        </label>

        <div className="btn-row">
          {/* aria-disabled en vez de disabled: el botón sigue enfocable y el lector lee por qué no está activo. */}
          <button type="submit" className="btn btn-primary" aria-disabled={Boolean(blocker)} aria-describedby="quote-help">
            Pedir cotizaciones
          </button>
        </div>
        <p className="helper" id="quote-help">
          {blocker ?? `Se pedirán cotizaciones para ${countNoun(reviewCount, "llanta", "llantas")}.`}
        </p>
        <p className="status" role="status">
          {status}
        </p>
      </form>
    </section>
  );
}

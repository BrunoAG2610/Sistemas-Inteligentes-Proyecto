import type { AnalysisSource } from "../api/predict";
import { evaluateDepth, formatMm, type DepthEvaluation } from "./depth";
import { findPosition, positionOrder, type PositionId } from "./positions";
import { formatProbability, needsReview } from "./threshold";

export interface ReportEntry {
  readonly position: PositionId | null;
  readonly probability: number;
  readonly source: AnalysisSource;
  readonly depthInput: string;
}

export interface ReportInput {
  readonly unit: string;
  readonly date: Date;
  readonly threshold: number;
  readonly entries: readonly ReportEntry[];
}

const SOURCE_TAGS = {
  api: "",
  simulated: "  [simulado]",
  example: "  [ejemplo]",
} as const satisfies Readonly<Record<AnalysisSource, string>>;

type DepthReportText = { readonly [K in DepthEvaluation["kind"]]: (e: Extract<DepthEvaluation, { kind: K }>) => string };

const DEPTH_REPORT_TEXT: DepthReportText = {
  "no-position": () => "sin medir",
  unmeasured: () => "sin medir",
  "not-a-number": () => "valor no válido",
  "out-of-range": () => "valor fuera de rango",
  below: (e) => `${formatMm(e.depth)} mm (debajo de ref. ${formatMm(e.reference)})`,
  meets: (e) => `${formatMm(e.depth)} mm (cumple ref. ${formatMm(e.reference)})`,
};

function depthReportText(entry: ReportEntry, flagged: boolean): string {
  const evaluation = evaluateDepth(entry.depthInput, findPosition(entry.position));
  if (flagged && evaluation.kind === "unmeasured") return "pendiente de medir con medidor";
  // Sin posición no hay referencia, pero un valor capturado sigue siendo útil en el reporte.
  const captured = entry.depthInput.trim();
  if (evaluation.kind === "no-position" && captured) return `${captured} mm`;
  // Mismo patrón que describeDepth: el Record total garantiza el handler correcto por variante.
  const describe = DEPTH_REPORT_TEXT[evaluation.kind] as (e: DepthEvaluation) => string;
  return describe(evaluation);
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Texto plano para copiar y pegar en WhatsApp o correo. */
export function buildReport(input: ReportInput): string {
  const header = [
    "NeoMEX · REVISIÓN INFORMATIVA DE LLANTAS (NO OFICIAL)",
    `Unidad: ${input.unit.trim() || "sin número"}   Fecha: ${DATE_FORMAT.format(input.date)}`,
    `Umbral de alerta: ${formatProbability(input.threshold)}`,
    "",
  ];

  const sorted = [...input.entries].sort((a, b) => positionOrder(a.position) - positionOrder(b.position));
  const body = sorted.length
    ? sorted.flatMap((entry) => {
        const name = findPosition(entry.position)?.name ?? "Sin posición";
        const flagged = needsReview(entry.probability, input.threshold);
        const verdict = flagged ? "REVISAR" : "sin hallazgos visibles";
        return [
          `- ${name}: ${verdict}  P=${formatProbability(entry.probability)}${SOURCE_TAGS[entry.source]}`,
          `    Medición del técnico: ${depthReportText(entry, flagged)}`,
        ];
      })
    : ["Sin fotos analizadas."];

  const footer = [
    "",
    "Una foto no mide la profundidad del dibujo. Confirmar con medidor",
    "antes de recomendar un cambio. Pide varias cotizaciones.",
  ];

  return [...header, ...body, ...footer].join("\n");
}

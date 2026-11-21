import { AXLE_LABEL, REFERENCE_DEPTH_MM, type Axle, type TirePosition } from "./positions";

export const DEPTH_MIN_MM = 0;
export const DEPTH_MAX_MM = 25;
const DECIMAL_COMMA = ",";
const DECIMAL_POINT = ".";
const MM_DECIMALS = 1;

interface Reference {
  readonly reference: number;
  readonly axle: Axle;
}

/** Resultado de comparar la profundidad medida contra la referencia del eje. */
export type DepthEvaluation =
  | { readonly kind: "no-position" }
  | ({ readonly kind: "unmeasured" } & Reference)
  | { readonly kind: "not-a-number" }
  | { readonly kind: "out-of-range" }
  | ({ readonly kind: "below"; readonly depth: number } & Reference)
  | ({ readonly kind: "meets"; readonly depth: number } & Reference);

/** Acepta coma o punto decimal; vacío o no numérico devuelve null. */
export function parseDepth(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(DECIMAL_COMMA, DECIMAL_POINT));
  return Number.isFinite(value) ? value : null;
}

export function evaluateDepth(input: string, position: TirePosition | undefined): DepthEvaluation {
  if (!position) return { kind: "no-position" };
  const reference = REFERENCE_DEPTH_MM[position.axle];
  const ref = { reference, axle: position.axle };
  if (!input.trim()) return { kind: "unmeasured", ...ref };
  const depth = parseDepth(input);
  if (depth === null) return { kind: "not-a-number" };
  if (depth < DEPTH_MIN_MM || depth > DEPTH_MAX_MM) return { kind: "out-of-range" };
  return depth < reference ? { kind: "below", depth, ...ref } : { kind: "meets", depth, ...ref };
}

export const formatMm = (value: number): string => value.toFixed(MM_DECIMALS);

/** El valor capturado no se puede usar: el campo se marca como inválido. */
export const isInvalidDepth = (evaluation: DepthEvaluation): boolean =>
  evaluation.kind === "not-a-number" || evaluation.kind === "out-of-range";

const referenceText = (r: Reference): string => `${formatMm(r.reference)} mm (${AXLE_LABEL[r.axle]})`;

type DepthDescriber = {
  readonly [K in DepthEvaluation["kind"]]: (evaluation: Extract<DepthEvaluation, { kind: K }>) => string;
};

const depthDescriptions: DepthDescriber = {
  "no-position": () => "Asigna la posición para compararla con la referencia.",
  unmeasured: (e) => `Opcional: anota la profundidad si la mediste. Referencia NOM-068: ${referenceText(e)}.`,
  "not-a-number": () => "Escribe solo el número en milímetros, como 3.2 o 3,2.",
  "out-of-range": () => `Escribe un valor entre ${DEPTH_MIN_MM} y ${DEPTH_MAX_MM} mm.`,
  below: (e) => `${formatMm(e.depth)} mm: debajo de la referencia de ${referenceText(e)}.`,
  meets: (e) => `${formatMm(e.depth)} mm: cumple la referencia de ${referenceText(e)}.`,
};

/**
 * Texto de ayuda bajo el campo de medición.
 * `flagged`: la llanta quedó en "Revisar", así que medirla es la tarea pendiente del técnico.
 */
export function describeDepth(evaluation: DepthEvaluation, flagged: boolean): string {
  if (flagged && evaluation.kind === "unmeasured") {
    return `Revisa este punto: mide la llanta con el medidor y anota la profundidad. Referencia NOM-068: ${referenceText(evaluation)}.`;
  }
  // TypeScript no correlaciona el handler indexado con la variante concreta;
  // el Record total de arriba garantiza que cada clave recibe su propia variante.
  const describe = depthDescriptions[evaluation.kind] as (e: DepthEvaluation) => string;
  return describe(evaluation);
}

/** Tono visual del texto de ayuda. */
export type DepthTone = "neutral" | "below" | "above";

const DEPTH_TONES = {
  "no-position": "neutral",
  unmeasured: "neutral",
  "not-a-number": "below",
  "out-of-range": "below",
  below: "below",
  meets: "above",
} as const satisfies Readonly<Record<DepthEvaluation["kind"], DepthTone>>;

export const depthTone = (evaluation: DepthEvaluation): DepthTone => DEPTH_TONES[evaluation.kind];

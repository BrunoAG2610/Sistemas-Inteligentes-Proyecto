export const THRESHOLD_MIN = 0.05;
export const THRESHOLD_MAX = 0.95;
export const THRESHOLD_STEP = 0.05;
export const DEFAULT_THRESHOLD = 0.4;
const PROBABILITY_DECIMALS = 2;
const PERCENT = 100;
/** Centésimas: la misma precisión con la que se muestran P y el umbral. */
const toHundredths = (value: number): number => Math.round(value * PERCENT);

/**
 * Una llanta pasa a "Revisar" cuando P(defecto) es igual o mayor que el umbral.
 * Compara en centésimas para que el veredicto coincida siempre con los números mostrados
 * (0.398 se ve como "0.40", así que con umbral 0.40 debe quedar en "Revisar").
 */
export const needsReview = (probability: number, threshold: number): boolean =>
  toHundredths(probability) >= toHundredths(threshold);

export const formatProbability = (value: number): string => value.toFixed(PROBABILITY_DECIMALS);

/** 0–1 → 0–100, para anchos y posiciones en CSS. */
export const toPercent = (value: number): number => value * PERCENT;

/** Métricas del conjunto de validación en un umbral concreto. */
export interface ValidationPoint {
  readonly threshold: number;
  /** Recall de la clase "defectuosa", 0–1. */
  readonly recall: number;
  /** Proporción de llantas buenas marcadas como "Revisar", 0–1. */
  readonly falseAlarmRate: number;
}

/**
 * Curva exportada del notebook 03, un punto por paso del deslizador.
 * Vacía mientras no exista: la interfaz muestra "—" en lugar de inventar cifras.
 */
export const VALIDATION_CURVE: readonly ValidationPoint[] = [];

const HALF = 0.5;
/** Medio paso: cubre el error de coma flotante entre el deslizador y la curva. */
const MATCH_TOLERANCE = THRESHOLD_STEP * HALF;

export function metricsAt(threshold: number, curve: readonly ValidationPoint[] = VALIDATION_CURVE): ValidationPoint | undefined {
  return curve.find((point) => Math.abs(point.threshold - threshold) < MATCH_TOLERANCE);
}

export const formatPercent = (value: number): string => `${toHundredths(value)} %`;

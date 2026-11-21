import { expect, test } from "vitest";
import { formatProbability, metricsAt, needsReview, type ValidationPoint } from "./threshold";

const THRESHOLD = 0.4;
const ROUNDS_UP_TO_THRESHOLD = 0.398;
const ROUNDS_DOWN_BELOW = 0.394;
const SLIDER_FLOAT = 0.35000000000000003;
const SLIDER_STEP = 0.35;
const RECALL = 0.9;
const FALSE_ALARMS = 0.2;

// El veredicto debe coincidir con lo que se ve: P y umbral se muestran con 2 decimales.
test.each([
  { probability: ROUNDS_UP_TO_THRESHOLD, review: true },
  { probability: THRESHOLD, review: true },
  { probability: ROUNDS_DOWN_BELOW, review: false },
])("P=$probability con umbral 0.40 → revisar=$review", ({ probability, review }) => {
  expect(needsReview(probability, THRESHOLD)).toBe(review);
  expect(formatProbability(probability) >= formatProbability(THRESHOLD)).toBe(review);
});

test("metricsAt tolera el error de coma flotante del deslizador", () => {
  const curve: readonly ValidationPoint[] = [{ threshold: SLIDER_STEP, recall: RECALL, falseAlarmRate: FALSE_ALARMS }];
  expect(metricsAt(SLIDER_FLOAT, curve)?.recall).toBe(RECALL);
  expect(metricsAt(THRESHOLD, curve)).toBeUndefined();
});

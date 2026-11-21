import { expect, test } from "vitest";
import { isPredictResponse } from "./predict";

const P_DEFECT = 0.82;
const THRESHOLD = 0.4;
const OVER_ONE = 1.2;

const VALID = {
  clase: "defectuosa",
  prob_defectuosa: P_DEFECT,
  umbral: THRESHOLD,
  modelo: "mobilenetv2-v1",
  aviso: "Revisión informativa, no oficial.",
};

test.each([
  { label: "respuesta válida", body: VALID, ok: true },
  { label: "clase buena", body: { ...VALID, clase: "buena" }, ok: true },
  { label: "null", body: null, ok: false },
  { label: "clase desconocida", body: { ...VALID, clase: "regular" }, ok: false },
  { label: "probabilidad > 1", body: { ...VALID, prob_defectuosa: OVER_ONE }, ok: false },
  { label: "probabilidad como texto", body: { ...VALID, prob_defectuosa: "0.8" }, ok: false },
  { label: "NaN", body: { ...VALID, prob_defectuosa: Number.NaN }, ok: false },
  { label: "sin modelo", body: { ...VALID, modelo: undefined }, ok: false },
  // Drift típico: el backend renombra el campo al inglés.
  { label: "campo renombrado", body: { ...VALID, prob_defectuosa: undefined, prob_defective: P_DEFECT }, ok: false },
])("$label → $ok", ({ body, ok }) => {
  expect(isPredictResponse(body)).toBe(ok);
});

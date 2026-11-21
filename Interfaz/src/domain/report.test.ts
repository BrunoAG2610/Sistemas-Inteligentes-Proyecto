import { expect, test } from "vitest";
import { buildReport, type ReportEntry } from "./report";

const DATE = new Date("2026-11-20T12:00:00");
const THRESHOLD = 0.4;
const P_LOW = 0.2;
const P_NEAR = 0.47;
const P_HIGH = 0.82;
const HEADER_LINES = 3;

test("ordena por posición, marca REVISAR según el umbral y etiqueta el origen", () => {
  const entries: readonly ReportEntry[] = [
    { position: null, probability: P_LOW, source: "api", depthInput: "" },
    { position: "TI", probability: P_NEAR, source: "simulated", depthInput: "1.2" },
    { position: "DI", probability: P_HIGH, source: "example", depthInput: "4" },
  ];
  const lines = buildReport({ unit: " U-014 ", date: DATE, threshold: THRESHOLD, entries }).split("\n");

  expect(lines.slice(0, HEADER_LINES)).toEqual([
    "NeoMEX · REVISIÓN INFORMATIVA DE LLANTAS (NO OFICIAL)",
    "Unidad: U-014   Fecha: 20/11/2026",
    "Umbral de alerta: 0.40",
  ]);
  expect(lines.filter((line) => line.startsWith("- "))).toEqual([
    "- Delantera izquierda: REVISAR  P=0.82  [ejemplo]",
    "- Trasera izquierda: REVISAR  P=0.47  [simulado]",
    "- Sin posición: sin hallazgos visibles  P=0.20",
  ]);
  expect(lines).toContain("    Medición del técnico: 4.0 mm (cumple ref. 3.2)");
  expect(lines).toContain("    Medición del técnico: 1.2 mm (debajo de ref. 1.6)");
});

test("una llanta en REVISAR sin medir queda pendiente; una sin hallazgos solo sin medir", () => {
  const entries: readonly ReportEntry[] = [
    { position: "DD", probability: P_HIGH, source: "api", depthInput: "" },
    { position: "TD", probability: P_LOW, source: "api", depthInput: "" },
  ];
  const lines = buildReport({ unit: "", date: DATE, threshold: THRESHOLD, entries }).split("\n");
  expect(lines).toEqual(
    expect.arrayContaining([
      "- Delantera derecha: REVISAR  P=0.82",
      "    Medición del técnico: pendiente de medir con medidor",
      "- Trasera derecha: sin hallazgos visibles  P=0.20",
      "    Medición del técnico: sin medir",
    ]),
  );
});

test("sin fotos analizadas lo dice explícitamente", () => {
  const report = buildReport({ unit: "", date: DATE, threshold: THRESHOLD, entries: [] });
  expect(report).toContain("Unidad: sin número");
  expect(report).toContain("Sin fotos analizadas.");
});

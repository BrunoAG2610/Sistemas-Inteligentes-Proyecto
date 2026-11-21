import { describe, expect, test } from "vitest";
import { describeDepth, evaluateDepth, parseDepth } from "./depth";
import { findPosition, REFERENCE_DEPTH_MM } from "./positions";

const STEERING_REF = REFERENCE_DEPTH_MM.dir;
const OTHER_REF = REFERENCE_DEPTH_MM.otro;

describe("parseDepth", () => {
  test.each([
    { input: "", expected: null },
    { input: "   ", expected: null },
    { input: "abc", expected: null },
    { input: "3.2", expected: STEERING_REF },
    { input: "3,2", expected: STEERING_REF },
    { input: " 1.6 ", expected: OTHER_REF },
  ])("parseDepth($input) = $expected", ({ input, expected }) => {
    expect(parseDepth(input)).toBe(expected);
  });
});

describe("evaluateDepth", () => {
  test.each([
    { input: "2", position: null, kind: "no-position" },
    { input: "", position: "DI", kind: "unmeasured" },
    { input: "tres", position: "DI", kind: "not-a-number" },
    { input: "3,2", position: "DI", kind: "meets" },
    { input: "30", position: "DI", kind: "out-of-range" },
    { input: "-1", position: "TD", kind: "out-of-range" },
    { input: "3.1", position: "DI", kind: "below" },
    // Igual a la referencia cumple: la norma marca el mínimo permitido.
    { input: "3.2", position: "DD", kind: "meets" },
    { input: "1.6", position: "TI", kind: "meets" },
    { input: "1.5", position: "R", kind: "below" },
  ] as const)("$input mm en $position → $kind", ({ input, position, kind }) => {
    expect(evaluateDepth(input, findPosition(position)).kind).toBe(kind);
  });

  test("el texto de ayuda cita la referencia del eje", () => {
    expect(describeDepth(evaluateDepth("2.5", findPosition("DI")), true)).toBe(
      "2.5 mm: debajo de la referencia de 3.2 mm (eje de dirección).",
    );
  });

  test("sin medir, pide revisar solo las llantas en \"Revisar\"", () => {
    const unmeasured = evaluateDepth("", findPosition("TI"));
    expect(describeDepth(unmeasured, true)).toBe(
      "Revisa este punto: mide la llanta con el medidor y anota la profundidad. Referencia NOM-068: 1.6 mm (otros ejes).",
    );
    expect(describeDepth(unmeasured, false)).toBe(
      "Opcional: anota la profundidad si la mediste. Referencia NOM-068: 1.6 mm (otros ejes).",
    );
  });
});

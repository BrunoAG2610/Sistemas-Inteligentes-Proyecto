import { describe, expect, test } from "vitest";
import { createExamplePhotos } from "../examples/exampleTires";
import { photosReducer, wheelStatus, type NewUpload, type PhotoState } from "./photos";

const THRESHOLD = 0.4;
const JUST_BELOW = 0.39;
const MID = 0.5;
const CERTAIN = 1;

// Node 20+ trae File global; el reducer solo lo guarda, no lo lee.
const upload = (id: string): NewUpload => ({ id, name: `${id}.jpg`, src: `blob:${id}`, file: new File([], `${id}.jpg`) });

const add = (state: PhotoState, ids: readonly string[], preferredPosition: "DI" | "TD" | null = null): PhotoState =>
  photosReducer(state, { type: "added", uploads: ids.map(upload), preferredPosition });

describe("photosReducer", () => {
  test("asigna posiciones libres en orden y respeta la elegida en el vehículo", () => {
    const state = add(add([], ["a"]), ["b", "c"], "TD");
    expect(state.map((item) => item.position)).toEqual(["DI", "TD", "DD"]);
  });

  test("con las 5 posiciones ocupadas, la siguiente queda sin asignar", () => {
    const state = add([], ["a", "b", "c", "d", "e", "f"]);
    expect(state.map((item) => item.position)).toEqual(["DI", "DD", "TI", "TD", "R", null]);
  });

  test("analizando → falló → reintentar → listo", () => {
    const failed = photosReducer(add([], ["a"]), { type: "failed", id: "a", message: "sin red" });
    expect(failed[0]?.status).toBe("failed");
    const retried = photosReducer(failed, { type: "retried", id: "a" });
    expect(retried[0]?.status).toBe("analyzing");
    const done = photosReducer(retried, {
      type: "analyzed",
      id: "a",
      prediction: { probability: MID, source: "simulated" },
    });
    expect(done[0]).toMatchObject({ status: "done", probability: MID, position: "DI" });
  });

  test("la posición elegida en el vehículo no pisa una que ya se ocupó", () => {
    const state = add(add([], ["a"]), ["b"], "DI");
    expect(state.map((item) => item.position)).toEqual(["DI", "DD"]);
  });

  test("las fotos reales reemplazan a los ejemplos", () => {
    const withExamples = photosReducer([], { type: "examplesLoaded", examples: createExamplePhotos() });
    const state = add(withExamples, ["a"]);
    expect(state.map((item) => [item.id, item.position])).toEqual([["a", "DI"]]);
  });

  test("un ejemplo no le quita la posición a una foto real", () => {
    const state = photosReducer(add([], ["a"]), { type: "examplesLoaded", examples: createExamplePhotos() });
    const atDI = state.filter((item) => item.position === "DI");
    expect(atDI.map((item) => item.id)).toEqual(["a"]);
  });

  test("un resultado tardío de una foto quitada no la revive", () => {
    const removed = photosReducer(add([], ["a"]), { type: "removed", id: "a" });
    const late = photosReducer(removed, {
      type: "analyzed",
      id: "a",
      prediction: { probability: CERTAIN, source: "api" },
    });
    expect(late).toEqual([]);
  });
});

describe("wheelStatus", () => {
  const analyzed = (probability: number): PhotoState =>
    photosReducer(add([], ["a"]), { type: "analyzed", id: "a", prediction: { probability, source: "api" } });

  test.each([
    { label: "sin foto", state: [] as PhotoState, expected: "empty" },
    { label: "analizando", state: add([], ["a"]), expected: "pending" },
    { label: "P igual al umbral", state: analyzed(THRESHOLD), expected: "review" },
    { label: "P bajo el umbral", state: analyzed(JUST_BELOW), expected: "ok" },
  ])("$label → $expected", ({ state, expected }) => {
    expect(wheelStatus(state, "DI", THRESHOLD)).toBe(expected);
  });
});

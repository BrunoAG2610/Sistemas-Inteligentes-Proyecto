/**
 * Cliente de `POST /predict` del FastAPI del modelo.
 * Sin `VITE_API_URL` la probabilidad se simula en el navegador (modo prototipo).
 */

// ---------- Contrato ----------

export const TireClass = { Good: "buena", Defective: "defectuosa" } as const;
export type TireClass = (typeof TireClass)[keyof typeof TireClass];

/** Cuerpo de `200 OK` de `POST /predict`. Debe coincidir con el modelo Pydantic del backend. */
export interface PredictResponse {
  readonly clase: TireClass;
  /** Probabilidad de la clase "defectuosa", 0–1. */
  readonly prob_defectuosa: number;
  /** Umbral con el que el servidor calculó `clase`. La interfaz reclasifica con el suyo. */
  readonly umbral: number;
  readonly modelo: string;
  readonly aviso: string;
}

/** Nombre del campo multipart que espera el backend. */
export const PREDICT_FILE_FIELD = "foto";
export const PREDICT_PATH = "/predict";

export const AnalysisSource = { Api: "api", Simulated: "simulated", Example: "example" } as const;
export type AnalysisSource = (typeof AnalysisSource)[keyof typeof AnalysisSource];

export interface Prediction {
  readonly probability: number;
  readonly source: Exclude<AnalysisSource, "example">;
}

export const PredictErrorCode = {
  Unreadable: "unreadable",
  Network: "network",
  Timeout: "timeout",
  Rejected: "rejected",
  Server: "server",
  InvalidResponse: "invalid-response",
} as const;
export type PredictErrorCode = (typeof PredictErrorCode)[keyof typeof PredictErrorCode];

const USER_MESSAGES = {
  unreadable: "No se pudo leer la foto. Prueba con otra.",
  network: "No hubo conexión con el modelo. Revisa la red y reintenta.",
  timeout: "El modelo tardó demasiado en responder. Reintenta en un momento.",
  rejected: "El modelo no aceptó esta foto. Prueba con otra o bájale la resolución.",
  server: "El modelo respondió con un error. Reintenta en un momento.",
  "invalid-response": "El modelo respondió en un formato inesperado. Avisa al equipo.",
} as const satisfies Readonly<Record<PredictErrorCode, string>>;

export class PredictError extends Error {
  override readonly name = "PredictError";
  readonly code: PredictErrorCode;

  constructor(code: PredictErrorCode, detail: string, options?: ErrorOptions) {
    super(`${code}: ${detail}`, options);
    this.code = code;
  }

  /** Texto apto para mostrar en la interfaz. */
  get userMessage(): string {
    return USER_MESSAGES[this.code];
  }
}

// ---------- Validación en la frontera ----------

const TIRE_CLASSES: readonly unknown[] = Object.values(TireClass);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const isProbability = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export function isPredictResponse(value: unknown): value is PredictResponse {
  return (
    isRecord(value) &&
    TIRE_CLASSES.includes(value["clase"]) &&
    isProbability(value["prob_defectuosa"]) &&
    isProbability(value["umbral"]) &&
    typeof value["modelo"] === "string" &&
    typeof value["aviso"] === "string"
  );
}

// ---------- Cliente ----------

const REQUEST_TIMEOUT_MS = 30_000;
const TRAILING_SLASH = "/";
const TIMEOUT_ERROR_NAME = "TimeoutError";
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;

/** 4xx: la foto o la petición no sirven, reintentar igual no ayuda. 5xx: falla del servidor. */
const statusErrorCode = (status: number): PredictErrorCode =>
  status >= HTTP_CLIENT_ERROR_MIN && status < HTTP_SERVER_ERROR_MIN ? PredictErrorCode.Rejected : PredictErrorCode.Server;

function readApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim() ?? "";
  return raw.endsWith(TRAILING_SLASH) ? raw.slice(0, -TRAILING_SLASH.length) : raw;
}

const API_BASE_URL = readApiBaseUrl();

/** `true` cuando no hay backend configurado y los resultados son simulados. */
export const IS_SIMULATED = !API_BASE_URL;

/** Lado de la muestra que usa la simulación; también basta para comprobar que la foto se puede leer. */
const SIM_SAMPLE_PX = 24;

/**
 * Decodifica ya reducida: comprobar que el archivo es legible no requiere los ~48 MB de RGBA
 * que ocupa una foto de 12 MP a resolución completa.
 */
async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { resizeWidth: SIM_SAMPLE_PX, resizeHeight: SIM_SAMPLE_PX });
  } catch (err) {
    throw new PredictError(PredictErrorCode.Unreadable, "createImageBitmap falló", { cause: err });
  }
}

async function requestPrediction(file: File): Promise<Prediction> {
  const body = new FormData();
  body.append(PREDICT_FILE_FIELD, file, file.name);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${PREDICT_PATH}`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === TIMEOUT_ERROR_NAME;
    const code = timedOut ? PredictErrorCode.Timeout : PredictErrorCode.Network;
    throw new PredictError(code, "fetch falló", { cause: err });
  }

  if (!response.ok) {
    throw new PredictError(statusErrorCode(response.status), `HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    throw new PredictError(PredictErrorCode.InvalidResponse, "el cuerpo no es JSON", { cause: err });
  }
  if (!isPredictResponse(payload)) {
    throw new PredictError(PredictErrorCode.InvalidResponse, "el cuerpo no cumple PredictResponse");
  }
  return { probability: payload.prob_defectuosa, source: AnalysisSource.Api };
}

// ---------- Simulación (solo prototipo) ----------

const SIM_PIXEL_STRIDE = 7;
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const SIM_BUCKETS = 1000;
const SIM_MIN = 0.04;
const SIM_SPAN = 0.92;
const SIM_ROUNDING = 100;
const SIM_DELAY_MS = 700;

const wait = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

/** Probabilidad determinista por imagen: la misma foto da siempre el mismo valor. */
function simulateProbability(bitmap: ImageBitmap): number {
  const canvas = new OffscreenCanvas(SIM_SAMPLE_PX, SIM_SAMPLE_PX);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PredictError(PredictErrorCode.Unreadable, "sin contexto 2d");
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, SIM_SAMPLE_PX, SIM_SAMPLE_PX);
  const sampled = data.filter((_, index) => index % SIM_PIXEL_STRIDE === 0);
  const hash = sampled.reduce((acc, byte) => Math.imul(acc ^ byte, FNV_PRIME) >>> 0, FNV_OFFSET_BASIS);
  const unit = (hash % SIM_BUCKETS) / SIM_BUCKETS;
  return Math.round((SIM_MIN + unit * SIM_SPAN) * SIM_ROUNDING) / SIM_ROUNDING;
}

/**
 * Analiza una foto. Siempre la decodifica primero (en miniatura) para rechazar
 * archivos corruptos antes de subirlos.
 * @throws {PredictError}
 */
export async function predictTire(file: File): Promise<Prediction> {
  const bitmap = await decodeImage(file);
  try {
    if (!IS_SIMULATED) return await requestPrediction(file);
    await wait(SIM_DELAY_MS);
    return { probability: simulateProbability(bitmap), source: AnalysisSource.Simulated };
  } finally {
    bitmap.close();
  }
}

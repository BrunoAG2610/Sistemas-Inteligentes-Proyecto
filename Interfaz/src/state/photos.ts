import type { AnalysisSource, Prediction } from "../api/predict";
import { POSITIONS, type PositionId } from "../domain/positions";
import { needsReview } from "../domain/threshold";

// ---------- Tipos ----------

interface PhotoBase {
  readonly id: string;
  readonly name: string;
  /** `blob:` para subidas (hay que revocarla) o `data:` para ejemplos. */
  readonly src: string;
  readonly position: PositionId | null;
  /** Texto tal como lo escribió el técnico; se interpreta con `parseDepth`. */
  readonly depthInput: string;
}

export const PhotoStatus = { Analyzing: "analyzing", Failed: "failed", Done: "done" } as const;
export type PhotoStatus = (typeof PhotoStatus)[keyof typeof PhotoStatus];

export type AnalyzingPhoto = PhotoBase & { readonly status: "analyzing"; readonly file: File };
export type FailedPhoto = PhotoBase & { readonly status: "failed"; readonly file: File; readonly message: string };
export type DonePhoto = PhotoBase & {
  readonly status: "done";
  readonly probability: number;
  readonly source: AnalysisSource;
};

export type PhotoItem = AnalyzingPhoto | FailedPhoto | DonePhoto;
export type PhotoState = readonly PhotoItem[];

export interface NewUpload {
  readonly id: string;
  readonly name: string;
  readonly src: string;
  readonly file: File;
}

export type PhotoAction =
  | { readonly type: "added"; readonly uploads: readonly NewUpload[]; readonly preferredPosition: PositionId | null }
  | { readonly type: "analyzed"; readonly id: string; readonly prediction: Prediction }
  | { readonly type: "failed"; readonly id: string; readonly message: string }
  | { readonly type: "retried"; readonly id: string }
  | { readonly type: "removed"; readonly id: string }
  | { readonly type: "positionChanged"; readonly id: string; readonly position: PositionId | null }
  | { readonly type: "depthChanged"; readonly id: string; readonly value: string }
  | { readonly type: "examplesLoaded"; readonly examples: readonly DonePhoto[] }
  | { readonly type: "examplesCleared" };

// ---------- Selectores ----------

export const isDone = (item: PhotoItem): item is DonePhoto => item.status === PhotoStatus.Done;
export const isExample = (item: PhotoItem): boolean => isDone(item) && item.source === "example";

/** Estado agregado de una posición del vehículo. */
export type WheelStatus = "empty" | "pending" | "review" | "ok";

export function wheelStatus(items: PhotoState, position: PositionId, threshold: number): WheelStatus {
  const atPosition = items.filter((item) => item.position === position);
  if (!atPosition.length) return "empty";
  if (atPosition.some((item) => !isDone(item))) return "pending";
  return atPosition.some((item) => isDone(item) && needsReview(item.probability, threshold)) ? "review" : "ok";
}

// ---------- Reducer ----------

function firstFreePosition(used: ReadonlySet<PositionId>): PositionId | null {
  return POSITIONS.find((position) => !used.has(position.id))?.id ?? null;
}

const usedPositions = (state: PhotoState): ReadonlySet<PositionId> =>
  new Set(state.flatMap((item) => (item.position ? [item.position] : [])));

const pickBase = (item: PhotoItem): PhotoBase => ({
  id: item.id,
  name: item.name,
  src: item.src,
  position: item.position,
  depthInput: item.depthInput,
});

function updateItem(state: PhotoState, id: string, update: (item: PhotoItem) => PhotoItem): PhotoState {
  return state.map((item) => (item.id === id ? update(item) : item));
}

interface Placement {
  readonly used: ReadonlySet<PositionId>;
  readonly items: readonly AnalyzingPhoto[];
}

type PhotoHandlers = {
  readonly [K in PhotoAction["type"]]: (state: PhotoState, action: Extract<PhotoAction, { type: K }>) => PhotoState;
};

const handlers: PhotoHandlers = {
  added: (state, { uploads, preferredPosition }) => {
    // Las fotos reales reemplazan a los ejemplos: mezclarlos daría dos fotos por posición
    // y cotizaciones de llantas que no existen.
    const real = state.filter((item) => !isExample(item));
    const initial: Placement = { used: usedPositions(real), items: [] };
    // Solo la primera foto usa la posición elegida en el vehículo, y solo si nadie la ocupó mientras tanto.
    const placed = uploads.reduce<Placement>((acc, upload, index) => {
      const preferred = index === 0 && preferredPosition && !acc.used.has(preferredPosition) ? preferredPosition : null;
      const position = preferred ?? firstFreePosition(acc.used);
      const item: AnalyzingPhoto = { ...upload, position, depthInput: "", status: PhotoStatus.Analyzing };
      return {
        used: position ? new Set([...acc.used, position]) : acc.used,
        items: [...acc.items, item],
      };
    }, initial);
    return [...real, ...placed.items];
  },

  analyzed: (state, { id, prediction }) =>
    updateItem(state, id, (item) =>
      item.status === PhotoStatus.Analyzing
        ? { ...pickBase(item), status: PhotoStatus.Done, ...prediction }
        : item,
    ),

  failed: (state, { id, message }) =>
    updateItem(state, id, (item) =>
      item.status === PhotoStatus.Analyzing
        ? { ...pickBase(item), status: PhotoStatus.Failed, file: item.file, message }
        : item,
    ),

  retried: (state, { id }) =>
    updateItem(state, id, (item) =>
      item.status === PhotoStatus.Failed ? { ...pickBase(item), status: PhotoStatus.Analyzing, file: item.file } : item,
    ),

  removed: (state, { id }) => state.filter((item) => item.id !== id),

  positionChanged: (state, { id, position }) => updateItem(state, id, (item) => ({ ...item, position })),

  depthChanged: (state, { id, value }) => updateItem(state, id, (item) => ({ ...item, depthInput: value })),

  examplesLoaded: (state, { examples }) => {
    const real = state.filter((item) => !isExample(item));
    const used = usedPositions(real);
    // Un ejemplo nunca le quita la posición a una foto real: si está ocupada, queda sin asignar.
    const placed = examples.map((example) =>
      example.position && used.has(example.position) ? { ...example, position: null } : example,
    );
    return [...real, ...placed];
  },

  examplesCleared: (state) => state.filter((item) => !isExample(item)),
};

export function photosReducer(state: PhotoState, action: PhotoAction): PhotoState {
  // TypeScript no correlaciona el handler indexado con la variante de `action`;
  // el mapa total de arriba garantiza que cada `type` recibe su propia variante.
  const handle = handlers[action.type] as (s: PhotoState, a: PhotoAction) => PhotoState;
  return handle(state, action);
}

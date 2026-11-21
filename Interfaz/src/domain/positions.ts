/** Ejes con distinta referencia de profundidad según NOM-068-SCT-2-2014. */
export const Axle = { Steering: "dir", Other: "otro" } as const;
export type Axle = (typeof Axle)[keyof typeof Axle];

export interface TirePositionSpec {
  readonly id: string;
  readonly name: string;
  readonly axle: Axle;
}

/** Orden canónico: define el orden del vehículo, del selector y del reporte. */
export const POSITIONS = [
  { id: "DI", name: "Delantera izquierda", axle: Axle.Steering },
  { id: "DD", name: "Delantera derecha", axle: Axle.Steering },
  { id: "TI", name: "Trasera izquierda", axle: Axle.Other },
  { id: "TD", name: "Trasera derecha", axle: Axle.Other },
  { id: "R", name: "Refacción", axle: Axle.Other },
] as const satisfies readonly TirePositionSpec[];

export type TirePosition = (typeof POSITIONS)[number];
export type PositionId = TirePosition["id"];

/** La refacción no cuenta para "faltan N de 4 posiciones". */
export const SPARE_POSITION_ID: PositionId = "R";

export const MAIN_POSITIONS: readonly TirePosition[] = POSITIONS.filter(
  (position) => position.id !== SPARE_POSITION_ID,
);

/** NOM-068-SCT-2-2014: profundidad mínima de dibujo en el eje de dirección. */
const STEERING_AXLE_MIN_DEPTH_MM = 3.2;
/** NOM-068-SCT-2-2014: profundidad mínima de dibujo en los demás ejes. */
const OTHER_AXLE_MIN_DEPTH_MM = 1.6;

/** Profundidad mínima de dibujo en mm por eje. */
export const REFERENCE_DEPTH_MM = Object.freeze({
  dir: STEERING_AXLE_MIN_DEPTH_MM,
  otro: OTHER_AXLE_MIN_DEPTH_MM,
} as const satisfies Readonly<Record<Axle, number>>);

export const AXLE_LABEL = Object.freeze({
  dir: "eje de dirección",
  otro: "otros ejes",
} as const satisfies Readonly<Record<Axle, string>>);

const POSITION_IDS: readonly string[] = POSITIONS.map((position) => position.id);

export function isPositionId(value: string): value is PositionId {
  return POSITION_IDS.includes(value);
}

export function findPosition(id: PositionId | null): TirePosition | undefined {
  return POSITIONS.find((position) => position.id === id);
}

/** Índice para ordenar; las fotos sin posición van al final. */
export function positionOrder(id: PositionId | null): number {
  const index = POSITIONS.findIndex((position) => position.id === id);
  return index < 0 ? POSITIONS.length : index;
}

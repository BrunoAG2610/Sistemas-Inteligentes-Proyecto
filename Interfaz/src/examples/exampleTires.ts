/**
 * Fotos de ejemplo (SVG) para probar la interfaz sin fotos reales.
 * Las probabilidades son fijas: no las calcula ningún modelo.
 */
import { AnalysisSource } from "../api/predict";
import type { PositionId } from "../domain/positions";
import { PhotoStatus, type DonePhoto } from "../state/photos";

type ExampleKind = "ok" | "crack" | "bulge" | "worn";

interface ExampleSpec {
  readonly name: string;
  readonly position: PositionId;
  readonly probability: number;
  readonly kind: ExampleKind;
}

const P_CRACK = 0.82;
const P_OK = 0.12;
const P_BULGE = 0.47;
const P_WORN = 0.08;

const EXAMPLES = [
  { name: "ejemplo_delantera_izq.jpg", position: "DI", probability: P_CRACK, kind: "crack" },
  { name: "ejemplo_delantera_der.jpg", position: "DD", probability: P_OK, kind: "ok" },
  { name: "ejemplo_trasera_izq.jpg", position: "TI", probability: P_BULGE, kind: "bulge" },
  { name: "ejemplo_trasera_der.jpg", position: "TD", probability: P_WORN, kind: "worn" },
] as const satisfies readonly ExampleSpec[];

export const EXAMPLE_COUNT = EXAMPLES.length;

const FULL_TURN_DEG = 360;
const TREAD_BLOCKS = 40;
const SPOKES = 5;
/** Gira cada ejemplo para que no se vean idénticos. */
const ROTATION_PER_EXAMPLE_DEG = 21;

const TREAD = {
  ok: { height: "13", fill: "#2e3235" },
  crack: { height: "13", fill: "#2e3235" },
  bulge: { height: "13", fill: "#2e3235" },
  worn: { height: "6", fill: "#26292b" },
} as const satisfies Readonly<Record<ExampleKind, { readonly height: string; readonly fill: string }>>;

const DAMAGE = {
  ok: "",
  worn: "",
  crack:
    '<g fill="none" stroke="#0a0b0c" stroke-linejoin="round">' +
    '<path stroke-width="2.4" d="M50 82 L58 92 L48 104 L56 116 L46 130"/>' +
    '<path stroke-width="1.6" d="M56 116 L66 124"/></g>',
  bulge: '<ellipse cx="182" cy="166" rx="22" ry="16" transform="rotate(40 182 166)" fill="url(#bulge)"/>',
} as const satisfies Readonly<Record<ExampleKind, string>>;

const DEFS =
  "<defs>" +
  '<linearGradient id="floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9aa1a6"/><stop offset="1" stop-color="#7d858a"/></linearGradient>' +
  '<radialGradient id="side" cx="0.4" cy="0.4" r="0.6"><stop offset="0.4" stop-color="#34383b"/><stop offset="1" stop-color="#1f2224"/></radialGradient>' +
  '<radialGradient id="bulge"><stop offset="0" stop-color="#4a4f52"/><stop offset="1" stop-color="#1f2224" stop-opacity="0"/></radialGradient>' +
  "</defs>";

const ring = (count: number, render: (angle: number) => string): string =>
  Array.from({ length: count }, (_, i) => render((i * FULL_TURN_DEG) / count)).join("");

function tireSvg(kind: ExampleKind, index: number): string {
  const tread = TREAD[kind];
  const blocks = ring(
    TREAD_BLOCKS,
    (angle) =>
      `<rect x="-5" y="-108" width="10" height="${tread.height}" fill="${tread.fill}" transform="rotate(${angle})"/>`,
  );
  const spokes = ring(
    SPOKES,
    (angle) => `<ellipse cy="-34" rx="9" ry="18" fill="#8b9296" transform="rotate(${angle})"/>`,
  );
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">' +
    DEFS +
    '<rect width="240" height="240" fill="url(#floor)"/>' +
    `<g transform="translate(120 122) rotate(${index * ROTATION_PER_EXAMPLE_DEG})">` +
    '<circle r="108" fill="#1b1d1f"/>' +
    blocks +
    '<circle r="94" fill="url(#side)"/>' +
    '<circle r="80" fill="none" stroke="#3d4245" stroke-width="2"/>' +
    '<circle r="60" fill="#b6bcc0"/>' +
    spokes +
    '<circle r="14" fill="#6c7377"/>' +
    "</g>" +
    DAMAGE[kind] +
    "</svg>"
  );
}

const toDataUri = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function createExamplePhotos(): readonly DonePhoto[] {
  return EXAMPLES.map((spec, index) => ({
    id: `ejemplo-${spec.position}-${crypto.randomUUID()}`,
    name: spec.name,
    src: toDataUri(tireSvg(spec.kind, index)),
    position: spec.position,
    depthInput: "",
    status: PhotoStatus.Done,
    probability: spec.probability,
    source: AnalysisSource.Example,
  }));
}

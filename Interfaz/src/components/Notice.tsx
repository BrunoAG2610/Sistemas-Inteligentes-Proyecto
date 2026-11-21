import type { JSX } from "react";
import { formatMm } from "../domain/depth";
import { Axle, REFERENCE_DEPTH_MM } from "../domain/positions";
import { Icon } from "./Icon";

export function Notice(): JSX.Element {
  return (
    <aside className="notice" aria-label="Aviso">
      <Icon name="info" />
      <div>
        <p>
          <strong>Revisión informativa, no oficial.</strong> El modelo busca daño visible en el costado, como grietas o
          abultamientos. Una foto no mide la profundidad del dibujo: un técnico la confirma con medidor antes de
          recomendar un cambio.
        </p>
        <p>
          Referencia de profundidad: NOM-068-SCT-2-2014 para autotransporte federal,{" "}
          {formatMm(REFERENCE_DEPTH_MM[Axle.Steering])} mm en el eje de dirección y{" "}
          {formatMm(REFERENCE_DEPTH_MM[Axle.Other])} mm en los demás ejes. En autos particulares sirve solo como guía.
        </p>
      </div>
    </aside>
  );
}

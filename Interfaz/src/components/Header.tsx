import type { JSX } from "react";
import { IS_SIMULATED } from "../api/predict";

const MODE_LABEL = IS_SIMULATED ? "Prototipo · resultados simulados" : "Modelo conectado";

export function Header(): JSX.Element {
  return (
    <header className="top">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <circle cx="20" cy="20" r="18" fill="var(--fg)" />
          <circle cx="20" cy="20" r="11" fill="var(--surface-2)" />
          <circle cx="20" cy="20" r="4" fill="var(--fg)" />
          <path
            d="M20 2v4M20 34v4M2 20h4M34 20h4M7.3 7.3l2.8 2.8M29.9 29.9l2.8 2.8M7.3 32.7l2.8-2.8M29.9 10.1l2.8-2.8"
            stroke="var(--surface)"
            strokeWidth="2.2"
          />
        </svg>
        <div>
          <h1>Revisión de llantas</h1>
          <p>Triaje con foto para decidir qué llanta medir primero</p>
        </div>
      </div>
      <span className={IS_SIMULATED ? "proto" : "proto is-live"}>{MODE_LABEL}</span>
    </header>
  );
}

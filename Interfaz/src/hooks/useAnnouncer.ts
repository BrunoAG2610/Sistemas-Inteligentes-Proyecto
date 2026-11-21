import { useCallback, useEffect, useRef, useState } from "react";

/** Pausa para que el lector de pantalla note el cambio aunque el texto se repita. */
const ANNOUNCE_DELAY_MS = 30;

export interface Announcer {
  readonly message: string;
  readonly announce: (text: string) => void;
}

/** Mensajes para una región `aria-live="polite"`. */
export function useAnnouncer(): Announcer {
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const announce = useCallback((text: string): void => {
    window.clearTimeout(timer.current);
    setMessage("");
    timer.current = window.setTimeout(() => setMessage(text), ANNOUNCE_DELAY_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { message, announce };
}

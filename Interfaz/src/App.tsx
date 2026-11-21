import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Header } from "./components/Header";
import { Notice } from "./components/Notice";
import { ReportPanel } from "./components/ReportPanel";
import { positionDomId, removeDomId, rowDomId } from "./components/ResultRow";
import { ResultsPanel } from "./components/ResultsPanel";
import { ThresholdPanel } from "./components/ThresholdPanel";
import { UploadPanel } from "./components/UploadPanel";
import { VehiclePanel } from "./components/VehiclePanel";
import { findPosition, type PositionId, type TirePosition } from "./domain/positions";
import { DEFAULT_THRESHOLD } from "./domain/threshold";
import { useAnnouncer } from "./hooks/useAnnouncer";
import { usePhotos } from "./hooks/usePhotos";

const FLASH_CLASS = "flash";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Lleva al técnico de la llanta del vehículo a su fila de resultados. */
function focusRow(id: string): void {
  const row = document.getElementById(rowDomId(id));
  if (!row) return;
  const behavior: ScrollBehavior = window.matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth";
  row.scrollIntoView({ behavior, block: "center" });
  row.classList.remove(FLASH_CLASS);
  // Leer offsetWidth fuerza un reflow para que la animación vuelva a empezar.
  void row.offsetWidth;
  row.classList.add(FLASH_CLASS);
  document.getElementById(positionDomId(id))?.focus({ preventScroll: true });
}

export function App(): JSX.Element {
  const { message, announce } = useAnnouncer();
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [nextPositionId, setNextPositionId] = useState<PositionId | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = usePhotos({ threshold, announce });
  const { items, addFiles, remove, clearExamples } = photos;

  const handleFiles = useCallback(
    (files: readonly File[]): void => {
      if (!files.length) return;
      addFiles(files, nextPositionId);
      setNextPositionId(null);
    },
    [addFiles, nextPositionId],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) handleFiles(files);
    };
    // Soltar una foto fuera del área haría que el navegador la abra y se perdiera todo lo capturado.
    // El área de carga ya llamó preventDefault, así que aquí solo llegan las que cayeron fuera.
    const onDragOver = (event: DragEvent): void => event.preventDefault();
    const onDrop = (event: DragEvent): void => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      handleFiles(Array.from(event.dataTransfer?.files ?? []));
    };
    document.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFiles]);

  const onWheel = (position: TirePosition): void => {
    const item = items.find((candidate) => candidate.position === position.id);
    if (item) {
      focusRow(item.id);
      return;
    }
    setNextPositionId(position.id);
    fileInputRef.current?.click();
  };

  const onRemove = (id: string): void => {
    const index = items.findIndex((item) => item.id === id);
    const neighbor = items[index + 1] ?? items[index - 1];
    remove(id);
    // El foco no debe perderse en <body> al desaparecer el botón: pasa a la fila vecina o a la carga.
    requestAnimationFrame(() => {
      const target = neighbor ? document.getElementById(removeDomId(neighbor.id)) : fileInputRef.current;
      target?.focus();
    });
  };

  const onClearExamples = (): void => {
    clearExamples();
    requestAnimationFrame(() => fileInputRef.current?.focus());
  };

  return (
    <div className="wrap">
      <Header />
      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      <main className="grid">
        <div className="col">
          <UploadPanel
            photoCount={items.length}
            nextPosition={findPosition(nextPositionId)}
            errors={photos.uploadErrors}
            fileInputRef={fileInputRef}
            onFiles={handleFiles}
            onClearNextPosition={() => setNextPositionId(null)}
            onLoadExamples={photos.loadExamples}
          />
          <ThresholdPanel threshold={threshold} onChange={setThreshold} />
        </div>

        <div className="col">
          <VehiclePanel items={items} threshold={threshold} onWheel={onWheel} />
          <ResultsPanel
            items={items}
            threshold={threshold}
            onClearExamples={onClearExamples}
            onPosition={photos.setPosition}
            onDepth={photos.setDepth}
            onRemove={onRemove}
            onRetry={photos.retry}
          />
          <ReportPanel items={items} threshold={threshold} />
        </div>
      </main>

      <Notice />
    </div>
  );
}

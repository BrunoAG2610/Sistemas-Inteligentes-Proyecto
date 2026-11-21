import { useState, type ChangeEvent, type DragEvent, type JSX, type RefObject } from "react";
import { ACCEPT_ATTRIBUTE, MAX_FILE_MB } from "../domain/files";
import type { TirePosition } from "../domain/positions";
import { countNoun } from "../domain/text";
import { Icon } from "./Icon";

interface UploadPanelProps {
  readonly photoCount: number;
  readonly nextPosition: TirePosition | undefined;
  readonly errors: readonly string[];
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly onFiles: (files: readonly File[]) => void;
  readonly onClearNextPosition: () => void;
  readonly onLoadExamples: () => void;
}

const UPLOAD_ERROR_ID = "upload-error";

/** Vacía el input para que volver a elegir el mismo archivo dispare `change`. */
function takeFiles(event: ChangeEvent<HTMLInputElement>): readonly File[] {
  const input = event.currentTarget;
  const files = Array.from(input.files ?? []);
  input.value = "";
  return files;
}

export function UploadPanel(props: UploadPanelProps): JSX.Element {
  const { photoCount, nextPosition, errors, fileInputRef, onFiles, onClearNextPosition, onLoadExamples } = props;
  const [isOver, setIsOver] = useState(false);
  const [cameraInput, setCameraInput] = useState<HTMLInputElement | null>(null);

  const onDragOver = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setIsOver(true);
  };
  // Pasar sobre un hijo del área también dispara dragleave; solo se apaga al salir del área.
  const onDragLeave = (event: DragEvent<HTMLLabelElement>): void => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setIsOver(false);
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setIsOver(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section className="panel" aria-labelledby="h-subir">
      <div className="panel-head">
        <h2 id="h-subir">Subir fotos</h2>
        <span className="muted mono">{countNoun(photoCount, "foto", "fotos")}</span>
      </div>

      <label
        className={isOver ? "drop is-over" : "drop"}
        htmlFor="file"
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Icon name="upload" />
        <strong>Arrastra fotos aquí o elige archivos</strong>
        <span className="muted">JPG, PNG o WebP, hasta {MAX_FILE_MB} MB cada una. Una foto por llanta.</span>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          id="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          aria-describedby={errors.length ? UPLOAD_ERROR_ID : undefined}
          onChange={(event) => onFiles(takeFiles(event))}
        />
      </label>

      {nextPosition && (
        <p className="next-pos">
          <span>La siguiente foto va a: {nextPosition.name}</span>
          <button type="button" className="next-pos-clear" onClick={onClearNextPosition} aria-label="Cancelar posición elegida">
            <Icon name="close" />
          </button>
        </p>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={() => cameraInput?.click()}>
          <Icon name="camera" />
          Tomar foto
        </button>
        <input
          ref={setCameraInput}
          className="sr-only"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          capture="environment"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => onFiles(takeFiles(event))}
        />
        <button type="button" className="btn btn-ghost" onClick={onLoadExamples}>
          Cargar ejemplos
        </button>
      </div>

      {Boolean(errors.length) && (
        <div className="error" id={UPLOAD_ERROR_ID} role="alert">
          <Icon name="alert" />
          <span>{errors.join(" ")}</span>
        </div>
      )}

      <ul className="tips" aria-label="Cómo tomar la foto">
        <li>
          <Icon name="frame" />
          <span>
            <strong>Costado completo en el cuadro.</strong> El modelo se entrenó con fotos de llanta entera, no con
            acercamientos al dibujo.
          </span>
        </li>
        <li>
          <Icon name="sun" />
          <span>
            <strong>Luz pareja, sin flash directo.</strong> Las sombras fuertes causan falsas alarmas.
          </span>
        </li>
        <li>
          <Icon name="plate" />
          <span>
            <strong>Que no salga la placa.</strong> La unidad se identifica por su número económico.
          </span>
        </li>
      </ul>
    </section>
  );
}

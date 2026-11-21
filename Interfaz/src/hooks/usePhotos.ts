import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { PredictError, PredictErrorCode, predictTire } from "../api/predict";
import { checkImageFile } from "../domain/files";
import type { PositionId } from "../domain/positions";
import { formatProbability, needsReview } from "../domain/threshold";
import { createExamplePhotos, EXAMPLE_COUNT } from "../examples/exampleTires";
import { countNoun } from "../domain/text";
import { isExample, PhotoStatus, photosReducer, type NewUpload, type PhotoState } from "../state/photos";

const BLOB_SCHEME = "blob:";
const UNEXPECTED_ERROR = "Algo falló al analizar la foto. Reintenta.";

export interface PhotosController {
  readonly items: PhotoState;
  /** Errores de la última tanda de archivos (formato, tamaño, lectura). */
  readonly uploadErrors: readonly string[];
  readonly addFiles: (files: readonly File[], preferredPosition: PositionId | null) => void;
  readonly retry: (id: string) => void;
  readonly remove: (id: string) => void;
  readonly setPosition: (id: string, position: PositionId | null) => void;
  readonly setDepth: (id: string, value: string) => void;
  readonly loadExamples: () => void;
  readonly clearExamples: () => void;
}

interface UsePhotosOptions {
  readonly threshold: number;
  readonly announce: (text: string) => void;
}

function revoke(src: string): void {
  if (src.startsWith(BLOB_SCHEME)) URL.revokeObjectURL(src);
}

export function usePhotos({ threshold, announce }: UsePhotosOptions): PhotosController {
  const [items, dispatch] = useReducer(photosReducer, []);
  const [uploadErrors, setUploadErrors] = useState<readonly string[]>([]);

  // Las respuestas llegan de forma asíncrona: leen el umbral y la lista vigentes, no los de cuando se pidió.
  const thresholdRef = useRef(threshold);
  const itemsRef = useRef(items);
  useEffect(() => {
    thresholdRef.current = threshold;
    itemsRef.current = items;
  });

  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => revoke(item.src));
    },
    [],
  );

  const analyze = useCallback(
    async (id: string, name: string, src: string, file: File): Promise<void> => {
      // Si la quitaron mientras se analizaba, su resultado o su error ya no le importan a nadie.
      const stillPresent = (): boolean => itemsRef.current.some((item) => item.id === id);
      try {
        const prediction = await predictTire(file);
        dispatch({ type: "analyzed", id, prediction });
        if (!stillPresent()) return;
        const verdict = needsReview(prediction.probability, thresholdRef.current)
          ? "revisar con medidor"
          : "sin hallazgos visibles";
        announce(`${name}: ${verdict}, probabilidad de defecto ${formatProbability(prediction.probability)}.`);
      } catch (err) {
        if (!(err instanceof PredictError)) console.error("predictTire falló de forma inesperada", err);
        if (!stillPresent()) return;
        if (err instanceof PredictError && err.code === PredictErrorCode.Unreadable) {
          revoke(src);
          dispatch({ type: "removed", id });
          setUploadErrors((prev) => [...prev, `No se pudo leer “${name}”. Prueba con otra foto.`]);
          return;
        }
        const message = err instanceof PredictError ? err.userMessage : UNEXPECTED_ERROR;
        dispatch({ type: "failed", id, message });
        announce(`${name}: ${message}`);
      }
    },
    [announce],
  );

  const addFiles = useCallback(
    (files: readonly File[], preferredPosition: PositionId | null): void => {
      if (!files.length) return;
      const checks = files.map((file) => ({ file, check: checkImageFile(file) }));
      setUploadErrors(checks.flatMap(({ check }) => (check.ok ? [] : [check.message])));

      const uploads: readonly NewUpload[] = checks
        .filter(({ check }) => check.ok)
        .map(({ file }) => ({ id: crypto.randomUUID(), name: file.name, src: URL.createObjectURL(file), file }));
      if (!uploads.length) return;

      // El reducer quita los ejemplos al llegar fotos reales; aquí solo se avisa.
      const replacedExamples = itemsRef.current.some(isExample);
      dispatch({ type: "added", uploads, preferredPosition });
      const analyzing = `Analizando ${countNoun(uploads.length, "foto", "fotos")}.`;
      announce(replacedExamples ? `Se quitaron los ejemplos. ${analyzing}` : analyzing);
      uploads.forEach((upload) => void analyze(upload.id, upload.name, upload.src, upload.file));
    },
    [analyze, announce],
  );

  const retry = useCallback(
    (id: string): void => {
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (item?.status !== PhotoStatus.Failed) return;
      dispatch({ type: "retried", id });
      announce(`Analizando ${item.name} de nuevo.`);
      void analyze(item.id, item.name, item.src, item.file);
    },
    [analyze, announce],
  );

  const remove = useCallback(
    (id: string): void => {
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (!item) return;
      revoke(item.src);
      dispatch({ type: "removed", id });
      announce(`Foto ${item.name} quitada.`);
    },
    [announce],
  );

  const setPosition = useCallback((id: string, position: PositionId | null): void => {
    dispatch({ type: "positionChanged", id, position });
  }, []);

  const setDepth = useCallback((id: string, value: string): void => {
    dispatch({ type: "depthChanged", id, value });
  }, []);

  const loadExamples = useCallback((): void => {
    dispatch({ type: "examplesLoaded", examples: createExamplePhotos() });
    announce(`Se cargaron ${countNoun(EXAMPLE_COUNT, "foto", "fotos")} de ejemplo.`);
  }, [announce]);

  const clearExamples = useCallback((): void => {
    dispatch({ type: "examplesCleared" });
    announce("Ejemplos quitados.");
  }, [announce]);

  return { items, uploadErrors, addFiles, retry, remove, setPosition, setDepth, loadExamples, clearExamples };
}

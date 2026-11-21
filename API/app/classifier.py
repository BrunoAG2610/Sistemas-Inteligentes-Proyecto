"""Carga el modelo Keras y traduce su salida a probabilidad de defecto."""

from pathlib import Path
from typing import Protocol

import numpy as np


class Classifier(Protocol):
    def prob_defective(self, batch: np.ndarray) -> float: ...


class KerasTyreClassifier:
    """Envuelve tyre_cnn_best.keras.

    En el entrenamiento se usó image_dataset_from_directory con label_mode="binary".
    Las carpetas se ordenan alfabéticamente: defective = 0, good = 1.
    Por eso la sigmoide de salida es P(buena) y aquí se invierte.
    """

    def __init__(self, model_path: Path) -> None:
        if not model_path.is_file():
            raise FileNotFoundError(f"No existe el modelo: {model_path}")
        import keras  # Import tardío: las pruebas usan un clasificador falso y no cargan TensorFlow.

        # compile=False: para inferir no hacen falta optimizador ni métricas.
        self._model = keras.models.load_model(model_path, compile=False)

    def prob_defective(self, batch: np.ndarray) -> float:
        # training=False apaga Dropout y las capas de aumentación de datos.
        prob_good = float(np.asarray(self._model(batch, training=False))[0, 0])
        return min(max(1.0 - prob_good, 0.0), 1.0)

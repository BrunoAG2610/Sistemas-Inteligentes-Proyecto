"""Convierte los bytes de una foto en la entrada que espera el modelo.

Tiene que repetir exactamente lo que hizo Modelo/01_eda_preprocesamiento.ipynb:
    Image.open(...).convert("RGB").resize((224, 224))   # BICUBIC, sin conservar proporción
y lo que hizo image_dataset_from_directory en 02_entrenamiento_modelo.ipynb:
    tensor float32 de 0 a 255, forma (lote, 224, 224, 3).

NO se divide entre 255: el modelo trae una capa Rescaling(1/255) adentro.
"""

import io

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

IMG_SIZE = (224, 224)
ALLOWED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})

# Una foto de celular ronda 12–50 MP. Más que esto es sospechoso (bomba de descompresión).
Image.MAX_IMAGE_PIXELS = 60_000_000


class InvalidImageError(ValueError):
    """La foto no se pudo decodificar o no es un formato aceptado."""


def decode_image(data: bytes) -> Image.Image:
    """Decodifica y endereza la foto. Devuelve una imagen RGB a resolución original."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            if img.format not in ALLOWED_FORMATS:
                raise InvalidImageError(f"formato no aceptado: {img.format}")
            img.load()
            # Las fotos de celular guardan la rotación en EXIF; sin esto el modelo la ve de lado.
            upright = ImageOps.exif_transpose(img)
            return upright.convert("RGB")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as err:
        raise InvalidImageError(str(err)) from err


def to_model_input(img: Image.Image) -> np.ndarray:
    """Imagen RGB → arreglo float32 (1, 224, 224, 3) con valores 0–255."""
    resized = img.resize(IMG_SIZE, Image.Resampling.BICUBIC)
    array = np.asarray(resized, dtype=np.float32)
    return np.expand_dims(array, axis=0)


def preprocess(data: bytes) -> np.ndarray:
    return to_model_input(decode_image(data))

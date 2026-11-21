"""Configuración de la API. Todo se puede sobrescribir con variables de entorno."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = Path(
    os.environ.get("MODEL_PATH", REPO_ROOT / "Modelo" / "saved_models" / "tyre_cnn_best.keras")
)
MODEL_NAME = os.environ.get("MODEL_NAME", "tyre-cnn-v1")

# Igual que DEFAULT_THRESHOLD en Interfaz/src/domain/threshold.ts.
DEFAULT_THRESHOLD = float(os.environ.get("DEFAULT_THRESHOLD", "0.4"))

# Igual que MAX_FILE_MB y ACCEPTED_IMAGE_TYPES en Interfaz/src/domain/files.ts.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ACCEPTED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

DISCLAIMER = "Revisión informativa, no oficial. No mide la profundidad del dibujo."

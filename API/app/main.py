"""FastAPI que sirve el modelo de llantas a la interfaz.

Contrato: Interfaz/README.md, sección "Contrato de POST /predict".
Arranque:  uvicorn app.main:app --reload   (desde la carpeta API/)
"""

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config
from .classifier import Classifier, KerasTyreClassifier
from .preprocessing import InvalidImageError, preprocess


class PredictResponse(BaseModel):
    clase: Literal["buena", "defectuosa"]
    prob_defectuosa: float = Field(ge=0, le=1)
    umbral: float = Field(ge=0, le=1)
    modelo: str
    aviso: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    modelo: str


def _load_default_classifier() -> Classifier:
    return KerasTyreClassifier(config.MODEL_PATH)


def create_app(load_classifier: Callable[[], Classifier] = _load_default_classifier) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Se carga una sola vez al arrancar, no en cada petición.
        app.state.classifier = load_classifier()
        yield

    app = FastAPI(title="Revisión de llantas", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> HealthResponse:
        return HealthResponse(status="ok", modelo=config.MODEL_NAME)

    # `def` (no `async def`): FastAPI lo corre en un hilo y la inferencia no bloquea el servidor.
    @app.post("/predict")
    def predict(
        request: Request,
        foto: UploadFile = File(...),
        umbral: float = Query(config.DEFAULT_THRESHOLD, ge=0, le=1),
    ) -> PredictResponse:
        if foto.content_type not in config.ACCEPTED_CONTENT_TYPES:
            raise HTTPException(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "La foto debe ser JPG, PNG o WebP."
            )

        data = foto.file.read(config.MAX_UPLOAD_BYTES + 1)
        if len(data) > config.MAX_UPLOAD_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "La foto pesa más de 10 MB.")

        try:
            batch = preprocess(data)
        except InvalidImageError as err:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "No se pudo leer la foto."
            ) from err

        classifier: Classifier = request.app.state.classifier
        prob = classifier.prob_defective(batch)

        return PredictResponse(
            clase="defectuosa" if prob >= umbral else "buena",
            prob_defectuosa=round(prob, 4),
            umbral=umbral,
            modelo=config.MODEL_NAME,
            aviso=config.DISCLAIMER,
        )

    return app


app = create_app()

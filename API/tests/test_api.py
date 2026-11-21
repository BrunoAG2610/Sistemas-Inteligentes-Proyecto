"""Pruebas de la API con un clasificador falso: no necesitan TensorFlow ni el .keras."""

import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import config
from app.main import create_app
from app.preprocessing import IMG_SIZE, preprocess


class FakeClassifier:
    def __init__(self, prob: float) -> None:
        self.prob = prob
        self.last_batch: np.ndarray | None = None

    def prob_defective(self, batch: np.ndarray) -> float:
        self.last_batch = batch
        return self.prob


def make_image(fmt: str = "JPEG", size: tuple[int, int] = (640, 480), mode: str = "RGB") -> bytes:
    buf = io.BytesIO()
    Image.new(mode, size, color=(200, 30, 30) if mode == "RGB" else 128).save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture
def fake() -> FakeClassifier:
    return FakeClassifier(prob=0.82)


@pytest.fixture
def client(fake: FakeClassifier):
    with TestClient(create_app(lambda: fake)) as c:
        yield c


def post(client: TestClient, data: bytes, content_type: str = "image/jpeg", **params):
    return client.post("/predict", files={"foto": ("llanta.jpg", data, content_type)}, params=params)


def test_respuesta_cumple_contrato(client: TestClient) -> None:
    res = post(client, make_image())
    assert res.status_code == 200
    assert res.json() == {
        "clase": "defectuosa",
        "prob_defectuosa": 0.82,
        "umbral": config.DEFAULT_THRESHOLD,
        "modelo": config.MODEL_NAME,
        "aviso": config.DISCLAIMER,
    }


def test_umbral_por_query(client: TestClient) -> None:
    assert post(client, make_image(), umbral=0.9).json()["clase"] == "buena"


def test_entrada_al_modelo(client: TestClient, fake: FakeClassifier) -> None:
    post(client, make_image("PNG", mode="L"), "image/png")
    batch = fake.last_batch
    assert batch is not None
    assert batch.shape == (1, *IMG_SIZE, 3)
    assert batch.dtype == np.float32
    # 0–255, sin normalizar: el modelo trae su propia capa Rescaling.
    assert batch.max() > 1.0


@pytest.mark.parametrize(
    ("data", "content_type", "code"),
    [
        (b"no soy una imagen", "image/jpeg", 422),
        (make_image("GIF"), "image/jpeg", 422),
        (make_image(), "application/pdf", 415),
    ],
)
def test_rechazos(client: TestClient, data: bytes, content_type: str, code: int) -> None:
    assert post(client, data, content_type).status_code == code


def test_archivo_grande(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 100)
    assert post(client, make_image()).status_code == 413


def test_exif_endereza_la_foto() -> None:
    # 400x200 apaisada con EXIF Orientation=6 (rotar 90°) → debe quedar vertical antes del resize.
    img = Image.new("RGB", (400, 200))
    img.paste((255, 255, 255), (0, 0, 200, 200))  # mitad izquierda blanca
    exif = Image.Exif()
    exif[0x0112] = 6
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    batch = preprocess(buf.getvalue())[0]
    top, bottom = batch[:50].mean(), batch[-50:].mean()
    assert top > 200 and bottom < 50


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok", "modelo": config.MODEL_NAME}

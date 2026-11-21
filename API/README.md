# API · Revisión de llantas

FastAPI que sirve `Modelo/saved_models/tyre_cnn_best.keras` a la interfaz.
El contrato de `POST /predict` está en [Interfaz/README.md](../Interfaz/README.md#contrato-de-post-predict).

## Uso

Requiere Python 3.10–3.12: TensorFlow 2.16.2, la versión con que se entrenó el modelo, no tiene ruedas para 3.13+.

```bash
cd API
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt

uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
pytest                                      # no carga TensorFlow, usa un clasificador falso
```

En otra terminal, la interfaz con `Interfaz/.env` → `VITE_API_URL=http://localhost:8000`:

```bash
cd Interfaz
npm run dev
```

## Cómo llega la foto al modelo

```
navegador ── multipart, campo "foto" ──▶ POST /predict
  1. valida tipo (JPG/PNG/WebP) y tamaño (≤ 10 MB)
  2. Pillow decodifica y endereza con EXIF (fotos de celular)
  3. convert("RGB").resize((224, 224), BICUBIC)   ← igual que 01_eda_preprocesamiento
  4. float32 (1, 224, 224, 3) con valores 0–255  ← NO se divide entre 255
  5. model(x, training=False) → sigmoide = P(buena)
  6. prob_defectuosa = 1 − P(buena)
```

- **Paso 4.** El modelo trae `Rescaling(1/255)` como capa interna. Si se normaliza también aquí, la
  imagen llega casi negra y las predicciones salen mal sin dar ningún error.
- **Paso 6.** `image_dataset_from_directory(label_mode="binary")` asigna las etiquetas en orden
  alfabético de carpeta: `defective = 0` y `good = 1`. Por eso la sigmoide da la probabilidad de
  **buena**. Si se reentrena cambiando nombres de carpeta, hay que revisar
  [app/classifier.py](app/classifier.py).
- **Paso 5.** `training=False` apaga el Dropout y la aumentación de datos (flip, rotación, zoom).

## Variables de entorno

| Variable            | Por defecto                                   |
|---------------------|-----------------------------------------------|
| `MODEL_PATH`        | `../Modelo/saved_models/tyre_cnn_best.keras`  |
| `MODEL_NAME`        | `tyre-cnn-v1`                                 |
| `DEFAULT_THRESHOLD` | `0.4` (el mismo que la interfaz)              |
| `CORS_ORIGINS`      | `http://localhost:5173` (separadas por comas) |

`POST /predict?umbral=0.6` cambia el umbral de esa petición. La interfaz reclasifica con el suyo, así que
normalmente no hace falta usarlo.

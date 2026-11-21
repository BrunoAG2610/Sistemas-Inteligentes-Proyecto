# Interfaz · Revisión de llantas

Página para hacer triaje con fotos: el técnico sube la foto del costado de cada llanta y el modelo estima la
probabilidad de defecto visible. Con eso decide qué llanta medir primero con el medidor. Es una revisión
informativa, no oficial.

Stack: Vite + React 19 + TypeScript en modo estricto.

## Uso

```bash
cd Interfaz
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de dominio, reducer y contrato
npm run build      # tsc --noEmit + build de producción en dist/
```

### Conectar el modelo

Copia `.env.example` a `.env` y apunta `VITE_API_URL` al FastAPI:

```
VITE_API_URL=http://localhost:8000
```

Si no existe `VITE_API_URL`, la página trabaja en **modo simulado**: calcula una probabilidad determinista a
partir de los píxeles de la foto, marca cada resultado como "Simulado" y el encabezado dice "Prototipo".

El navegador llama al backend desde otro origen, así que el FastAPI necesita CORS:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["POST"], allow_headers=["*"])
```

## Contrato de `POST /predict`

La interfaz valida la respuesta en tiempo de ejecución (`isPredictResponse` en
[src/api/predict.ts](src/api/predict.ts)). Si un campo cambia de nombre o de tipo, la foto queda en
"No se pudo analizar" en lugar de mostrar un dato falso.

```
POST /predict
Content-Type: multipart/form-data
  foto: archivo de imagen (JPG, PNG o WebP, ≤ 10 MB)

200 OK
{
  "clase": "defectuosa",          // "buena" | "defectuosa"
  "prob_defectuosa": 0.82,        // 0–1
  "umbral": 0.40,                 // 0–1
  "modelo": "mobilenetv2-v1",
  "aviso": "Revisión informativa, no oficial. No mide la profundidad del dibujo."
}
```

Modelo Pydantic equivalente, para que el backend no se desvíe del contrato:

```python
from typing import Literal
from pydantic import BaseModel, Field

class PredictResponse(BaseModel):
    clase: Literal["buena", "defectuosa"]
    prob_defectuosa: float = Field(ge=0, le=1)
    umbral: float = Field(ge=0, le=1)
    modelo: str
    aviso: str
```

La interfaz **reclasifica con su propio umbral** a partir de `prob_defectuosa`: el técnico mueve el deslizador
y no se vuelve a llamar al servidor. `clase` y `umbral` del servidor se validan, pero no se usan para decidir.

## Pendientes

- **Métricas del umbral.** El panel muestra "—" hasta llenar `VALIDATION_CURVE` en
  [src/domain/threshold.ts](src/domain/threshold.ts) con la curva recall / falsas alarmas por umbral que salga
  del notebook `03_evaluacion_y_errores.ipynb`, un punto por cada paso de 0.05.
- **Cotizaciones.** No existe endpoint todavía. El botón valida el consentimiento y el contacto, y luego avisa
  que no se envió nada (`TODO` en [src/components/ReportPanel.tsx](src/components/ReportPanel.tsx)).

## Estructura

```
src/
  api/predict.ts          contrato, validación de la respuesta, cliente y simulación
  domain/                 reglas puras con pruebas: posiciones, profundidad NOM-068, umbral, archivos, contacto, reporte
  state/photos.ts         estado de las fotos (unión discriminada analizando | falló | listo) y reducer
  hooks/                  usePhotos (coordina la API) y useAnnouncer (región aria-live)
  examples/               fotos de ejemplo en SVG
  components/             un componente por panel del diseño
  styles/app.css          tokens y estilos del diseño, con modo oscuro
```

# NeuMEX
**NeuMEX** es una solución de visión por computadora basada en una Red Neuronal Convolucional (CNN) diseñada y entrenada desde cero en TensorFlow / Keras. A partir de una fotografía, la aplicación analiza el neumático en segundos y lo clasifica como en buen estado (`good`) o defectuoso (`defective`), ayudando a prevenir accidentes viales y priorizar qué llantas requieren medición o reemplazo inmediato.

## Contribuidores
xskf-4 - Sebastian Hernandez Reyes. \
BrunoAG2610 - Bruno Aguilar Buendía. \
Dieg0Her13ra o dhh-maker - Diego Herrera Hernández. \
Antonio4240 o JOSE_CARLOS\tonis - Antonio Velázquez Martínez.


## Dataset y Atribución

El entrenamiento y validación de la red neuronal de **NeuMEX** se realizaron utilizando un conjunto de datos público de imágenes de neumáticos (clasificados en condiciones óptimas y defectuosas) distribuido bajo la licencia **[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**.

* **Atribución y procedencia:** El crédito completo del autor original, el enlace de descarga directa y el conteo detallado de imágenes se encuentran documentados en [`Modelo/data/raw/README.md`](Modelo/data/raw/README.md).
* **Modificaciones realizadas:** Para adaptar los datos al entrenamiento del modelo, las imágenes originales fueron sometidas a procesos de depuración de duplicados, redimensionamiento a `224 × 224` píxeles, particionamiento estratificado (`train`, `val` y `test`) y transformaciones de aumento de datos (*Data Augmentation*) en el directorio `Modelo/data/processed/`.

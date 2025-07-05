import type { IndexItem } from '@/lib/types';

export const bookIndex: IndexItem[] = [
  {
    "id": "1",
    "title": "1 · Introducción — 17",
    "children": [
      { "id": "1.1", "title": "¿Qué es el procesamiento digital de imágenes? — 18" },
      { "id": "1.2", "title": "Orígenes del procesamiento digital de imágenes — 19" },
      { "id": "1.3", "title": "Ejemplos de campos que utilizan el procesamiento digital de imágenes — 23" },
      { "id": "1.4", "title": "Pasos fundamentales en el procesamiento digital de imágenes — 41" },
      { "id": "1.5", "title": "Componentes de un sistema de procesamiento de imágenes — 44" }
    ]
  },
  {
    "id": "2",
    "title": "2 · Fundamentos de la imagen digital — 47",
    "children": [
      { "id": "2.1", "title": "Elementos de la percepción visual — 48" },
      { "id": "2.2", "title": "Luz y espectro electromagnético — 54" },
      { "id": "2.3", "title": "Captación y adquisición de imágenes — 57" },
      { "id": "2.4", "title": "Muestreo y cuantización de imágenes — 63" },
      { "id": "2.5", "title": "Algunas relaciones básicas entre píxeles — 79" },
      { "id": "2.6", "title": "Introducción a las herramientas matemáticas básicas utilizadas en el procesamiento digital de imágenes — 83" }
    ]
  },
  {
    "id": "3",
    "title": "3 · Transformaciones de intensidad y filtrado espacial — 119",
    "children": [
      { "id": "3.1", "title": "Antecedentes — 120" },
      { "id": "3.2", "title": "Algunas funciones básicas de transformación de intensidad — 122" },
      { "id": "3.3", "title": "Procesamiento de histogramas — 133" },
      { "id": "3.4", "title": "Fundamentos del filtrado espacial — 153" },
      { "id": "3.5", "title": "Suavizado: filtros espaciales pasa-bajas — 164" },
      { "id": "3.6", "title": "Realce: filtros espaciales pasa-altas — 175" },
      { "id": "3.7", "title": "Filtros pasa-altas, rechaza-banda y pasa-banda a partir de filtros pasa-bajas — 188" },
      { "id": "3.8", "title": "Combinación de métodos de mejora espacial — 191" }
    ]
  },
  {
    "id": "4",
    "title": "4 · Filtrado en el dominio de la frecuencia — 203",
    "children": [
      { "id": "4.1", "title": "Antecedentes — 204" },
      { "id": "4.2", "title": "Conceptos preliminares — 207" },
      { "id": "4.3", "title": "Muestreo y la transformada de Fourier de funciones muestreadas — 215" },
      { "id": "4.4", "title": "La transformada discreta de Fourier de una variable — 225" },
      { "id": "4.5", "title": "Extensiones a funciones de dos variables — 230" },
      { "id": "4.6", "title": "Algunas propiedades de la DFT e IDFT 2-D — 240" },
      { "id": "4.7", "title": "Fundamentos del filtrado en el dominio de la frecuencia — 260" },
      { "id": "4.8", "title": "Suavizado de imágenes usando filtros pasa-bajas en el dominio de la frecuencia — 272" },
      { "id": "4.9", "title": "Realce de imágenes usando filtros pasa-altas — 284" },
      { "id": "4.10", "title": "Filtrado selectivo — 296" },
      { "id": "4.11", "title": "La transformada rápida de Fourier — 303" }
    ]
  },
  {
    "id": "5",
    "title": "5 · Restauración y reconstrucción de imágenes — 317",
    "children": [
      { "id": "5.1", "title": "Un modelo del proceso de degradación/restauración de imágenes — 318" },
      { "id": "5.2", "title": "Modelos de ruido — 318" },
      { "id": "5.3", "title": "Restauración en presencia únicamente de ruido — filtrado espacial — 327" },
      { "id": "5.4", "title": "Reducción de ruido periódico mediante filtrado en el dominio de la frecuencia — 340" },
      { "id": "5.5", "title": "Degradaciones lineales e invariantes a la posición — 348" },
      { "id": "5.6", "title": "Estimación de la función de degradación — 352" },
      { "id": "5.7", "title": "Filtrado inverso — 356" },
      { "id": "5.8", "title": "Filtrado de error cuadrático medio mínimo (Wiener) — 358" },
      { "id": "5.9", "title": "Filtrado de mínimos cuadrados restringido — 363" },
      { "id": "5.10", "title": "Filtro de media geométrica — 367" },
      { "id": "5.11", "title": "Reconstrucción de imágenes a partir de proyecciones — 368" }
    ]
  },
  {
    "id": "6",
    "title": "6 · Procesamiento de imágenes en color — 399",
    "children": [
      { "id": "6.1", "title": "Fundamentos del color — 400" },
      { "id": "6.2", "title": "Modelos de color — 405" },
      { "id": "6.3", "title": "Procesamiento de imágenes pseudo-color — 420" },
      { "id": "6.4", "title": "Fundamentos del procesamiento de imágenes a color completo — 429" },
      { "id": "6.5", "title": "Transformaciones de color — 430" },
      { "id": "6.6", "title": "Suavizado y realce de imágenes en color — 442" },
      { "id": "6.7", "title": "Uso del color en la segmentación de imágenes — 445" },
      { "id": "6.8", "title": "Ruido en imágenes a color — 452" },
      { "id": "6.9", "title": "Compresión de imágenes en color — 455" }
    ]
  },
  {
    "id": "7",
    "title": "7 · Ondículas y otras transformadas de imagen — 463",
    "children": [
      { "id": "7.1", "title": "Preliminares — 464" },
      { "id": "7.2", "title": "Transformadas basadas en matrices — 466" },
      { "id": "7.3", "title": "Correlación — 478" },
      { "id": "7.4", "title": "Funciones base en el plano tiempo-frecuencia — 479" },
      { "id": "7.5", "title": "Imágenes base — 483" },
      { "id": "7.6", "title": "Transformadas relacionadas con Fourier — 484" },
      { "id": "7.7", "title": "Transformadas Walsh-Hadamard — 496" },
      { "id": "7.8", "title": "Transformada Slant — 500" },
      { "id": "7.9", "title": "Transformada de Haar — 502" },
      { "id": "7.10", "title": "Transformadas de ondículas (wavelets) — 504" }
    ]
  },
  {
    "id": "8",
    "title": "8 · Compresión de imágenes y marca de agua — 539",
    "children": [
      { "id": "8.1", "title": "Fundamentos — 540" },
      { "id": "8.2", "title": "Codificación Huffman — 553" },
      { "id": "8.3", "title": "Codificación Golomb — 556" },
      { "id": "8.4", "title": "Codificación aritmética — 561" },
      { "id": "8.5", "title": "Codificación LZW — 564" },
      { "id": "8.6", "title": "Codificación por longitud de carrera — 566" },
      { "id": "8.7", "title": "Codificación basada en símbolos — 572" },
      { "id": "8.8", "title": "Codificación por planos de bits — 575" },
      { "id": "8.9", "title": "Codificación por transformada por bloques — 576" },
      { "id": "8.10", "title": "Codificación predictiva — 594" },
      { "id": "8.11", "title": "Codificación wavelet — 614" },
      { "id": "8.12", "title": "Marca de agua en imágenes digitales — 624" }
    ]
  },
  {
    "id": "9",
    "title": "9 · Procesamiento morfológico de imágenes — 635",
    "children": [
      { "id": "9.1", "title": "Preliminares — 636" },
      { "id": "9.2", "title": "Erosión y dilatación — 638" },
      { "id": "9.3", "title": "Apertura y cierre — 644" },
      { "id": "9.4", "title": "Transformada hit-or-miss — 648" },
      { "id": "9.5", "title": "Algunos algoritmos morfológicos básicos — 652" },
      { "id": "9.6", "title": "Reconstrucción morfológica — 667" },
      { "id": "9.7", "title": "Resumen de operaciones morfológicas en imágenes binarias — 673" },
      { "id": "9.8", "title": "Morfología en escala de grises — 674" }
    ]
  },
  {
    "id": "10",
    "title": "10 · Segmentación de imágenes — 699",
    "children": [
      { "id": "10.1", "title": "Fundamentos — 700" },
      { "id": "10.2", "title": "Detección de puntos, líneas y bordes — 701" },
      { "id": "10.3", "title": "Umbralización — 742" },
      { "id": "10.4", "title": "Segmentación por crecimiento de regiones y por división y fusión de regiones — 764" },
      { "id": "10.5", "title": "Segmentación de regiones mediante agrupamiento y superpíxeles — 770" },
      { "id": "10.6", "title": "Segmentación de regiones mediante cortes de grafos — 777" },
      { "id": "10.7", "title": "Segmentación mediante cuencas morfológicas — 786" },
      { "id": "10.8", "title": "Uso del movimiento en la segmentación — 796" }
    ]
  },
  {
    "id": "11",
    "title": "11 · Extracción de características — 811",
    "children": [
      { "id": "11.1", "title": "Antecedentes — 812" },
      { "id": "11.2", "title": "Preprocesamiento de contornos — 814" },
      { "id": "11.3", "title": "Descriptores de características de contorno — 831" },
      { "id": "11.4", "title": "Descriptores de características de región — 840" },
      { "id": "11.5", "title": "Componentes principales como descriptores de características — 859" },
      { "id": "11.6", "title": "Características de la imagen completa — 868" },
      { "id": "11.7", "title": "Transformada de características invariantes a escala (SIFT) — 881" }
    ]
  },
  {
    "id": "12",
    "title": "12 · Clasificación de patrones de imagen — 903",
    "children": [
      { "id": "12.1", "title": "Antecedentes — 904" },
      { "id": "12.2", "title": "Patrones y clases de patrones — 906" },
      { "id": "12.3", "title": "Clasificación de patrones por comparación de prototipos — 910" },
      { "id": "12.4", "title": "Clasificadores estadísticos óptimos (Bayes) — 923" },
      { "id": "12.5", "title": "Redes neuronales y aprendizaje profundo — 931" },
      { "id": "12.6", "title": "Redes neuronales convolucionales profundas — 964" },
      { "id": "12.7", "title": "Algunos detalles adicionales de implementación — 987" }
    ]
  }
];

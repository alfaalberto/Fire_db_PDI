import type { IndexItem } from './types';

// Helper function to create unique IDs for nested items
const createUniqueIds = (items: IndexItem[], parentId = ''): IndexItem[] => {
  return items.map(item => {
    // Sanitize title to create a more readable ID part
    const idPart = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueId = parentId ? `${parentId}-${idPart}` : item.id; // Keep original top-level IDs if they are clean
    
    const newItem: IndexItem = {
      ...item,
      id: uniqueId,
    };
    
    if (item.children) {
      newItem.children = createUniqueIds(item.children, uniqueId);
    }
    
    return newItem;
  });
};

const originalIndex: IndexItem[] = [
  {
    id: 'revision-matrices-vectores',
    title: 'a. Revisión de Matrices y Vectores',
    children: [],
  },
  {
    id: 'revision-probabilidad-variables-aleatorias',
    title: 'b. Revisión de Probabilidad y Variables Aleatorias',
    children: [
      { id: 'momentos-valor-esperado', title: 'b.1 Momentos y Valor Esperado' },
      { id: 'funcion-densidad-gaussiana', title: 'b.2 Función de densidad de probabilidad Gaussiana' },
      { id: 'varias-variables-aleatorias', title: 'b.3 Varias variables aleatorias' },
      { id: 'densidad-gaussiana-multivariable', title: 'b.4 Densidad Gaussiana Multivariable' },
      { id: 'transformaciones-lineales-variables-aleatorias', title: 'b.5 Transformaciones lineales de variables aleatorias' },
    ],
  },
  {
    id: 'revision-sistemas-lineales',
    title: 'c. Revisión de Sistemas Lineales',
    children: [],
  },
  {
    id: 'introduccion',
    title: '1. Introducción',
    children: [
      { id: 'introduccion-1', title: 'Orígenes del PDI' },
      { id: 'introduccion-2', title: 'Ejemplos de Aplicación' },
      { id: 'introduccion-3', title: 'Componentes de un Sistema de PDI' },
    ],
  },
  {
    id: 'fundamentos',
    title: '2. Fundamentos de la Imagen Digital',
    children: [
        { id: 'fundamentos-1', title: 'Elementos de Percepción Visual' },
        { id: 'fundamentos-2', title: 'Muestreo y Cuantización' },
        { id: 'fundamentos-3', title: 'Relaciones entre Píxeles' },
        { id: 'fundamentos-4', title: 'Introduction to the Basic Mathematical Tools Used in Digital Image Processing' },
    ],
  },
  {
    id: 'transformaciones',
    title: '3. Transformaciones de Intensidad',
    children: [
      { id: 'background', title: 'Background' },
      { id: 'some-basic-intensity-transformation-functions', title: 'Some Basic Intensity Transformation Functions' },
      { id: 'histogram-processing', title: 'Histogram Processing' },
      { id: 'fundamentals-of-spatial-filtering', title: 'Fundamentals of Spatial Filtering' },
      { id: 'smoothing-lowpass-spatial-filters', title: 'Smoothing (Lowpass) Spatial Filters' },
      { id: 'sharpening-highpass-spatial-filters', title: 'Sharpening (Highpass) Spatial Filters' },
      { id: 'highpass-bandreject-and-bandpass-filters-from-lowpass-filters', title: 'Highpass, Bandreject, and Bandpass Filters from Lowpass Filters' },
      { id: 'combining-spatial-enhancement-methods', title: 'Combining Spatial Enhancement Methods' },
    ],
  },
  {
    id: 'filtrado-frecuencia',
    title: '4. Filtrado en el Dominio de la Frecuencia',
    children: [
      { id: 'background', title: 'Background' },
      { id: 'preliminary-concepts', title: 'Preliminary Concepts' },
      { id: 'sampling-and-the-fourier-transform-of-sampled-functions', title: 'Sampling and the Fourier Transform of Sampled Functions' },
      { id: 'the-discrete-fourier-transform-of-one-variable', title: 'The Discrete Fourier Transform of One Variable' },
      { id: 'extensions-to-functions-of-two-variables', title: 'Extensions to Functions of Two Variables' },
      { id: 'some-properties-of-the-2-d-dft-and-idft', title: 'Some Properties of the 2-D DFT and IDFT' },
      { id: 'the-basics-of-filtering-in-the-frequency-domain', title: 'The Basics of Filtering in the Frequency Domain' },
      { id: 'image-smoothing-using-lowpass-frequency-domain-filters', title: 'Image Smoothing Using Lowpass Frequency Domain Filters' },
      { id: 'image-sharpening-using-highpass-filters', title: 'Image Sharpening Using Highpass Filters' },
      { id: 'selective-filtering', title: 'Selective Filtering' },
      { id: 'the-fast-fourier-transform', title: 'The Fast Fourier Transform' },
    ],
  },
  {
    id: 'restauracion',
    title: '5. Restauración y Reconstrucción de Imágenes',
    children: [
      { id: 'a-model-of-the-image-degradation-restoration-process', title: 'A Model of the Image Degradation/Restoration process' },
      { id: 'noise-models', title: 'Noise Models' },
      { id: 'restoration-in-the-presence-of-noise-onlyspatial-filtering', title: 'Restoration in the Presence of Noise Only—Spatial Filtering' },
      { id: 'periodic-noise-reduction-using-frequency-domain-filtering', title: 'Periodic Noise Reduction Using Frequency Domain Filtering' },
      { id: 'linear-position-invariant-degradations', title: 'Linear, Position-Invariant Degradations' },
      { id: 'estimating-the-degradation-function', title: 'Estimating the Degradation Function' },
      { id: 'inverse-filtering', title: 'Inverse Filtering' },
      { id: 'minimum-mean-square-error-wiener-filtering', title: 'Minimum Mean Square Error (Wiener) Filtering' },
      { id: 'constrained-least-squares-filtering', title: 'Constrained Least Squares Filtering' },
      { id: 'geometric-mean-filter', title: 'Geometric Mean Filter' },
      { id: 'image-reconstruction-from-projections', title: 'Image Reconstruction from Projections' },
    ],
  },
  {
    id: 'procesamiento-color',
    title: '6. Procesamiento de Imágenes en Color',
    children: [
      { id: 'color-fundamentals', title: 'Color Fundamentals' },
      { id: 'color-models', title: 'Color Models' },
      { id: 'pseudocolor-image-processing', title: 'Pseudocolor Image Processing' },
      { id: 'basics-of-full-color-image-processing', title: 'Basics of Full-Color Image Processing' },
      { id: 'color-transformations', title: 'Color Transformations' },
      { id: 'color-image-smoothing-and-sharpening', title: 'Color Image Smoothing and Sharpening' },
      { id: 'using-color-in-image-segmentation', title: 'Using Color in Image Segmentation' },
      { id: 'noise-in-color-images', title: 'Noise in Color Images' },
      { id: 'color-image-compression', title: 'Color Image Compression' },
    ],
  },
  {
    id: 'ondiculas',
    title: '7. Ondículas y Otras Transformadas',
    children: [
      { id: 'preliminaries', title: 'Preliminaries' },
      { id: 'matrix-based-transforms', title: 'Matrix-based Transforms' },
      { id: 'correlation', title: 'Correlation' },
      { id: 'basis-functions-in-the-time-frequency-plane', title: 'Basis Functions in the Time-Frequency Plane' },
      { id: 'basis-images', title: 'Basis Images' },
      { id: 'fourier-related-transforms', title: 'Fourier-Related Transforms' },
      { id: 'walsh-hadamard-transforms', title: 'Walsh-Hadamard Transforms' },
      { id: 'slant-transform', title: 'Slant Transform' },
      { id: 'haar-transform', title: 'Haar Transform' },
      { id: 'wavelet-transforms', title: 'Wavelet Transforms' },
    ],
  },
  {
    id: 'compresion',
    title: '8. Compresión de Imágenes',
    children: [
      { id: 'fundamentals', title: 'Fundamentals' },
      { id: 'huffman-coding', title: 'Huffman Coding' },
      { id: 'golomb-coding', title: 'Golomb Coding' },
      { id: 'arithmetic-coding', title: 'Arithmetic Coding' },
      { id: 'lzw-coding', title: 'LZW Coding' },
      { id: 'run-length-coding', title: 'Run-length Coding' },
      { id: 'symbol-based-coding', title: 'Symbol-based Coding' },
      { id: 'bit-plane-coding', title: 'Bit-plane Coding' },
      { id: 'block-transform-coding', title: 'Block Transform Coding' },
      { id: 'predictive-coding', title: 'Predictive Coding' },
      { id: 'wavelet-coding', title: 'Wavelet Coding' },
      { id: 'digital-image-watermarking', title: 'Digital Image Watermarking' },
    ],
  },
  {
    id: 'morfologico',
    title: '9. Procesamiento Morfológico',
    children: [
      { id: 'preliminaries', title: 'Preliminaries' },
      { id: 'erosion-and-dilation', title: 'Erosion and Dilation' },
      { id: 'opening-and-closing', title: 'Opening and Closing' },
      { id: 'the-hitor-miss-transform', title: 'The Hit-or-Miss Transform' },
      { id: 'some-basic-morphological-algorithms', title: 'Some Basic Morphological Algorithms' },
      { id: 'morphological-reconstruction', title: 'Morphological Reconstruction' },
      { id: 'summary-of-morphological-operations-on-binary-images', title: 'Summary of Morphological Operations on Binary Images' },
      { id: 'grayscale-morphology', title: 'Grayscale Morphology' },
    ],
  },
  {
    id: 'segmentacion',
    title: '10. Segmentación de Imágenes',
    children: [
      { id: 'fundamentals', title: 'Fundamentals' },
      { id: 'point-line-and-edge-detection', title: 'Point, Line, and Edge Detection' },
      { id: 'thresholding', title: 'Thresholding' },
      { id: 'segmentation-by-region-growing-and-by-region-splitting-andmerging', title: 'Segmentation by Region Growing and by Region Splitting and Merging' },
      { id: 'region-segmentation-using-clustering-andsuperpixels', title: 'Region Segmentation Using Clustering and Superpixels' },
      { id: 'region-segmentation-using-graph-cuts', title: 'Region Segmentation Using Graph Cuts' },
      { id: 'segmentation-using-morphological-watersheds', title: 'Segmentation Using Morphological Watersheds' },
      { id: 'the-use-of-motion-in-segmentation', title: 'The Use of Motion in Segmentation' },
    ],
  },
  {
    id: 'extraccion-caracteristicas',
    title: '11. Feature Extraction',
    children: [
      { id: 'background', title: 'Background' },
      { id: 'boundary-preprocessing', title: 'Boundary Preprocessing' },
      { id: 'boundary-feature-descriptors', title: 'Boundary Feature Descriptors' },
      { id: 'region-feature-descriptors', title: 'Region Feature Descriptors' },
      { id: 'principal-components-as-feature-descriptors', title: 'Principal Components as Feature Descriptors' },
      { id: 'whole-image-features', title: 'Whole-Image Features' },
      { id: 'scale-invariant-feature-transform-sift', title: 'Scale-Invariant Feature Transform (SIFT)' },
    ],
  },
  {
    id: 'clasificacion-patrones',
    title: '12. Image Pattern Classification',
    children: [
      { id: 'background', title: 'Background' },
      { id: 'patterns-and-pattern-classes', title: 'Patterns and Pattern Classes' },
      { id: 'pattern-classification-by-prototype-matching', title: 'Pattern Classification by Prototype Matching' },
      { id: 'optimum-bayes-statistical-classifiers', title: 'Optimum (Bayes) Statistical Classifiers' },
      { id: 'neural-networks-and-deep-learning', title: 'Neural Networks and Deep Learning' },
      { id: 'deep-convolutional-neural-networks', title: 'Deep Convolutional Neural Networks' },
      { id: 'some-additional-details-of-implementation', title: 'Some Additional Details of Implementation' },
    ],
  },
];

// We make sure all IDs are unique before exporting
export const INDEX: IndexItem[] = createUniqueIds(originalIndex);

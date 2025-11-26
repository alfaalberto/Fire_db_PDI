import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const BASE_PROMPT = `Renderiza completamente las diapositivas de entrada preservando TODA la información visual, textual y matemática, sobre todo en las ecuaciones para que no se vean mal estructuradas ni acomodadas. Enriquece, completa, corrige y mejora el HTML para lograr una presentación profesional de nivel académico, añadiendo simulaciones, animaciones e interactividad cuando aporten valor. Corrige cualquier representación en bruto (por ejemplo, fórmulas LaTeX visibles como texto) para que se rendericen correctamente. No uses mermaid.

ENTRADA
{{HTML_INPUT}}

ALCANCE Y REQUISITOS ESTRICTOS
1) Conservación total del contenido:
   - Mantén figuras, tablas, ecuaciones, leyendas, notas al pie, referencias, numeraciones y jerarquía de títulos.
   - No omitas contenido; si algo falta o es ambiguo, márcalo con un comentario HTML <!-- TODO: aclarar -->.

2) Renderizado matemático y científico:
   - Convierte todo el LaTeX a ecuaciones renderizadas (MathJax o KaTeX). Las ecuaciones NO deben verse como texto plano.
   - Asegura numeración de ecuaciones, referencias cruzadas y alineación adecuada (display/inline).
   - Si hay diagramas de flujo o gráficos de funciones, NO uses Mermaid.js/D3.js/Chart.js, usa otro software en su lugar.

3) Estilo visual académico y consistente:
   - Usa TailwindCSS (o clases utilitarias equivalentes) para un diseño limpio, tipografía legible (ej. Inter/Montserrat/Roboto), espaciados generosos, grid responsivo y buen contraste.
   - Siempre en modo oscuro con preferencia del sistema.
   - Componente de “Figura X: Título” y “Tabla X: Título” con estilo uniforme y posibilidad de zoom modal.

4) Interactividad y simulaciones:
   - Añade controles (sliders, switches, dropdowns) para experimentar parámetros clave (p.ej., frecuencia de muestreo, ganancia, gamma, ruido, tamaño de kernel).
   - Gráficas interactivas (Chart.js o D3) con tooltips, leyendas y actualización en vivo según los controles.
   - Animaciones sutiles (Framer Motion o CSS transitions) sin distraer: entrada de secciones, hover en tarjetas, deslizamiento en acordeones.
   - Si aplica, agrega una demo/simulación mínima reproducible (p.ej., filtro paso bajo, ajuste de contraste, convolución simple, FFT/DFT de señal corta), con código claro y seguro.

5) Accesibilidad (A11y):
   - Semantic HTML5 (header/nav/main/section/figure/figcaption/table/thead/tbody).
   - Navegación por teclado (tabindex ordenado, focus states visibles).
   - ARIA labels/roles cuando sean necesarios.
   - Texto alternativo detallado en imágenes y contraste AA mínimo.

6) Tablas y figuras:
   - Tablas responsivas con cabeceras sticky, rayado sutil y scroll horizontal en pantallas pequeñas.
   - Figuras con zoom modal y opción de descarga si es contenido estático.
   - Si hay fórmulas dentro de tablas, asegúrate que no se rompa el layout.

7) Código y estructura:
   - Un solo archivo HTML autosuficiente o una estructura mínima (index.html + /assets si conviene). Incluye comentarios claros.
   - JS moderno sin dependencias innecesarias. Evita bibliotecas pesadas si no aportan valor. Modulariza funciones (p.ej., initMath(), initCharts(), bindControls()).
   - Incluye un bloque <style>/Tailwind utilities o import de CDN optimizado.

8) Rendimiento:
   - Carga diferida (defer) de scripts, evita bloqueos del render.
   - Solo las bibliotecas necesarias. Si KaTeX es suficiente, no cargues MathJax simultáneamente.
   - Imágenes optimizadas (dimensiones, loading="lazy", decoding="async").

9) Contenido multidiapositiva (si aplica):
   - Añade navegación (sidebar o top tabs) con estado activo.
   - Progreso visual (p.ej., barra o numeración “3/12”).

10) Validación y coherencia:
   - Corrige errores tipográficos/diacríticos menores y normaliza comillas, guiones, espaciados.
   - Revisa que listas, ecuaciones, referencias y numeraciones sean consistentes.
   - Todo ícono o gráfico debe tener propósito didáctico.

MEJORAS “DE LA CASA”
- Incluye un componente de “Experimento rápido” con parámetros ajustables y resultados visibles al instante.
- Agrega un botón “Mostrar/ocultar derivación” para pasos matemáticos largos.
- Añade un componente “Comparar antes/después” para imágenes o señales (slider de comparación).
- Provee un botón “Copiar código” en fragmentos (Prism.js para resaltado).
- Si hay procesos, agrega un diagrama: flujo, secuencia o relaciones.

ENTREGABLES
- HTML final listo para abrir en el navegador, con:
  a) Encabezado SEO básico (title/description/opengraph).
  b) Enlaces/Importaciones a CDN (Tailwind, MathJax/KaTeX, Chart.js/D3, Prism) SOLO si se usan.
  c) Scripts inicializadores (init*) bien comentados.
  d) Toggle de tema, accesibilidad y responsividad comprobadas.
- (Opcional) Carpeta /assets con imágenes/JSON de datos si las usas.

FORMATO DE SALIDA
1) Resumen breve (5–8 líneas) explicando mejoras realizadas.
2) Código HTML completo (producción) dentro de un único bloque, listo para copy-paste.
3) Lista de “Checks finales” marcada (✔) para que yo verifique rápidamente:
   - ✔ Todo LaTeX se renderiza.
   - ✔ Simulaciones funcionales y sin errores en consola.
   - ✔ Tablas/figuras responsivas.
   - ✔ Navegación accesible por teclado.
   - ✔ Modo oscuro y contraste AA.
   - ✔ No hay contenido perdido u oculto.
   - ✔ Peso de página razonable y scripts en defer.

REGLAS DE CALIDAD
- Claridad sobre creatividad: prioriza legibilidad, alineación y jerarquía visual.
- Animaciones discretas ≤300ms. Evita parpadeos o autoplay estridente.
- Comentarios útiles en secciones complejas. Nombres de funciones y clases autoexplicativos.

SI FALTA INFORMACIÓN
- No inventes datos. Usa placeholders con etiquetas claras y comentarios TODO.
- Mantén el armazón funcional para que yo solo reemplace el contenido faltante.

PRODUCE AHORA el resultado siguiendo todo lo anterior.
`;

export async function POST(req: NextRequest) {
  try {
    const { htmlContent } = await req.json();
    if (typeof htmlContent !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set. Returning original HTML.');
      return NextResponse.json({ improvedHtml: htmlContent });
    }

    const fullPrompt = BASE_PROMPT.replace('{{HTML_INPUT}}', htmlContent);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return NextResponse.json({ improvedHtml: htmlContent });
    }

    const data = await response.json();
    const improvedHtml = data.choices?.[0]?.message?.content?.trim();

    if (!improvedHtml) {
      return NextResponse.json({ improvedHtml: htmlContent });
    }

    return NextResponse.json({ improvedHtml });
  } catch (e) {
    console.error('Error in /api/improve-chatgpt:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

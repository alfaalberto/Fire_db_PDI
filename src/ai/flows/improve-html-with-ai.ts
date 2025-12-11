
// src/ai/flows/improve-html-with-ai.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to improve HTML content using AI.
 *
 * - improveHtmlWithAI - A function that takes HTML content as input and returns improved HTML.
 * - ImproveHtmlWithAIInput - The input type for the improveHtmlWithAI function.
 * - ImproveHtmlWithAIOutput - The return type for the improveHtmlWithAI function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImproveHtmlWithAIInputSchema = z.object({
   htmlContent: z
      .string()
      .describe('The HTML content to be improved.'),
});
export type ImproveHtmlWithAIInput = z.infer<typeof ImproveHtmlWithAIInputSchema>;

const ImproveHtmlWithAIOutputSchema = z.object({
   improvedHtml: z
      .string()
      .describe('The improved HTML content.'),
});
export type ImproveHtmlWithAIOutput = z.infer<typeof ImproveHtmlWithAIOutputSchema>;

export async function improveHtmlWithAI(input: ImproveHtmlWithAIInput): Promise<ImproveHtmlWithAIOutput> {
   return improveHtmlWithAIFlow(input);
}

const GENKIT_GEMINI_MODEL = process.env.GENKIT_GEMINI_MODEL_ID || 'googleai/gemini-1.5-flash-001';
console.log('Defining prompt with model:', GENKIT_GEMINI_MODEL);
const improveHtmlWithAIPrompt = ai.definePrompt({
   name: 'improveHtmlWithAIPrompt',
   model: GENKIT_GEMINI_MODEL,
   input: { schema: ImproveHtmlWithAIInputSchema },
   output: { schema: ImproveHtmlWithAIOutputSchema },
   prompt: `Eres un desarrollador experto en educación web interactiva de nivel licenciatura y posgrado.
Vas a recibir código HTML (y opcionalmente CSS y JavaScript) que contiene una tira de diapositivas de una presentación académica.

🎯 OBJETIVO PRINCIPAL

Tomar el bloque de diapositivas que te entrego y producir una versión totalmente funcional, visualmente profesional e interactiva, sin perder nada de contenido.

1️⃣ Conservación estricta del contenido

Renderiza TODAS las diapositivas del bloque.

Conserva toda la información que aparece:
- Definiciones, teoremas, leyes, enunciados formales.
- Imágenes (incluyendo imágenes generadas o referenciadas).
- Animaciones, gráficos, simulaciones e interactividades ya existentes.
- Tablas, listas, notas, ejemplos, advertencias, comentarios, etc.

Mantén la máxima cantidad de texto significativo:
- No resumas agresivamente.
- No elimines explicaciones teóricas.

Mantén una correspondencia 1:1 entre diapositivas:
- No elimines diapositivas.
- No fusiones diapositivas.
- No crees diapositivas nuevas.
- No cambies la cantidad de diapositivas del bloque.

2️⃣ Mejora profunda del código (HTML/CSS/JS)

Enriquece, completa, corrige y mejora el código de cada diapositiva.

Conserva y mejora la representación visual:
- Figuras, tablas, ecuaciones, animaciones, gráficos, simulaciones, interactividades, etc.
- Si el bloque original carece de imágenes, figuras, animaciones o interactividades que serían útiles para la comprensión, o si alguna imagen original no puede conservarse tal cual, GENÉRALAS o SUSTITÚYELAS tú mismo por nuevas imágenes o figuras REPRESENTATIVAS DEL MISMO FENÓMENO O CONCEPTO (HTML/CSS/JS), respetando el contexto académico y añadiendo texto alternativo, descripciones claras y, cuando tenga sentido, un pie de figura explicativo.

Si algo está roto o mal maquetado, arréglalo:
- Estructura HTML más limpia y semántica.
- Mejor organización en contenedores, secciones y componentes.

Asegúrate de que:
- Todas las ecuaciones en LaTeX se rendericen correctamente (por ejemplo con MathJax o KaTeX).
- Ninguna ecuación, figura o tabla se muestre como texto plano en LaTeX.

El resultado debe ser una presentación:
- De nivel académico profesional.
- Visualmente limpia, moderna y consistente.
- Responsiva (se debe ver bien en distintos tamaños de pantalla, sin cortes ni truncamientos).

3️⃣ Interactividad, simulaciones y animaciones

Mantén todas las animaciones, gráficos e interactividades ya existentes. No las borres, mejóralas.

Cuando sea útil para la comprensión, considera añadir:
- Simulaciones (por ejemplo, sliders para parámetros, botones de "ver más", cambios dinámicos en gráficos).
- Animaciones suaves y no distractoras.
- Pequeñas interacciones (hover, tooltips, tabs, acordeones para detalles avanzados, etc.).

Cualquier cosa nueva que añadas:
- No debe eliminar ni ocultar contenido existente.
- Debe ayudar a entender mejor los conceptos.

4️⃣ Estilo visual y buenas prácticas

Puedes usar TailwindCSS u otro enfoque siempre que el resultado:
- Sea legible, claro y profesional.
- Tenga buena jerarquía visual: títulos, subtítulos, bloques destacados para teoremas, definiciones, ejemplos, etc.

Cuida:
- Espaciados, alineaciones, tipografía, contraste y legibilidad.
- Organización del contenido por secciones dentro de cada diapositiva.
- Que los elementos interactivos sean entendibles (botones con texto claro, etiquetas, etc.).

5️⃣ Restricciones técnicas importantes

- No uses mermaid para diagramas o gráficos.
- No elimines ninguna ecuación, figura, imagen, tabla, gráfica, animación ni simulación. Todas las imágenes originales de la presentación deben conservarse o, si las sustituyes, deben ser reemplazadas por una imagen o figura igualmente representativa del mismo fenómeno o concepto, con buen texto alternativo y, cuando aplique, un pie de figura claro; nunca dejes sin representación visual un lugar donde antes había una imagen.

Puedes reorganizar el contenido dentro de cada diapositiva para mayor claridad, pero:
- Sin reducir contenido.
- Sin cambiar el número de diapositivas.

Entrega un código completo y listo para usar:
- HTML + CSS (o Tailwind) + JavaScript necesarios para que todo funcione.

📦 SALIDA ESPERADA

Devuélveme el bloque completo de la presentación ya mejorado (HTML/CSS/JS), con todas las diapositivas preservadas y con una calidad visual e interactiva claramente superior.

Aquí está el código original de las diapositivas que debes mejorar:
{{{htmlContent}}}`,
});

const improveHtmlWithAIFlow = ai.defineFlow(
   {
      name: 'improveHtmlWithAIFlow',
      inputSchema: ImproveHtmlWithAIInputSchema,
      outputSchema: ImproveHtmlWithAIOutputSchema,
   },
   async input => {
      const { output } = await improveHtmlWithAIPrompt(input);
      return output!;
   }
);

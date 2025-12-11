import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL_ID || 'gpt-4o-mini';

const BASE_PROMPT = `Eres un desarrollador experto en educación web interactiva de nivel licenciatura y posgrado.
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

Si el usuario proporciona instrucciones adicionales específicas, debes seguirlas con alta prioridad siempre que no contradigan las reglas anteriores.

INSTRUCCIONES ADICIONALES DEL USUARIO (si existen):
"""
{{USER_INSTRUCTIONS}}
"""

Aquí está el código original de las diapositivas que debes mejorar:
{{HTML_INPUT}}`;

export async function POST(req: NextRequest) {
  try {
    const { htmlContent, userInstructions } = await req.json();
    if (typeof htmlContent !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set.');
      return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }

    const safeUserInstructions =
      typeof userInstructions === 'string' && userInstructions.trim().length > 0
        ? userInstructions.trim()
        : 'Sin instrucciones adicionales específicas. Usa únicamente las reglas generales anteriores.';

    const fullPrompt = BASE_PROMPT
      .replace('{{HTML_INPUT}}', htmlContent)
      .replace('{{USER_INSTRUCTIONS}}', safeUserInstructions);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
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
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      let message = `OpenAI API error: ${response.status}`;
      let code: string | undefined;
      try {
        const parsed = JSON.parse(errorText);
        const rawMsg = parsed?.error?.message as string | undefined;
        code = parsed?.error?.code as string | undefined;

        if (rawMsg) {
          message = rawMsg;
        }
      } catch {
        // ignore JSON parse errors, keep default message
      }

      // Intentar fallback a Gemini si no hay cuota en OpenAI
      if (response.status === 429 && code === 'insufficient_quota') {
        if (!GOOGLE_GENAI_API_KEY || process.env.NEXT_PUBLIC_ENABLE_AI !== 'true') {
          return NextResponse.json(
            {
              error:
                'Tu cuenta de OpenAI no tiene cuota disponible (insufficient_quota) y no hay configuración válida de Gemini (GOOGLE_GENAI_API_KEY).',
            },
            { status: 429 },
          );
        }

        try {
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
              GOOGLE_GENAI_API_KEY,
            )}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: fullPrompt }],
                  },
                ],
                generationConfig: { temperature: 0.3 },
              }),
            },
          );

          if (!geminiResponse.ok) {
            const geminiErrorText = await geminiResponse.text();
            console.error('Gemini fallback error:', geminiResponse.status, geminiErrorText);
            return NextResponse.json(
              {
                error: `Sin cuota en OpenAI y error al usar Gemini: ${geminiResponse.status}`,
              },
              { status: 500 },
            );
          }

          const geminiData = await geminiResponse.json();
          const geminiHtml = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

          if (!geminiHtml) {
            return NextResponse.json(
              { error: 'Sin cuota en OpenAI y Gemini no devolvió contenido.' },
              { status: 500 },
            );
          }

          return NextResponse.json({ improvedHtml: geminiHtml, provider: 'gemini-fallback' });
        } catch (e) {
          console.error('Gemini fallback exception:', e);
          return NextResponse.json(
            { error: 'Sin cuota en OpenAI y error al intentar usar Gemini como fallback.' },
            { status: 500 },
          );
        }
      }

      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = await response.json();
    const improvedHtml = data.choices?.[0]?.message?.content?.trim();

    if (!improvedHtml) {
      return NextResponse.json({ error: 'OpenAI returned no content.' }, { status: 500 });
    }

    return NextResponse.json({ improvedHtml });
  } catch (e) {
    console.error('Error in /api/improve-chatgpt:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

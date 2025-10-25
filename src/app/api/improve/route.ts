import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { htmlContent } = await req.json();
    if (typeof htmlContent !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_ENABLE_AI === 'true') {
      try {
        const mod = await import('@/ai/flows/improve-html-with-ai');
        const result = await mod.improveHtmlWithAI({ htmlContent });
        return NextResponse.json(result);
      } catch (e) {
        console.error('AI module unavailable, falling back:', e);
      }
    }

    return NextResponse.json({ improvedHtml: htmlContent });
  } catch (e) {
    console.error('Error in /api/improve:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

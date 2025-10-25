'use server';

import type { ImproveHtmlWithAIInput, ImproveHtmlWithAIOutput } from '@/ai/flows/improve-html-with-ai';

export async function improveHtmlWithAIAction(input: ImproveHtmlWithAIInput): Promise<ImproveHtmlWithAIOutput> {
  try {
    if (process.env.NEXT_PUBLIC_ENABLE_AI === 'true') {
      const mod = await import('@/ai/flows/improve-html-with-ai');
      return await mod.improveHtmlWithAI(input);
    }
  } catch (e) {
    console.error('AI disabled or unavailable, falling back. Error:', e);
  }
  return { improvedHtml: input.htmlContent };
}

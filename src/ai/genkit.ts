import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

console.log('Initializing Genkit with model:', 'googleai/gemini-1.5-flash-001');
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-001',
});

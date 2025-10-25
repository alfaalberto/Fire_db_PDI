import { loadAllSlidesFromDB, saveSlideToDB, deleteSlideFromDB } from '@/lib/db';

export type SlideDoc = { id: string; content: string[] | null };

// Simple in-memory cache with TTL
const cache = new Map<string, { value: SlideDoc[]; expires: number }>();
const CACHE_KEY = 'allSlides';
const TTL_MS = 30_000; // 30s

async function retry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const jitter = Math.random() * 100;
      await new Promise(res => setTimeout(res, baseDelayMs * Math.pow(2, i) + jitter));
    }
  }
  throw lastErr;
}

export async function loadAllSlidesCached(): Promise<SlideDoc[]> {
  const now = Date.now();
  const cached = cache.get(CACHE_KEY);
  if (cached && cached.expires > now) return cached.value;
  const value = await retry(() => loadAllSlidesFromDB());
  cache.set(CACHE_KEY, { value, expires: now + TTL_MS });
  return value;
}

export async function saveSlide(id: string, content: string[] | null): Promise<void> {
  await retry(() => saveSlideToDB(id, content));
  // Invalidate cache
  cache.delete(CACHE_KEY);
}

export async function deleteSlide(id: string): Promise<void> {
  await retry(() => deleteSlideFromDB(id));
  cache.delete(CACHE_KEY);
}

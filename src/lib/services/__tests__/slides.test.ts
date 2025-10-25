import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => {
  let store: { id: string; content: string[] | null }[] = [];
  return {
    loadAllSlidesFromDB: vi.fn(async () => store),
    saveSlideToDB: vi.fn(async (id: string, content: string[] | null) => {
      const i = store.findIndex(s => s.id === id);
      if (i >= 0) store[i].content = content; else store.push({ id, content });
    }),
    deleteSlideFromDB: vi.fn(async (id: string) => {
      store = store.filter(s => s.id !== id);
    }),
    __setStore: (v: typeof store) => { store = v; },
  };
});

import { loadAllSlidesCached, saveSlide, deleteSlide } from '../slides';
import * as db from '@/lib/db';

const setStore = (db as any).__setStore as (v: { id: string; content: string[] | null }[]) => void;

describe('slides service', () => {
  beforeEach(() => {
    setStore([]);
    // reset module cache to clear local cache map
    vi.resetModules();
  });

  it('loads and caches slides', async () => {
    setStore([{ id: 'a', content: ['x'] }]);
    const first = await loadAllSlidesCached();
    expect(first).toHaveLength(1);
    // Mutate underlying store; cached value should still be returned
    setStore([{ id: 'a', content: ['changed'] }]);
    const second = await loadAllSlidesCached();
    expect(second[0].content?.[0]).toBe('x');
  });

  it('invalidates cache after save', async () => {
    setStore([{ id: 'a', content: ['x'] }]);
    await loadAllSlidesCached();
    await saveSlide('a', ['y']);
    const after = await loadAllSlidesCached();
    expect(after[0].content?.[0]).toBe('y');
  });

  it('invalidates cache after delete', async () => {
    setStore([{ id: 'a', content: ['x'] }]);
    await loadAllSlidesCached();
    await deleteSlide('a');
    const after = await loadAllSlidesCached();
    expect(after).toHaveLength(0);
  });
});

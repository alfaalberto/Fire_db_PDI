"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      const swUrl = '/sw.js';
      const currentCacheName = 'pdi-cache-v2';
      (async () => {
        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(
              keys
                .filter((k) => k.startsWith('pdi-cache-') && k !== currentCacheName)
                .map((k) => caches.delete(k)),
            );
          }
          const reg = await navigator.serviceWorker.register(swUrl);
          try {
            await reg.update();
          } catch {}
        } catch {}
      })();
    }
  }, []);
  return null;
}

"use client";

import React from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <div className="max-w-lg w-full flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Ha ocurrido un error</h1>
        <p className="text-sm text-muted-foreground break-all">{error.message}</p>
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground" onClick={() => reset()}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

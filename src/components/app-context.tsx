"use client";

import { createContext, useContext } from 'react';

interface AppContextType {
  togglePresentationMode: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

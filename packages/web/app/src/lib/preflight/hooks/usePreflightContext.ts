import { createContext, useContext } from 'react';
import { PreflightObject } from './usePreflight';

const PreflightContext = createContext<PreflightObject | null>(null);

export const PreflightProvider = PreflightContext.Provider;

export function usePreflightContext() {
  const context = useContext(PreflightContext);
  if (context === null) {
    throw new Error('usePreflightContext must be used within PreflightProvider');
  }
  return context;
}

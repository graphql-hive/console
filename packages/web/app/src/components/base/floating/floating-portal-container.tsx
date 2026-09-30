import { createContext, useContext, type ReactNode } from 'react';

const FloatingPortalContainerContext = createContext<HTMLElement | null>(null);

export function FloatingPortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <FloatingPortalContainerContext.Provider value={container}>
      {children}
    </FloatingPortalContainerContext.Provider>
  );
}

export function useFloatingPortalContainer(): HTMLElement | null {
  return useContext(FloatingPortalContainerContext);
}

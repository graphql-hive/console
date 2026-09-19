import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ForwardedRef,
  type ReactNode,
} from 'react';

const FloatingPortalContainerContext = createContext<HTMLElement | null>(null);

/**
 * For an overlay that forwards a ref to its content element and also publishes that element as
 * the portal container. Returns the element for the provider and a callback ref that feeds both
 * it and the forwarded ref.
 */
export function usePortalContainerRef<T extends HTMLElement>(forwarded: ForwardedRef<T>) {
  const [container, setContainer] = useState<T | null>(null);
  const ref = useCallback(
    (node: T | null) => {
      setContainer(node);
      if (typeof forwarded === 'function') {
        forwarded(node);
      } else if (forwarded) {
        forwarded.current = node;
      }
    },
    [forwarded],
  );
  return [container, ref] as const;
}

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

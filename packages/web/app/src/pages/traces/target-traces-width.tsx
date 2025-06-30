import { createContext, FC, ReactNode, useCallback, useContext, useRef, useState } from 'react';

interface WidthSyncContextType {
  width: number;
  updateWidth: (newWidth: number) => void;
}

const WidthSyncContext = createContext<WidthSyncContextType | null>(null);

interface WidthSyncProviderProps {
  children: ReactNode;
  defaultWidth: number;
}

export const WidthSyncProvider: FC<WidthSyncProviderProps> = props => {
  const [width, setWidth] = useState<number>(props.defaultWidth);
  // Throttle state to avoid too many updates during slider dragging
  const throttleTimerRef = useRef<number | null>(null);

  // Ensure width stays within bounds and apply to all registered components
  const handleSetWidth = useCallback((newWidth: number) => {
    // Clear any existing throttle timer
    if (throttleTimerRef.current !== null) {
      window.cancelAnimationFrame(throttleTimerRef.current);
    }

    // Use requestAnimationFrame for smoother updates
    throttleTimerRef.current = window.requestAnimationFrame(() => {
      const boundedWidth = newWidth;
      setWidth(boundedWidth);

      throttleTimerRef.current = null;
    });
  }, []);

  return (
    <WidthSyncContext.Provider value={{ width, updateWidth: handleSetWidth }}>
      {props.children}
    </WidthSyncContext.Provider>
  );
};

export const useWidthSync = () => {
  const context = useContext(WidthSyncContext);
  if (!context) {
    throw new Error('useWidthSync must be used within a WidthSyncProvider');
  }
  return [context.width, context.updateWidth] as const;
};

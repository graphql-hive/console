import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';

type ListNavigationContextType = {
  isListNavCollapsed: boolean;
  setIsListNavCollapsed: (collapsed: boolean) => void;
  isListNavHidden: boolean;
  setIsListNavHidden: (hidden: boolean) => void;
};

const ListNavigationContext = createContext<ListNavigationContextType>({
  isListNavCollapsed: true,
  setIsListNavCollapsed: () => {},
  isListNavHidden: false,
  setIsListNavHidden: () => {},
});

export function useListNavigationContext() {
  return useContext(ListNavigationContext);
}

export function ListNavigationProvider({
  children,
  isCollapsed,
  isHidden,
}: {
  children: ReactNode;
  isCollapsed: boolean;
  isHidden: boolean;
}) {
  const [isListNavCollapsed, setIsListNavCollapsed] = useState(isCollapsed);
  const [isListNavHidden, setIsListNavHidden] = useState(isHidden);

  return (
    <ListNavigationContext.Provider
      value={{
        isListNavCollapsed,
        setIsListNavCollapsed,
        isListNavHidden,
        setIsListNavHidden,
      }}
    >
      {children}
    </ListNavigationContext.Provider>
  );
}

export function useListNavCollapsedToggle() {
  const { setIsListNavCollapsed, isListNavCollapsed } = useListNavigationContext();
  const toggle = useCallback(() => {
    setIsListNavCollapsed(!isListNavCollapsed);
  }, [setIsListNavCollapsed, isListNavCollapsed]);

  return [isListNavCollapsed, toggle] as const;
}

export function useListNavHiddenToggle() {
  const { setIsListNavHidden, isListNavHidden, isListNavCollapsed, setIsListNavCollapsed } =
    useListNavigationContext();
  const toggle = useCallback(() => {
    if (isListNavHidden === false && isListNavCollapsed === true) {
      setIsListNavCollapsed(false);
    } else {
      setIsListNavHidden(!isListNavHidden);
    }
  }, [isListNavHidden, setIsListNavHidden, isListNavCollapsed, setIsListNavCollapsed]);

  return [isListNavHidden, toggle] as const;
}

function MenuButton({ onClick, className }: { className?: string; onClick: () => void }) {
  return (
    <Button variant="ghost" className={cn('p-[10px]', className)} onClick={onClick}>
      <HamburgerMenuIcon />
    </Button>
  );
}

export function ListNavigationTrigger(props: { children?: ReactNode; className?: string }) {
  const [_hidden, toggle] = useListNavHiddenToggle();

  return props.children ? (
    <Button className={props.className} onClick={toggle}>
      {props.children}
    </Button>
  ) : (
    <MenuButton className={props.className} onClick={toggle} />
  );
}

export function ListNavigationWrapper(props: { list: ReactNode; content: ReactNode }) {
  const { isListNavCollapsed, isListNavHidden } = useListNavigationContext();

  return (
    <div className="relative flex grow flex-row">
      <ListNavigation>{props.list}</ListNavigation>
      <div
        className={cn(
          isListNavHidden ? 'flex grow' : 'hidden',
          'w-full md:flex md:grow',
          !isListNavHidden && isListNavCollapsed && 'flex',
          !isListNavCollapsed && !isListNavHidden && 'hidden md:hidden',
        )}
      >
        {props.content}
      </div>
    </div>
  );
}

export function ListNavigation(props: { children: ReactNode }) {
  const { isListNavCollapsed, isListNavHidden } = useListNavigationContext();
  return (
    <div
      className={cn(
        'relative z-10 flex w-full flex-row',
        isListNavCollapsed && !isListNavHidden && 'w-[20%] md:min-w-[300px] xl:min-w-[420px]',

        /**
         * This is not intuitive, but we want hide the menu when collapsed and small.
         * All or nothing better accomodates small screens.
         */
        isListNavCollapsed && 'hidden md:flex',
        !isListNavCollapsed && !isListNavHidden && 'flex',
        isListNavHidden && 'hidden md:hidden',
      )}
    >
      <div className="absolute inset-0 w-full">
        <div className="sticky inset-y-0 left-0 size-full max-h-screen gap-5 overflow-y-auto">
          {props.children}
        </div>
      </div>
    </div>
  );
}

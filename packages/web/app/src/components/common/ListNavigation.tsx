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
          // !isListNavCollapsed && !isListNavHidden && "dimmed",
          isListNavHidden ? 'flex grow' : 'hidden',
          'w-full md:flex md:grow',
          // !isListNavHidden && !isListNavCollapsed && 'hidden md:flex w-[120px] overflow-hidden',
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

  /**
   * This can be in a few different stats:
   * MOBILE (sm)
   *  is always fullscreen when not hidden and not collapsed.
   *   hide collapse/expand button
   *  collapsed OR hidden
   *    => display: none. Menu button toggles hidden.
   * DESKTOP (md+)
   *   show "collapse/expand" button
   *   collapsed
   *    => less wide
   */

  return (
    <div
      className={cn(
        'relative z-10 flex w-full flex-row',
        isListNavCollapsed && !isListNavHidden && 'md:w-[300px] xl:w-[420px]',

        /** This is not intuitive, but we want to flip the hidden flag when the screen shrinks so that the default state
         * is to hide the nav bar, rather than take up the full screen.
         *
         * @TODO get the content to render.... isListNavCollapsed && !isListNavHidden).???
         * and when clicking on a proposal (at least in fullscreen mode...) then hide the navbar
         * AND if a proposal is selected, then allow the side menu to expand and collapse (enable showing a button to do that)
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

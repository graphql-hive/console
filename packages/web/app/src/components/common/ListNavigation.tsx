import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { Button } from "../ui/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

type ListNavigationContextType = {
  isListNavCollapsed: boolean;
  setListNavCollapsed: (collapsed: boolean) => void;
  isListNavHidden: boolean;
  setListNavHidden: (hidden: boolean) => void;
}

const ListNavigationContext = createContext<ListNavigationContextType>({
  isListNavCollapsed: true,
  setListNavCollapsed: () => {},
  isListNavHidden: false,
  setListNavHidden: () => {},
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
  const [isListNavCollapsed, setListNavCollapsed] = useState(isCollapsed);
  const [isListNavHidden, setListNavHidden] = useState(isHidden);

  return (
    <ListNavigationContext.Provider
      value={{
        isListNavCollapsed,
        setListNavCollapsed,
        isListNavHidden,
        setListNavHidden,
      }}
    >
      {children}
    </ListNavigationContext.Provider>
  )
}

export function useListNavCollapsedToggle() {
  const { setListNavCollapsed, isListNavCollapsed } = useListNavigationContext();
  const toggle = useCallback(() => {
    setListNavCollapsed(!isListNavCollapsed);
  }, [setListNavCollapsed, isListNavCollapsed]);

  return [isListNavCollapsed, toggle] as const
}

export function useListNavHiddenToggle() {
  const { setListNavHidden, isListNavHidden, isListNavCollapsed, setListNavCollapsed } = useListNavigationContext();
  const toggle = useCallback(() => {
    if (isListNavHidden === false && isListNavCollapsed === true) {
      setListNavCollapsed(false);
    } else {
      setListNavHidden(!isListNavHidden);
    }
  }, [isListNavHidden, setListNavHidden, isListNavCollapsed, setListNavCollapsed]);

  return [isListNavHidden, toggle] as const
}

function MenuButton({ onClick, className }: { className?: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      className={cn("p-[10px]", className)}
      onClick={onClick}
    >
      <HamburgerMenuIcon/>
    </Button>
  )
}

export function ListNavigationTrigger(props: {
  children?: ReactNode,
  className?: string
}) {
  const [_hidden, toggle] = useListNavHiddenToggle();

  return (
    props.children ? <Button className={props.className} onClick={toggle}>{props.children}</Button> : <MenuButton className={props.className} onClick={toggle}/>
  )
};

export function ListNavigationWrapper(props: { list: ReactNode; content: ReactNode}) {
  const { isListNavCollapsed, isListNavHidden } = useListNavigationContext();

  return (
    <div className="flex flex-row relative grow">
      <ListNavigation>
        {props.list}
      </ListNavigation>
      <div
        className={cn(
          // !isListNavCollapsed && !isListNavHidden && "dimmed",
          isListNavHidden ? "flex grow" : "hidden",
          "md:flex md:grow w-full",
          // !isListNavHidden && !isListNavCollapsed && 'hidden md:flex w-[120px] overflow-hidden',
          !isListNavHidden && isListNavCollapsed && 'flex',
          !isListNavCollapsed && !isListNavHidden && 'hidden md:hidden',
        )}>
        {props.content}
      </div>
    </div>
  )
}

export function ListNavigation(props: {
  children: ReactNode;
}) {
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
        "relative flex flex-row z-10 w-full",
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
      )}>
      <div
        className={"absolute inset-0 w-full"}
      >
        <div className={"gap-5 sticky top-0 bottom-0 left-0 h-full max-h-screen w-full overflow-y-auto"}>
          {props.children}
        </div>
      </div>
    </div>
  );
}
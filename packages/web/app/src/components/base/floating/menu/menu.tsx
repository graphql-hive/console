import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { type VariantProps } from 'class-variance-authority';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { itemVariants, floatingVariants, type FloatingProps } from '../shared-styles';

const MenuDepthContext = createContext(0);

type SubmenuTriggerContextValue = {
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
} | null;

const SubmenuTriggerContext = createContext<SubmenuTriggerContextValue>(null);

function menuItemClassName(
  state: { highlighted: boolean; disabled: boolean },
  {
    variant,
  }: {
    variant?: VariantProps<typeof itemVariants>['variant'];
  },
) {
  return itemVariants({
    variant,
    highlighted: state.highlighted,
    // gap-2.5 overrides the shared gap-2 for menu items; first:mt-2 adds top spacing
    className: 'gap-2.5 first:mt-2',
    disabled: state.disabled,
  });
}

function renderSections(sections: Array<ReactNode | ReactNode[]>): ReactNode {
  const result: ReactNode[] = [];
  let keyCounter = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const items = Array.isArray(section) ? section : [section];
    const filtered = items.filter(Boolean);
    if (filtered.length === 0) continue;

    if (result.length > 0) {
      result.push(
        <div key={`sep-${keyCounter++}`} role="separator" className="bg-neutral-5 my-2 h-px" />,
      );
    }

    for (const item of filtered) {
      result.push(<Fragment key={`item-${keyCounter++}`}>{item}</Fragment>);
    }
  }

  return result;
}

/**
 * Returns a callback ref that locks a popup's width after first layout.
 * Reads the natural width from the initial visible content and freezes it,
 * so the popup never changes size as virtualized items scroll in/out of view.
 * Resets when the element unmounts (i.e. popup closes).
 */
function useStableWidth(enabled: boolean) {
  const observerRef = useRef<ResizeObserver | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || !enabled) return;

      const observer = new ResizeObserver(() => {
        observer.disconnect();
        observerRef.current = null;
        node.style.width = `${node.offsetWidth}px`;
      });

      observer.observe(node);
      observerRef.current = observer;
    },
    [enabled],
  );
}

type MenuProps = FloatingProps & {
  sections: Array<ReactNode | ReactNode[]>;
  modal?: boolean;
  /** Controls the max-width of the popup. Defaults to 300px. */
  maxWidth?: 'default' | 'none' | 'sm' | 'lg';
  /** Controls the min-width of the popup. Defaults to 12rem. Use 'none' for compact menus. */
  minWidth?: 'default' | 'none';
  /** Open the submenu when the trigger is hovered (only relevant for nested menus) */
  openOnHover?: boolean;
  /** Delay in ms before the submenu opens on hover */
  delay?: number;
  /** Delay in ms before the submenu closes when the pointer leaves */
  closeDelay?: number;
  /**
   * Prevent page scroll while the menu is open. Only applies to root menus.
   * Compensates for scrollbar width to avoid layout shift.
   */
  lockScroll?: boolean;
  /**
   * Lock the popup width after the first layout so it never changes while open.
   * Useful for virtualized lists where items scroll in/out of view.
   * Resets each time the popup reopens.
   */
  stableWidth?: boolean;
};

function Menu({
  trigger,
  sections,
  open,
  onOpenChange,
  modal,
  side,
  align,
  sideOffset,
  maxWidth,
  minWidth,
  openOnHover,
  delay,
  closeDelay,
  lockScroll,
  stableWidth,
}: MenuProps) {
  const parentDepth = useContext(MenuDepthContext);
  const isNested = parentDepth > 0;
  const contentDepth = parentDepth + 1;

  // Lock page scroll when a root menu is open to prevent scroll-through
  // (wheel events on the popup propagating to the page behind it).
  useEffect(() => {
    if (!lockScroll || isNested || !open) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
    };
  }, [lockScroll, isNested, open]);

  const popupRef = useStableWidth(stableWidth ?? false);

  const resolvedSide = side ?? (isNested ? 'right' : 'bottom');
  const resolvedAlign = align ?? (isNested ? 'start' : undefined);
  const resolvedSideOffset = sideOffset ?? (isNested ? 6 : 8);

  const popupContent = (
    <MenuDepthContext.Provider value={contentDepth}>
      {renderSections(sections)}
    </MenuDepthContext.Provider>
  );

  if (isNested) {
    return (
      <BaseMenu.SubmenuRoot>
        <SubmenuTriggerContext.Provider value={{ openOnHover, delay, closeDelay }}>
          {trigger}
        </SubmenuTriggerContext.Provider>
        <BaseMenu.Portal>
          <BaseMenu.Positioner
            side={resolvedSide}
            align={resolvedAlign}
            sideOffset={resolvedSideOffset}
            className="outline-none"
          >
            <BaseMenu.Popup
              ref={popupRef}
              className={floatingVariants({ padding: 'menu', maxWidth, minWidth })}
            >
              {popupContent}
            </BaseMenu.Popup>
          </BaseMenu.Positioner>
        </BaseMenu.Portal>
      </BaseMenu.SubmenuRoot>
    );
  }

  return (
    <BaseMenu.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          side={resolvedSide}
          align={resolvedAlign}
          sideOffset={resolvedSideOffset}
          className="outline-none"
        >
          <BaseMenu.Popup
            ref={popupRef}
            className={floatingVariants({ padding: 'menu', maxWidth, minWidth })}
          >
            {popupContent}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

type MenuItemProps = Omit<BaseMenu.Item.Props, 'className'> & {
  variant?: VariantProps<typeof itemVariants>['variant'];
};

function MenuItem({ variant, children, ...props }: MenuItemProps) {
  const submenuTriggerCtx = useContext(SubmenuTriggerContext);

  if (submenuTriggerCtx) {
    return (
      <BaseMenu.SubmenuTrigger
        className={(state: BaseMenu.SubmenuTrigger.State) => menuItemClassName(state, { variant })}
        openOnHover={submenuTriggerCtx.openOnHover}
        delay={submenuTriggerCtx.delay}
        closeDelay={submenuTriggerCtx.closeDelay}
        {...(props as Omit<BaseMenu.SubmenuTrigger.Props, 'className'>)}
      >
        {children}
        <ChevronRight className="ml-auto size-3.5" />
      </BaseMenu.SubmenuTrigger>
    );
  }

  return (
    <BaseMenu.Item
      className={(state: BaseMenu.Item.State) => menuItemClassName(state, { variant })}
      {...(props as Omit<BaseMenu.Item.Props, 'className'>)}
    >
      {children}
      {variant === 'navigationLink' && <ArrowRight className="ml-1 size-3.5" />}
    </BaseMenu.Item>
  );
}

export { Menu, MenuItem };

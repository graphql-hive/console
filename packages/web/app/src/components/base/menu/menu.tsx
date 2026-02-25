import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Menu as BaseMenu } from '@base-ui/react/menu';

// --- Contexts ---

const MenuDepthContext = createContext(0);

type SubmenuTriggerContextValue = {
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
} | null;

const SubmenuTriggerContext = createContext<SubmenuTriggerContextValue>(null);

// --- Styles ---

const menuVariants = cva(
  'px-2 pb-2 z-50 min-w-[12rem] text-[13px] rounded-md border shadow-md shadow-neutral-1/30 outline-none bg-neutral-2 border-neutral-5 dark:bg-neutral-4 dark:border-neutral-5',
  {
    variants: {
      maxWidth: {
        default: 'max-w-75', // 300px
        none: 'max-w-none',
        sm: 'max-w-60', // 240px
        lg: 'max-w-[380px]',
      },
    },
    defaultVariants: {
      maxWidth: 'default',
    },
  },
);

const menuItemVariants = cva(
  'flex h-7 cursor-pointer select-none items-center rounded-sm outline-none gap-2.5 first:mt-2',
  {
    variants: {
      variant: {
        default: 'pl-2 text-neutral-10',
        navigationLink: 'hover:text-accent text-accent_80 justify-end pr-2 hover:bg-transparent',
        action: 'pl-2 hover:bg-accent_10 hover:text-accent text-accent_80',
        destructiveAction: 'pl-2 text-red-400  hover:bg-red-300/10',
      },
      highlighted: {
        true: '',
        false: '',
      },
      active: {
        true: '',
        false: '',
      },
      disabled: {
        true: 'pointer-events-none opacity-50',
        false: '',
      },
    },
    compoundVariants: [
      { highlighted: true, className: 'bg-neutral-5 text-neutral-12' },
      { active: true, className: 'bg-neutral-5 text-neutral-12' },
    ],
    defaultVariants: {
      variant: 'default',
      highlighted: false,
      active: false,
      disabled: false,
    },
  },
);

// --- Helpers ---

function menuItemClassName(
  state: { highlighted: boolean; disabled: boolean },
  {
    active,
    variant,
  }: {
    active?: boolean;
    variant?: VariantProps<typeof menuItemVariants>['variant'];
  },
) {
  return menuItemVariants({
    variant,
    highlighted: state.highlighted,
    disabled: state.disabled,
    active: active ?? false,
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

// --- Hooks ---

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

// --- Menu ---

type MenuProps = {
  trigger: React.ReactElement;
  sections: Array<ReactNode | ReactNode[]>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  /** Controls the max-width of the popup. Defaults to 300px. */
  maxWidth?: 'default' | 'none' | 'sm' | 'lg';
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
   * Prevent the popup from shrinking while open. The width ratchets upward
   * as wider content scrolls into view (e.g. virtualized lists) but never
   * jumps narrower. Resets each time the popup reopens.
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
            <BaseMenu.Popup ref={popupRef} className={menuVariants({ maxWidth })}>
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
          <BaseMenu.Popup ref={popupRef} className={menuVariants({ maxWidth })}>
            {popupContent}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

// --- MenuItem ---

type MenuItemProps = Omit<BaseMenu.Item.Props, 'className'> & {
  active?: boolean;
  variant?: VariantProps<typeof menuItemVariants>['variant'];
};

function MenuItem({ active, variant, children, ...props }: MenuItemProps) {
  const submenuTriggerCtx = useContext(SubmenuTriggerContext);

  if (submenuTriggerCtx) {
    return (
      <BaseMenu.SubmenuTrigger
        className={(state: BaseMenu.SubmenuTrigger.State) =>
          menuItemClassName(state, { active, variant })
        }
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
      className={(state: BaseMenu.Item.State) => menuItemClassName(state, { active, variant })}
      {...(props as Omit<BaseMenu.Item.Props, 'className'>)}
    >
      {children}
      {variant === 'navigationLink' && <ArrowRight className="ml-1 size-3.5" />}
    </BaseMenu.Item>
  );
}

export { Menu, MenuItem };

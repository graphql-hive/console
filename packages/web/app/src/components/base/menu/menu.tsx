import { createContext, Fragment, useContext, type ReactNode } from 'react';
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
  'px-2 pb-2 z-50 max-w-75 min-w-[12rem] text-[13px] rounded-md border shadow-md shadow-neutral-1/30 outline-none bg-neutral-2 border-neutral-5 dark:bg-neutral-4 dark:border-neutral-5',
  {
    variants: {
      autoWidth: {
        true: 'max-w-none',
        false: '',
      },
    },
    defaultVariants: {
      autoWidth: false,
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
  autoWidth?: boolean;
  /** Open the submenu when the trigger is hovered (only relevant for nested menus) */
  openOnHover?: boolean;
  /** Delay in ms before the submenu opens on hover */
  delay?: number;
  /** Delay in ms before the submenu closes when the pointer leaves */
  closeDelay?: number;
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
  autoWidth = false,
  openOnHover,
  delay,
  closeDelay,
}: MenuProps) {
  const parentDepth = useContext(MenuDepthContext);
  const isNested = parentDepth > 0;
  const contentDepth = parentDepth + 1;

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
            <BaseMenu.Popup className={menuVariants({ autoWidth })}>{popupContent}</BaseMenu.Popup>
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
          <BaseMenu.Popup className={menuVariants({ autoWidth })}>{popupContent}</BaseMenu.Popup>
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

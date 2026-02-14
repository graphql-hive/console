import { cva, VariantProps } from 'class-variance-authority';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Menu } from '@base-ui/react/menu';

const MenuRoot = Menu.Root;

const MenuTrigger = Menu.Trigger;

const menuVariants = cva(
  'z-50 w-45 min-w-[8rem] text-[13px] rounded-md border shadow-md shadow-neutral-1/30 outline-none bg-neutral-4 border-neutral-5',
  {
    variants: {
      withPadding: {
        true: 'p-2',
        false: '',
      },
    },
    defaultVariants: {
      withPadding: false,
    },
  },
);

type MenuContentProps = {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  /**
   * configure positioning and alignment as a submenu
   */
  subMenu?: boolean;
  withPadding?: VariantProps<typeof menuVariants>['withPadding'];
};

function MenuContent({
  align,
  children,
  side = 'bottom',
  sideOffset = 8,
  subMenu = false,
  withPadding = false,
}: MenuContentProps) {
  if (subMenu) {
    align = 'start';
    side = 'right';
    sideOffset = 6;
  }

  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="outline-none">
        <Menu.Popup className={menuVariants({ withPadding })}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const menuItemVariants = cva(
  'flex h-7 cursor-pointer select-none items-center rounded-sm outline-none gap-2.5',
  {
    variants: {
      variant: {
        default: 'pl-2 text-neutral-10',
        navigationLink: 'hover:text-accent text-accent_80 justify-end pr-2 hover:bg-transparent',
        action: 'pl-2 hover:bg-accent_10 hover:text-accent text-accent_80',
        destructiveAction: 'pl-2 text-red-400  hover:bg-red-300/10',
      },
      inSubmenu: {
        true: 'mx-2',
        false: '',
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
      { highlighted: true, inSubmenu: false, className: 'bg-neutral-5 text-neutral-12' },
      { active: true, inSubmenu: false, className: 'bg-neutral-5 text-neutral-12' },
      { highlighted: true, inSubmenu: true, className: 'text-neutral-12' },
      { active: true, inSubmenu: true, className: 'text-neutral-12' },
    ],
    defaultVariants: {
      variant: 'default',
      inSubmenu: false,
      highlighted: false,
      active: false,
      disabled: false,
    },
  },
);

type MenuItemSharedProps = {
  active?: boolean;
  variant?: VariantProps<typeof menuItemVariants>['variant'];
  inSubmenu?: boolean;
};

type MenuItemAsItem = Omit<Menu.Item.Props, 'className'> &
  MenuItemSharedProps & { subMenuTrigger?: false };

type MenuItemAsSubmenuTrigger = Omit<Menu.SubmenuTrigger.Props, 'className'> &
  MenuItemSharedProps & { subMenuTrigger: true };

type MenuItemProps = MenuItemAsItem | MenuItemAsSubmenuTrigger;

function menuItemClassName(
  state: { highlighted: boolean; disabled: boolean },
  {
    active,
    variant,
    inSubmenu,
  }: {
    active?: boolean;
    variant?: VariantProps<typeof menuItemVariants>['variant'];
    inSubmenu?: boolean;
  },
) {
  return menuItemVariants({
    variant,
    inSubmenu: inSubmenu ?? false,
    highlighted: state.highlighted,
    disabled: state.disabled,
    active: active ?? false,
  });
}

function MenuItem({
  active,
  variant,
  inSubmenu,
  subMenuTrigger,
  children,
  ...props
}: MenuItemProps) {
  if (subMenuTrigger) {
    return (
      <Menu.SubmenuTrigger
        className={(state: Menu.SubmenuTrigger.State) =>
          menuItemClassName(state, { active, variant, inSubmenu })
        }
        {...(props as Omit<Menu.SubmenuTrigger.Props, 'className'>)}
      >
        {children}
        <ChevronRight className="ml-auto size-3.5" />
      </Menu.SubmenuTrigger>
    );
  }

  return (
    <Menu.Item
      className={(state: Menu.Item.State) =>
        menuItemClassName(state, { active, variant, inSubmenu })
      }
      {...(props as Omit<Menu.Item.Props, 'className'>)}
    >
      {children}
      {variant === 'navigationLink' && <ArrowRight className="ml-1 size-3.5" />}
    </Menu.Item>
  );
}

function MenuSeparator() {
  return <div role="separator" className="bg-neutral-5 my-2 h-px" />;
}

function MenuLabel({ children }: { className?: string; children: React.ReactNode }) {
  return <div className="text-neutral-12 px-2 py-1.5 font-semibold">{children}</div>;
}

const MenuSubmenu = Menu.SubmenuRoot;

export { MenuRoot, MenuTrigger, MenuContent, MenuItem, MenuSeparator, MenuLabel, MenuSubmenu };

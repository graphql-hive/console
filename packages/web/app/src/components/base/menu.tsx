import { ChevronRight } from 'lucide-react';
import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

// ─── Root (pass-through) ───────────────────────────────────────────────────────

const MenuRoot = Menu.Root;

// ─── Trigger ───────────────────────────────────────────────────────────────────

const MenuTrigger = Menu.Trigger;

// ─── Content (Portal + Positioner + Popup) ─────────────────────────────────────

type MenuContentProps = {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
};

function MenuContent({
  children,
  side = 'bottom',
  align,
  sideOffset = 8,
  className,
}: MenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="outline-none">
        <Menu.Popup
          className={cn(
            'z-50 min-w-[8rem] rounded-md border p-2 shadow-md outline-none',
            'bg-neutral-2 border-neutral-4 dark:bg-neutral-2 dark:border-neutral-4',
            className,
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

// ─── Item ──────────────────────────────────────────────────────────────────────

type MenuItemProps = Omit<Menu.Item.Props, 'className'> & {
  active?: boolean;
  className?: string;
};

function MenuItem({ active, className, ...props }: MenuItemProps) {
  return (
    <Menu.Item
      className={(state: Menu.Item.State) =>
        cn(
          'flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
          'text-neutral-11',
          state.highlighted && 'bg-neutral-3 dark:bg-neutral-5 text-neutral-12',
          state.disabled && 'pointer-events-none opacity-50',
          active && 'bg-neutral-3 dark:bg-neutral-5 text-neutral-12',
          className,
        )
      }
      {...props}
    />
  );
}

// ─── Separator ─────────────────────────────────────────────────────────────────

function MenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn('-mx-1 my-1 h-px bg-neutral-5 dark:bg-neutral-6', className)} />;
}

// ─── Label ─────────────────────────────────────────────────────────────────────

function MenuLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('px-2 py-1.5 text-sm font-semibold text-neutral-12', className)}>
      {children}
    </div>
  );
}

// ─── Group (pass-through) ──────────────────────────────────────────────────────

const MenuGroup = Menu.Group;

// ─── Submenu (pass-through) ────────────────────────────────────────────────────

const MenuSubmenu = Menu.SubmenuRoot;

// ─── Submenu Trigger ───────────────────────────────────────────────────────────

type MenuSubmenuTriggerProps = Omit<Menu.SubmenuTrigger.Props, 'className'> & {
  className?: string;
};

function MenuSubmenuTrigger({ children, className, ...props }: MenuSubmenuTriggerProps) {
  return (
    <Menu.SubmenuTrigger
      className={(state: Menu.SubmenuTrigger.State) =>
        cn(
          'flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
          'text-neutral-11',
          state.highlighted && 'bg-neutral-3 dark:bg-neutral-5 text-neutral-12',
          state.disabled && 'pointer-events-none opacity-50',
          className,
        )
      }
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4" />
    </Menu.SubmenuTrigger>
  );
}

// ─── Submenu Content (Portal + Positioner + Popup) ─────────────────────────────

type MenuSubmenuContentProps = {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
};

function MenuSubmenuContent({
  children,
  side = 'right',
  align = 'start',
  sideOffset = 4,
  className,
}: MenuSubmenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="outline-none">
        <Menu.Popup
          className={cn(
            'z-50 min-w-[8rem] rounded-md border p-2 shadow-md outline-none',
            'bg-neutral-2 border-neutral-4 dark:bg-neutral-2 dark:border-neutral-4',
            className,
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuLabel,
  MenuGroup,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuSubmenuContent,
};

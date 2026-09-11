import {
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from 'react';
import { type VariantProps } from 'class-variance-authority';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/base/switch/switch';
import { type IconProps } from '@/components/ui/icon';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { useFloatingPortalContainer } from '../floating-portal-container';
import { floatingVariants, itemVariants, type FloatingProps } from '../shared-styles';
import { Tooltip } from '../tooltip/tooltip';

type ItemVariant = VariantProps<typeof itemVariants>['variant'];

/**
 * An icon as this app defines one, via `IconProps` in `ui/icon.tsx`. Not `LucideIcon`: lucide,
 * react-icons and our own hand-rolled SVGs have incompatible signatures, and menus only ever
 * hand an icon a `className`.
 */
type MenuIcon = ComponentType<IconProps>;

/** Width controls, shared by a menu and any submenu inside it. */
type WidthProps = {
  /** Caps the popup width. Unset is unconstrained; `'default'` is 300px. */
  maxWidth?: 'default' | 'none' | 'sm' | 'lg';
  /** Floors the popup width. Unset is unconstrained; `'default'` is 12rem, `'md'` 240px. */
  minWidth?: 'default' | 'none' | 'sm' | 'md';
  /**
   * Fixes the popup width so it does not resize with its content. Prefer `minWidth`/`maxWidth`;
   * this is for menus where every state should share one width.
   */
  width?: 'none' | 'sm';
};

/** A row you can act on. The default entry shape, so it carries no `kind`. */
type MenuAction = {
  label: ReactNode;
  icon?: MenuIcon;
  /** Pushed to the right of the row, for a badge-like affordance such as "Create". */
  trailingIcon?: MenuIcon;
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  /**
   * Marks the row as the current one, where the page owns the state (the organization you are
   * in, say). For a choice the menu itself owns, use a `radio` entry.
   */
  selected?: boolean;
  variant?: ItemVariant;
  /** Keep the menu open after a click. For rows that toggle something in place. */
  closeOnClick?: boolean;
  /**
   * Explains the row on hover. Rendered on a wrapper rather than the row, so it still appears
   * when the row is `disabled`, which is the case it exists for.
   */
  tooltip?: ReactNode;
  /** Render the row as this element instead: a TanStack `Link`, an `<a>`. */
  render?: ReactElement;
  /** Passed through to the DOM. For test hooks and data attributes read back off the event. */
  attrs?: Record<string, string>;
};

type MenuSubmenu = WidthProps & {
  kind: 'submenu';
  label: ReactNode;
  icon?: MenuIcon;
  disabled?: boolean;
  /** Open on hover rather than click, with optional open/close delays in ms. */
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
  /** Lock the popup width after first layout. For virtualized or filtered lists. */
  stableWidth?: boolean;
} & (
    | { items: MenuSection[]; content?: never }
    /** A submenu whose body is a custom panel rather than rows, like a filter's value list. */
    | { content: ReactNode; items?: never }
  );

type MenuCheckbox = {
  kind: 'checkbox';
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: MenuIcon;
  disabled?: boolean;
  /** Defaults to false: a checkbox row usually toggles without dismissing the menu. */
  closeOnClick?: boolean;
  /**
   * How the checked state is shown. `switch` is for rows that read as settings rather than a
   * selection, such as the filter menu's dimension toggles.
   */
  indicator?: 'check' | 'switch';
};

/**
 * Reads as a setting rather than a selection: same `menuitemcheckbox` role as a checkbox row,
 * shown with a switch. The filter menu's dimension toggles are these.
 */
type MenuToggle = {
  kind: 'toggle';
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: MenuIcon;
  disabled?: boolean;
  /** Defaults to false: a toggle row flips in place without dismissing the menu. */
  closeOnClick?: boolean;
};

type MenuRadio = {
  kind: 'radio';
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: ReactNode; icon?: MenuIcon; disabled?: boolean }>;
};

/**
 * A non-interactive block at the top of a section, for identity rather than a heading: the user
 * menu's name and email pair. For naming a group of rows, use a section's `label` instead.
 */
type MenuHeader = {
  kind: 'header';
  title: ReactNode;
  subtitle?: ReactNode;
};

/**
 * A row that navigates to an href. For a typed app route use a `render` on an action row with a
 * TanStack `Link`: its `to` constrains `params` and `search` through inference at the call site,
 * which a data field cannot carry.
 */
type MenuLink = {
  kind: 'link';
  label: ReactNode;
  href: string;
  /** Opens in a new tab, with `rel="noreferrer"`. */
  external?: boolean;
  icon?: MenuIcon;
  trailingIcon?: MenuIcon;
  disabled?: boolean;
  /** Passed through to the anchor. For test hooks. */
  attrs?: Record<string, string>;
};

type MenuEntry =
  | MenuAction
  | MenuLink
  | MenuSubmenu
  | MenuCheckbox
  | MenuToggle
  | MenuRadio
  | MenuHeader;

/**
 * Falsy entries are dropped, so a row can be written as `cond && { label: … }` without the call
 * site filtering first. A section that ends up empty is skipped, separators included.
 */
type MenuEntryList = Array<MenuEntry | false | null | undefined>;

/**
 * One section of a menu. Sections are separated by a rule; the object form adds a heading and
 * puts its rows in a labelled group, so the heading names them.
 */
type MenuSection = MenuEntryList | { label: string; items: MenuEntryList };

function menuItemClassName(
  state: { highlighted: boolean; disabled: boolean; checked?: boolean },
  { variant, selected }: { variant?: ItemVariant; selected?: boolean },
) {
  return itemVariants({
    variant,
    highlighted: state.highlighted,
    // A checkbox or radio row carries its own state; an action row is told by the call site.
    selected: state.checked ?? selected ?? false,
    // gap-2.5 overrides the shared gap-2 for menu items. Row spacing goes above each row rather
    // than around it, so the last row adds nothing under itself and the popup's pb-2 stands alone.
    className: 'gap-2.5 mt-0.5 first:mt-2',
    disabled: state.disabled,
  });
}

function ActionRow({
  label,
  icon: Icon,
  trailingIcon: TrailingIcon,
  tooltip,
  render,
  attrs,
  variant,
  selected,
  ...rest
}: MenuAction) {
  const row = (
    <BaseMenu.Item
      className={(state: BaseMenu.Item.State) => menuItemClassName(state, { variant, selected })}
      render={render}
      {...attrs}
      {...rest}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {label}
      {TrailingIcon ? <TrailingIcon className="ml-auto size-4" /> : null}
      {variant === 'navigationLink' ? <ArrowRight className="ml-1 size-3.5" /> : null}
    </BaseMenu.Item>
  );

  if (!tooltip) {
    return row;
  }

  return <Tooltip trigger={<span className="block">{row}</span>} content={tooltip} side="right" />;
}

function CheckboxRow({
  label,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled,
  closeOnClick = false,
  indicator = 'check',
}: MenuCheckbox) {
  return (
    <BaseMenu.CheckboxItem
      className={(state: BaseMenu.CheckboxItem.State) => menuItemClassName(state, {})}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      closeOnClick={closeOnClick}
    >
      {Icon ? <Icon className="size-4" /> : null}
      <span className="flex-1">{label}</span>
      {indicator === 'switch' ? (
        <Switch checked={checked} size="small" decorative />
      ) : (
        <BaseMenu.CheckboxItemIndicator className="ml-auto inline-flex items-center">
          <Check className="size-3.5" />
        </BaseMenu.CheckboxItemIndicator>
      )}
    </BaseMenu.CheckboxItem>
  );
}

function LinkRow({
  label,
  href,
  external,
  icon: Icon,
  trailingIcon: TrailingIcon,
  disabled,
  attrs,
}: MenuLink) {
  return (
    <BaseMenu.Item
      className={(state: BaseMenu.Item.State) => menuItemClassName(state, {})}
      disabled={disabled}
      render={props => (
        <a
          {...props}
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : null)}
          {...attrs}
        >
          {props.children}
        </a>
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {label}
      {TrailingIcon ? <TrailingIcon className="ml-auto size-4" /> : null}
    </BaseMenu.Item>
  );
}

function HeaderRow({ title, subtitle }: MenuHeader) {
  return (
    <div className="flex flex-col gap-y-1 px-2 pb-1 pt-3">
      <span className="text-neutral-12 truncate text-sm font-medium leading-none">{title}</span>
      {subtitle ? (
        <span className="text-neutral-10 truncate text-xs leading-none">{subtitle}</span>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled,
  closeOnClick = false,
}: MenuToggle) {
  return (
    <BaseMenu.CheckboxItem
      className={(state: BaseMenu.CheckboxItem.State) => menuItemClassName(state, {})}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      closeOnClick={closeOnClick}
    >
      {Icon ? <Icon className="size-4" /> : null}
      <span className="flex-1">{label}</span>
      <Switch checked={checked} size="small" decorative />
    </BaseMenu.CheckboxItem>
  );
}

function RadioRows({ value, onValueChange, options }: MenuRadio) {
  return (
    <BaseMenu.RadioGroup value={value} onValueChange={next => onValueChange(next as string)}>
      {options.map(option => (
        <BaseMenu.RadioItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={(state: BaseMenu.RadioItem.State) => menuItemClassName(state, {})}
        >
          {option.icon ? <option.icon className="size-4" /> : null}
          {option.label}
          <BaseMenu.RadioItemIndicator className="ml-auto inline-flex items-center">
            <Check className="size-3.5" />
          </BaseMenu.RadioItemIndicator>
        </BaseMenu.RadioItem>
      ))}
    </BaseMenu.RadioGroup>
  );
}

function SubmenuRow({
  label,
  icon: Icon,
  disabled,
  openOnHover,
  delay,
  closeDelay,
  maxWidth,
  minWidth,
  width,
  stableWidth,
  ...body
}: MenuSubmenu) {
  const portalContainer = useFloatingPortalContainer();
  const popupRef = useStableWidth(stableWidth ?? false);

  return (
    <BaseMenu.SubmenuRoot>
      <BaseMenu.SubmenuTrigger
        className={(state: BaseMenu.SubmenuTrigger.State) => menuItemClassName(state, {})}
        disabled={disabled}
        openOnHover={openOnHover}
        delay={delay}
        closeDelay={closeDelay}
      >
        {Icon ? <Icon className="size-4" /> : null}
        {label}
        <ChevronRight className="ml-auto size-3.5" />
      </BaseMenu.SubmenuTrigger>
      <BaseMenu.Portal container={portalContainer ?? undefined}>
        <BaseMenu.Positioner
          side="right"
          align="start"
          sideOffset={6}
          className="z-50 outline-none"
        >
          <BaseMenu.Popup
            ref={popupRef}
            className={floatingVariants({
              // Rows bring their own top inset via `first:mt-2`, so `menu` padding has none. A
              // custom panel has no rows, so it would sit flush at the top and padded at the
              // bottom; give it none and let the panel own its insets, as the filter panels do.
              padding: body.items ? 'menu' : 'none',
              maxWidth,
              // A submenu is usually a few short labels, and left to itself it comes out
              // narrower than the row that opened it.
              minWidth: minWidth ?? 'sm',
              width,
            })}
          >
            {body.items ? renderSections(body.items) : body.content}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.SubmenuRoot>
  );
}

function renderEntry(entry: MenuEntry, key: number): ReactNode {
  if ('kind' in entry) {
    switch (entry.kind) {
      case 'submenu':
        return <SubmenuRow key={key} {...entry} />;
      case 'checkbox':
        return <CheckboxRow key={key} {...entry} />;
      case 'toggle':
        return <ToggleRow key={key} {...entry} />;
      case 'radio':
        return <RadioRows key={key} {...entry} />;
      case 'header':
        return <HeaderRow key={key} {...entry} />;
      case 'link':
        return <LinkRow key={key} {...entry} />;
    }
  }

  return <ActionRow key={key} {...entry} />;
}

function isLabelledSection(
  section: MenuSection,
): section is { label: string; items: MenuEntryList } {
  return !Array.isArray(section);
}

function renderSections(sections: MenuSection[]): ReactNode {
  const result: ReactNode[] = [];

  for (const section of sections) {
    const labelled = isLabelledSection(section);
    const entries = (labelled ? section.items : section).filter(Boolean) as MenuEntry[];
    if (entries.length === 0) continue;

    if (result.length > 0) {
      result.push(
        <div key={`sep-${result.length}`} role="separator" className="bg-neutral-5 my-2 h-px" />,
      );
    }

    if (labelled) {
      result.push(
        <BaseMenu.Group key={`group-${result.length}`}>
          <BaseMenu.GroupLabel className="text-neutral-9 px-2 pb-1 pt-2 text-xs font-normal">
            {section.label}
          </BaseMenu.GroupLabel>
          {entries.map(renderEntry)}
        </BaseMenu.Group>,
      );
      continue;
    }

    for (const entry of entries) {
      result.push(renderEntry(entry, result.length));
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

type MenuBaseProps = FloatingProps &
  WidthProps & {
    modal?: boolean;
    /**
     * Render as a submenu of the menu this sits inside, rather than as its own root menu. Only
     * for a submenu whose body is a custom panel, since a submenu made of rows is a `submenu`
     * entry in `sections`. `trigger` becomes the row, so pass its contents, not a `MenuItem`.
     */
    submenu?: boolean;
    /** Submenu only: open on hover rather than click, with open/close delays in ms. */
    openOnHover?: boolean;
    delay?: number;
    closeDelay?: number;
    /**
     * Prevent page scroll while the menu is open. Compensates for scrollbar width to avoid
     * layout shift.
     */
    lockScroll?: boolean;
    /**
     * Lock the popup width after the first layout so it never changes while open.
     * Useful for virtualized lists where items scroll in/out of view.
     * Resets each time the popup reopens.
     */
    stableWidth?: boolean;
  };

/**
 * A menu is described by its rows, not composed from them. The `content` form is the exception,
 * for a floating panel that is not a list of rows at all (the filter dropdown's value list, a
 * search field) and mirrors `Popover`'s raw/structured split.
 */
type MenuProps =
  | (MenuBaseProps & { sections: MenuSection[]; content?: never })
  | (MenuBaseProps & { content: ReactNode; sections?: never });

function Menu(props: MenuProps) {
  const portalContainer = useFloatingPortalContainer();
  const {
    trigger,
    open,
    onOpenChange,
    modal,
    side,
    align,
    sideOffset,
    maxWidth,
    minWidth,
    width,
    lockScroll,
    stableWidth,
    submenu,
    openOnHover,
    delay,
    closeDelay,
  } = props;
  // Lock page scroll when the menu is open to prevent scroll-through
  // (wheel events on the popup propagating to the page behind it).
  useEffect(() => {
    if (!lockScroll || !open) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
    };
  }, [lockScroll, open]);

  const popupRef = useStableWidth(stableWidth ?? false);

  // Resolved rather than defaulted in the destructure, so `submenu` can pick its own values and
  // an explicit prop still wins. A submenu opens beside its row; a root menu below its trigger.
  const resolvedSide = side ?? (submenu ? 'right' : 'bottom');
  // Menus align to the trigger's leading edge. Base UI would centre them, which no call site wants.
  const resolvedAlign = align ?? 'start';
  const resolvedSideOffset = sideOffset ?? (submenu ? 6 : 8);

  const popup = (
    <BaseMenu.Portal container={portalContainer ?? undefined}>
      <BaseMenu.Positioner
        side={resolvedSide}
        align={resolvedAlign}
        sideOffset={resolvedSideOffset}
        className="z-50 outline-none"
      >
        <BaseMenu.Popup
          ref={popupRef}
          className={floatingVariants({
            // See `SubmenuRow`: a custom panel owns its own insets.
            padding: props.sections ? 'menu' : 'none',
            maxWidth,
            minWidth: submenu ? (minWidth ?? 'sm') : minWidth,
            width,
          })}
        >
          {props.sections ? renderSections(props.sections) : props.content}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );

  if (submenu) {
    return (
      <BaseMenu.SubmenuRoot>
        <BaseMenu.SubmenuTrigger
          className={(state: BaseMenu.SubmenuTrigger.State) => menuItemClassName(state, {})}
          openOnHover={openOnHover}
          delay={delay}
          closeDelay={closeDelay}
          render={trigger}
        />
        {popup}
      </BaseMenu.SubmenuRoot>
    );
  }

  return (
    <BaseMenu.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <BaseMenu.Trigger render={trigger} />
      {popup}
    </BaseMenu.Root>
  );
}

type MenuItemProps = Omit<BaseMenu.Item.Props, 'className'> & {
  variant?: ItemVariant;
  selected?: boolean;
};

/**
 * A single menu row, for surfaces that want menu-row styling outside a `Menu`, such as the filter
 * dropdown's value list, say. To build a menu, describe its rows with `Menu`'s `sections`
 * instead of composing these by hand.
 */
function MenuItem({ variant, selected, children, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item
      className={(state: BaseMenu.Item.State) => menuItemClassName(state, { variant, selected })}
      {...(props as Omit<BaseMenu.Item.Props, 'className'>)}
    >
      {children}
      {variant === 'navigationLink' ? <ArrowRight className="ml-1 size-3.5" /> : null}
    </BaseMenu.Item>
  );
}

export { Menu, MenuItem };
export type {
  MenuAction,
  MenuCheckbox,
  MenuEntry,
  MenuEntryList,
  MenuHeader,
  MenuLink,
  MenuRadio,
  MenuSection,
  MenuSubmenu,
  MenuToggle,
};

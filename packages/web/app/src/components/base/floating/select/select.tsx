import { useState, type FocusEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Button } from '../../button/button';
import { type ControlSize, type OnSurface } from '../../shared-styles';
import { useFloatingPortalContainer } from '../floating-portal-container';
import { FloatingSearch } from '../floating-search';
import {
  floatingEmptyState,
  floatingScrollArea,
  floatingVariants,
  itemVariants,
  type FloatingProps,
} from '../shared-styles';

export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  /**
   * A second line under the label. For an option whose name needs qualifying: what a sort order
   * means, what a role grants, why a choice is unavailable. Shown on disabled options too, so the
   * reason a row cannot be picked is visible without hovering.
   */
  description?: ReactNode;
  disabled?: boolean;
  'data-cy'?: string;
};

// Select owns its trigger widths. Button only knows `auto | full`, because full-width is the
// only width buttons ask for; the fixed steps here are what select triggers ask for.
const widthClass = {
  auto: 'inline-block',
  sm: 'inline-block w-[150px]',
  md: 'inline-block w-[200px]',
  lg: 'inline-block w-[250px]',
  full: 'block w-full',
} as const;

type SelectProps = Partial<
  Pick<FloatingProps, 'trigger' | 'side' | 'align' | 'sideOffset' | 'open' | 'onOpenChange'>
> & {
  options: readonly SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /**
   * Overrides the trigger text, which otherwise echoes the selected option's label. For a trigger
   * that summarises rather than echoes: "Sort by requests", or "Select a service…" on a control
   * that is really an add action and never holds a selection.
   */
  label?: ReactNode;
  disabled?: boolean;
  /** A search field at the top of the popup. For lists long enough to need one. */
  searchable?: boolean;
  /** The surface the trigger sits on. `raised` for a select inside a popover or card. */
  onSurface?: OnSurface;
  /** `compact` for a select that is part of filter chrome, beside chips and date pickers. */
  size?: ControlSize;
  width?: keyof typeof widthClass;
  /**
   * Size the popup to the trigger rather than to its content, so a long option label does not
   * make the panel wider than the control it belongs to.
   */
  matchTriggerWidth?: boolean;
  /** Lands on the trigger, so a `<label htmlFor>` can point at it. */
  id?: string;
  /** Form field name, for a select inside a native form. */
  name?: string;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
  /** Test hook on the trigger. */
  'data-cy'?: string;
  /** Test hook on the popup. */
  popupDataCy?: string;
};

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  label,
  trigger,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  disabled,
  open,
  onOpenChange,
  searchable,
  onSurface,
  size,
  width = 'auto',
  matchTriggerWidth,
  id,
  name,
  onBlur,
  'data-cy': dataCy,
  popupDataCy,
}: SelectProps) {
  const selectedLabel = options.find(o => o.value === value)?.label;
  const [search, setSearch] = useState('');
  const portalContainer = useFloatingPortalContainer();

  const displayedOptions =
    searchable && search
      ? options.filter(o => o.value === '' || o.label.toLowerCase().includes(search.toLowerCase()))
      : options;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearch('');
    onOpenChange?.(nextOpen);
  };

  return (
    <div className={widthClass[width]}>
      <BaseSelect.Root
        value={value}
        onValueChange={val => {
          if (val != null && onValueChange) {
            onValueChange(val);
          }
        }}
        open={open}
        onOpenChange={handleOpenChange}
        disabled={disabled}
        name={name}
      >
        <BaseSelect.Trigger
          render={
            trigger ??
            ((
              <Button
                label={label ?? selectedLabel ?? placeholder}
                rightIcon={{ icon: ChevronDown, withSeparator: true }}
                disabled={disabled}
                onSurface={onSurface}
                size={size}
                width={width === 'auto' ? 'auto' : 'full'}
                id={id}
                onBlur={onBlur}
                data-cy={dataCy}
              />
            ) as React.ReactElement)
          }
        />

        <BaseSelect.Portal container={portalContainer ?? undefined}>
          <BaseSelect.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignItemWithTrigger={false}
            className="z-50 outline-none"
          >
            <BaseSelect.Popup
              className={floatingVariants({
                padding: 'sm',
                className: matchTriggerWidth ? 'w-[var(--anchor-width)]' : undefined,
              })}
              data-cy={popupDataCy}
            >
              {searchable && <FloatingSearch label="options" onSearch={setSearch} value={search} />}
              <div className={searchable ? `${floatingScrollArea} h-64` : ''}>
                {displayedOptions.length === 0 ? (
                  <div className={floatingEmptyState}>No matches</div>
                ) : (
                  displayedOptions.map(option => (
                    <BaseSelect.Item
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      data-cy={option['data-cy']}
                      className={state =>
                        itemVariants({
                          highlighted: state.highlighted,
                          selected: state.selected,
                          disabled: state.disabled,
                          // A row with a description grows past the fixed item height.
                          className: option.description
                            ? 'relative h-auto py-1.5 pl-7'
                            : 'relative pl-7',
                        })
                      }
                    >
                      <BaseSelect.ItemIndicator className="absolute left-2 top-2 inline-flex items-center">
                        <Check className="size-3" />
                      </BaseSelect.ItemIndicator>
                      <BaseSelect.ItemText>
                        <span className="flex items-center gap-1.5">
                          {option.icon}
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="text-neutral-9 mt-0.5 block text-xs">
                            {option.description}
                          </span>
                        ) : null}
                      </BaseSelect.ItemText>
                    </BaseSelect.Item>
                  ))
                )}
              </div>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  );
}

import { ComponentPropsWithRef, ReactElement, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown } from 'lucide-react';
import Highlighter from 'react-highlight-words';
import Select, {
  components,
  createFilter,
  DropdownIndicatorProps,
  IndicatorSeparatorProps,
  Props as SelectProps,
  StylesConfig,
} from 'react-select';
import { SelectOption } from './radix-select';

const ITEM_HEIGHT = 40;

function MenuList(props: any): ReactElement {
  const { options, children, maxHeight, getValue } = props;
  const [value] = getValue();
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: children.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  useEffect(() => {
    const index = options.indexOf(value);
    if (index > 0) {
      virtualizer.scrollToIndex(index);
    }
  }, []);

  return (
    <div ref={scrollRef} style={{ maxHeight, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {children[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}

const DropdownIndicator = (props: DropdownIndicatorProps) => {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="size-4 opacity-50" />
    </components.DropdownIndicator>
  );
};

const IndicatorSeparator = (_: IndicatorSeparatorProps<unknown, boolean>) => {
  return null;
};

const styles: StylesConfig = {
  input: styles => ({
    ...styles,
    color: 'var(--color-neutral-12)',
    fontSize: '14px',
  }),
  placeholder: styles => ({
    ...styles,
    fontSize: '14px',
  }),
  control: styles => ({
    ...styles,
    backgroundColor: 'var(--color-neutral-2)',
    borderWidth: 1,
    borderColor: 'var(--color-neutral-5)',
    paddingTop: 1,
    paddingBottom: 1,
    borderRadius: 6,
    ':hover': {
      cursor: 'pointer',
      borderColor: 'var(--color-neutral-5)',
    },
  }),
  singleValue: styles => ({
    ...styles,
    color: 'var(--color-neutral-10)',
    fontSize: '14px',
  }),
  option: styles => ({
    ...styles,
    color: 'var(--color-neutral-10)',
    fontSize: '14px',
    backgroundColor: 'var(--color-neutral-3)',
    ':hover': {
      backgroundColor: 'var(--color-neutral-5)',
    },
  }),
  menu: styles => ({
    ...styles,
    backgroundColor: 'var(--color-neutral-3)',
  }),
};

// Disable mouse events to improve performance when rendering a lot of elements.
// It's really really slow without this.
const Option = ({ children, ...props }: ComponentPropsWithRef<typeof components.Option>) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onMouseMove, onMouseOver, ...rest } = props.innerProps;
  const newProps = { ...props, innerProps: rest };
  return <components.Option {...newProps}>{children}</components.Option>;
};

const formatOptionLabel: SelectProps<any>['formatOptionLabel'] = ({ label }, { inputValue }) => {
  return <Highlighter searchWords={[inputValue]} textToHighlight={label} />;
};

export function Autocomplete(props: {
  placeholder: string;
  options: readonly SelectOption[];
  onChange: (value: SelectOption) => void;
  defaultValue?: SelectOption | null;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onInputChange?: (value: string) => void;
}): ReactElement {
  return (
    <Select
      filterOption={createFilter({
        ignoreAccents: false,
        ignoreCase: true,
        trim: true,
        matchFrom: 'any',
      })}
      formatOptionLabel={formatOptionLabel}
      options={props.options}
      defaultValue={props.defaultValue}
      styles={styles}
      isSearchable
      isClearable
      closeMenuOnSelect
      onChange={option => props.onChange(option as SelectOption)}
      onInputChange={(value, { action }) => {
        if (action === 'input-change') {
          props.onInputChange?.(value);
        }
      }}
      isDisabled={props.disabled}
      isLoading={props.loading}
      placeholder={props.placeholder}
      components={{ MenuList, Option, DropdownIndicator, IndicatorSeparator }}
      className={props.className}
    />
  );
}

import { ComponentPropsWithRef, ReactElement } from 'react';
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
import { FixedSizeList } from 'react-window';
import { SelectOption } from './radix-select';

const height = 40;

function MenuList(props: any): ReactElement {
  const { options, children, maxHeight, getValue } = props;
  const [value] = getValue();
  const initialOffset = options.indexOf(value) * height;

  return (
    <FixedSizeList
      width="100%"
      height={maxHeight}
      itemCount={children.length}
      itemSize={height}
      initialScrollOffset={initialOffset}
    >
      {({ index, style }) => <div style={style}>{children[index]}</div>}
    </FixedSizeList>
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
      isDisabled={props.disabled}
      isLoading={props.loading}
      placeholder={props.placeholder}
      components={{ MenuList, Option, DropdownIndicator, IndicatorSeparator }}
      className={props.className}
    />
  );
}

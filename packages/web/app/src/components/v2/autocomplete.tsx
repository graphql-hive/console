import { ReactElement } from 'react';
import Select, { StylesConfig } from 'react-select';
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

const styles: StylesConfig = {
  input: styles => ({
    ...styles,
    color: '#fff',
  }),
  control: styles => ({
    ...styles,
    backgroundColor: '#24272e',
    borderWidth: 1,
    borderColor: '#5f6169',
  }),
  singleValue: styles => ({
    ...styles,
    color: '#fff',
  }),
  option: styles => ({
    ...styles,
    color: '#fff',
    fontSize: '14px',
    backgroundColor: '#24272e',
    ':hover': {
      backgroundColor: '#5f6169',
    },
  }),
  menu: styles => ({
    ...styles,
    backgroundColor: '#24272e',
  }),
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
      options={props.options}
      defaultValue={props.defaultValue}
      styles={styles}
      isSearchable
      closeMenuOnSelect
      onChange={option => props.onChange(option as SelectOption)}
      isDisabled={props.disabled}
      isLoading={props.loading}
      placeholder={props.placeholder}
      components={{ MenuList }}
      className={props.className}
    />
  );
}

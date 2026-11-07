import React from 'react';
import { ChevronDown, CircleX } from 'lucide-react';
import Select, { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { comboboxStyles } from './combobox.css';

interface Option {
  value: string;
  label: string;
}

export function Combobox(
  props: React.PropsWithoutRef<{
    name: string;
    inputId?: string;
    placeholder: string;
    options: readonly Option[];
    value?: readonly Option[];
    onChange: (value: readonly Option[]) => void;
    onBlur: (el: unknown) => void;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    creatable?: boolean;
  }>,
) {
  const Comp = props.creatable ? CreatableSelect : Select;

  return (
    <Comp
      name={props.name}
      inputId={props.inputId}
      className={props.className}
      components={{
        ClearIndicator: compProps => (
          <components.ClearIndicator {...compProps}>
            <CircleX className={comboboxStyles.indicatorIcon} />
          </components.ClearIndicator>
        ),
        DropdownIndicator: compProps => (
          <components.DropdownIndicator {...compProps}>
            <ChevronDown className={comboboxStyles.indicatorIcon} />
          </components.DropdownIndicator>
        ),
        NoOptionsMessage: compProps => (
          <components.NoOptionsMessage {...compProps}>
            <div className={comboboxStyles.emptyMessage}>
              {props.creatable ? 'Start typing to add values' : 'No options'}
            </div>
          </components.NoOptionsMessage>
        ),
      }}
      classNames={{
        control: () => comboboxStyles.control,
        valueContainer: () => comboboxStyles.valueContainer,
        indicatorsContainer: () => comboboxStyles.indicatorsContainer,
        container: () => comboboxStyles.container,
        menu: () => comboboxStyles.menu,
        menuList: () => comboboxStyles.menuList,
        option: () => comboboxStyles.option,
        placeholder: () => comboboxStyles.placeholder,
        input: () => comboboxStyles.input,
        multiValue: () => comboboxStyles.multiValue,
        multiValueRemove: () => comboboxStyles.multiValueRemove,
      }}
      closeMenuOnSelect={false}
      value={props.value}
      isMulti
      options={props.options}
      placeholder={props.placeholder}
      onChange={props.onChange as any}
      isDisabled={props.disabled}
      onBlur={props.onBlur}
      isLoading={props.loading}
    />
  );
}

import React from 'react';
import clsx from 'clsx';
import { ChevronDown, CircleX } from 'lucide-react';
import Select, { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';

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
            <CircleX className="size-4" />
          </components.ClearIndicator>
        ),
        DropdownIndicator: compProps => (
          <components.DropdownIndicator {...compProps}>
            <ChevronDown className="size-4" />
          </components.DropdownIndicator>
        ),
        NoOptionsMessage: compProps => (
          <components.NoOptionsMessage {...compProps}>
            <div className="text-fg-secondary text-xs">
              {props.creatable ? 'Start typing to add values' : 'No options'}
            </div>
          </components.NoOptionsMessage>
        ),
      }}
      classNames={{
        control: () => clsx('bg-surface-selected! border-line! hover:border-accent! shadow-none!'),
        valueContainer: () => clsx('bg-surface-selected! rounded-xl!'),
        indicatorsContainer: () => clsx('bg-surface-selected! rounded-xl!'),
        container: () => clsx('bg-surface-selected! rounded-xl! shadow-lg! text-sm!'),
        menu: () => clsx('bg-surface-selected! rounded-xl! shadow-lg! text-xs!'),
        menuList: () => clsx('bg-surface-selected! rounded-lg! text-xs!'),
        option: () => clsx('bg-surface-selected! hover:bg-surface-hover! text-xs! cursor-pointer!'),
        placeholder: () => clsx('text-fg-secondary! text-xs!'),
        input: () => clsx('text-fg-secondary! text-xs!'),
        multiValue: () => clsx('text-fg-secondary! text-xs! bg-fg-secondary! font-bold!'),
        multiValueRemove: () =>
          clsx('text-fg-subtle text-xs! hover:bg-surface-inverse! hover:text-fg-inverse!'),
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

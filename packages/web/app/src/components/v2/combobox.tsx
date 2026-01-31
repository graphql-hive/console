import React from 'react';
import clsx from 'clsx';
import Select, { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { CaretDownIcon, CrossCircledIcon } from '@radix-ui/react-icons';

interface Option {
  value: string;
  label: string;
}

export function Combobox(
  props: React.PropsWithoutRef<{
    name: string;
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
      className={props.className}
      components={{
        ClearIndicator: compProps => (
          <components.ClearIndicator {...compProps}>
            <CrossCircledIcon />
          </components.ClearIndicator>
        ),
        DropdownIndicator: compProps => (
          <components.DropdownIndicator {...compProps}>
            <CaretDownIcon />
          </components.DropdownIndicator>
        ),
        NoOptionsMessage: compProps => (
          <components.NoOptionsMessage {...compProps}>
            <div className="text-neutral-10 text-xs">
              {props.creatable ? 'Start typing to add values' : 'No options'}
            </div>
          </components.NoOptionsMessage>
        ),
      }}
      classNames={{
        control: () =>
          clsx('bg-neutral-5! border-neutral-5! hover:border-orange brightness-90! shadow-none!'),
        valueContainer: () => clsx('bg-neutral-5! rounded-xl!'),
        indicatorsContainer: () => clsx('bg-neutral-5! rounded-xl!'),
        container: () => clsx('bg-neutral-5! rounded-xl! shadow-lg! text-sm!'),
        menu: () => clsx('bg-neutral-5! rounded-xl! shadow-lg! text-xs!'),
        menuList: () => clsx('bg-neutral-5! rounded-lg! text-xs!'),
        option: () => clsx('bg-neutral-5! hover:bg-neutral-2! text-xs! cursor-pointer!'),
        placeholder: () => clsx('text-neutral-10! text-xs!'),
        input: () => clsx('text-neutral-10! text-xs!'),
        multiValue: () => clsx('text-neutral-10! text-xs! bg-neutral-10! font-bold!'),
        multiValueRemove: () =>
          clsx('text-neutral-10! text-xs! hover:bg-neutral-11! hover:text-neutral-2!'),
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

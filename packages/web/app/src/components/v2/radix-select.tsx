import { ReactElement } from 'react';
import { clsx } from 'clsx';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import * as S from '@radix-ui/react-select';
import { SelectContentProps } from '@radix-ui/react-select';
import { RadixButton } from './radix-button';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function RadixSelect<T extends string>({
  className,
  options,
  onChange,
  defaultValue,
  value,
  position,
  name,
  placeholder,
  isDisabled,
}: {
  multiple?: boolean;
  className?: string;
  options: SelectOption[];
  onChange: (value: T) => void;
  defaultValue?: T;
  value?: T;
  placeholder?: string;
  position?: SelectContentProps['position'];
  name?: string;
  isDisabled?: boolean;
}): ReactElement {
  return (
    <S.Root
      defaultValue={defaultValue}
      onValueChange={onChange}
      value={value}
      name={name}
      disabled={isDisabled}
    >
      <S.Trigger asChild aria-label="">
        <RadixButton className={className}>
          <S.Value placeholder={placeholder} />
          {isDisabled ? null : (
            <S.Icon className="ml-2">
              <ChevronDownIcon />
            </S.Icon>
          )}
        </RadixButton>
      </S.Trigger>
      <S.Content className="bg-neutral-12 z-50 rounded-lg p-2 shadow-lg" position={position}>
        <S.ScrollUpButton className="text-neutral-2 flex items-center justify-center">
          <ChevronUpIcon />
        </S.ScrollUpButton>
        <S.Viewport>
          <S.Group>
            {options.map(({ value, label, disabled }) => (
              <S.Item
                disabled={disabled}
                key={value}
                value={value}
                className={clsx(
                  'focus:bg-neutral-11 text-neutral-2 relative flex items-center rounded-md px-8 py-2 text-sm font-medium',
                  'data-disabled:opacity-50',
                  'cursor-pointer select-none focus:outline-none',
                )}
              >
                <S.ItemText>{label}</S.ItemText>
                <S.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <CheckIcon />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Group>
        </S.Viewport>
        <S.ScrollDownButton className="text-neutral-2 flex items-center justify-center">
          <ChevronDownIcon />
        </S.ScrollDownButton>
      </S.Content>
    </S.Root>
  );
}

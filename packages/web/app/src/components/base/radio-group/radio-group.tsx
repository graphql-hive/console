import { type ReactNode } from 'react';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { buttonVariants } from '../button/button';

export function RadioGroup({
  children,
  value,
  onValueChange,
}: {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <BaseRadioGroup value={value} onValueChange={onValueChange} className="flex items-center gap-1">
      {children}
    </BaseRadioGroup>
  );
}

export function RadioItem({
  value,
  label,
  indicator,
}: {
  value: string;
  label: string;
  /** Optional visual indicator (e.g. a colored dot) rendered before the label */
  indicator?: ReactNode;
}) {
  return (
    <BaseRadio.Root
      value={value}
      className={state => buttonVariants({ variant: state.checked ? 'active' : 'default' })}
    >
      <span className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[13px]">
        {indicator}
        {label}
      </span>
    </BaseRadio.Root>
  );
}

import { ComponentProps, ReactElement } from 'react';
import clsx from 'clsx';
import { ArrowDownIcon } from '@/components/ui/icon';

export function Select({
  options,
  className,
  value,
  isInvalid,
  ...props
}: ComponentProps<'select'> & {
  options?: { name: string; value: string }[];
  placeholder?: string;
  isInvalid?: boolean;
}): ReactElement {
  return (
    <div className={clsx('relative w-full', className)}>
      <ArrowDownIcon className="text-neutral-10 absolute right-4 translate-y-1/2" />
      <select
        value={value}
        className={clsx(
          'bg-neutral-5 active:bg-neutral-2 h-[50px] w-full text-ellipsis rounded-sm border pl-4 pr-10 text-sm font-medium transition focus:ring',
          isInvalid
            ? 'border-red-500 text-red-500'
            : ['border-transparent', value ? 'text-neutral-12' : 'text-neutral-10'],
        )}
        {...props}
      >
        {props.placeholder ? <option value="">{props.placeholder}</option> : null}
        {options?.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

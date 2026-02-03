import { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { CheckboxProps, Indicator, Root } from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';

export const Checkbox = (props: CheckboxProps): ReactElement => {
  return (
    <Root
      {...props}
      className={cn(
        'bg-neutral-5 border-neutral-2 text-neutral-2 disabled:border-neutral-2 flex size-5 shrink-0 items-center justify-center rounded-sm border hover:border-orange-700 disabled:cursor-not-allowed',
        props.className,
      )}
    >
      <Indicator className="flex size-full items-center justify-center bg-current">
        <CheckIcon className="text-neutral-1" />
      </Indicator>
    </Root>
  );
};

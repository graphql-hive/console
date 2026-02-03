import { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { CheckboxProps, Indicator, Root } from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';

export const Checkbox = (props: CheckboxProps): ReactElement => {
  return (
    <Root
      {...props}
      className={cn(
        'bg-neutral-5 border-neutral-2 text-neutral-2 disabled:border-neutral-2 hover:border-accent_30 flex size-5 shrink-0 items-center justify-center rounded-sm border disabled:cursor-not-allowed',
        props.className,
      )}
    >
      <Indicator className="data-[state=checked]:bg-accent_10 data-[state=checked]:border-accent_10 flex size-full items-center justify-center border-none">
        <CheckIcon className="text-accent" />
      </Indicator>
    </Root>
  );
};

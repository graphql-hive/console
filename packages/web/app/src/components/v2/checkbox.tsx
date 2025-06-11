import { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { CheckboxProps, Indicator, Root } from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';

export const Checkbox = (props: CheckboxProps): ReactElement => {
  return (
    <Root
      {...props}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm border border-orange-500 bg-gray-800 text-orange-500 hover:border-orange-700 disabled:cursor-not-allowed disabled:border-gray-900',
        props.className,
      )}
    >
      <Indicator className="flex size-full items-center justify-center bg-current">
        <CheckIcon className="text-black" />
      </Indicator>
    </Root>
  );
};

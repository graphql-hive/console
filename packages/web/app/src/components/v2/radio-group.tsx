import { ReactElement } from 'react';
import clsx from 'clsx';
import { Item, RadioGroupItemProps, RadioGroupProps, Root } from '@radix-ui/react-radio-group';

export const RadioGroup = ({ children, className, ...props }: RadioGroupProps): ReactElement => {
  return (
    <Root className={clsx('flex flex-col justify-items-stretch gap-4', className)} {...props}>
      {children}
    </Root>
  );
};

export const Radio = ({ children, className, ...props }: RadioGroupItemProps): ReactElement => {
  return (
    <Item
      className={clsx(
        'data-[state=checked]:border-neutral-2 relative overflow-hidden rounded-sm border text-left focus:ring',
        !props.disabled && 'hover:border-neutral-2/50',
        className,
      )}
      {...props}
    >
      {children}
    </Item>
  );
};

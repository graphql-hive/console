import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LightningBoltIcon,
} from '@radix-ui/react-icons';

const TypeToEmoji = {
  default: <LightningBoltIcon className="h-6 w-auto" />,
  error: <CrossCircledIcon className="h-6 w-auto" />,
  info: <InfoCircledIcon className="h-6 w-auto" />,
  warning: <ExclamationTriangleIcon className="h-6 w-auto" />,
};

type CalloutType = keyof typeof TypeToEmoji;

const calloutVariants = cva('mt-6 flex items-center gap-4 rounded-lg border px-4 py-2', {
  variants: {
    type: {
      default: 'border-orange-300 bg-orange-200 text-orange-900',
      error: 'border-red-300 bg-red-200 text-red-900',
      info: 'border-blue-300 bg-blue-200 text-blue-900',
      warning: 'border-yellow-300 bg-yellow-200 text-yellow-900',
    },
  },
  defaultVariants: {
    type: 'default',
  },
});

type CalloutProps = {
  type?: CalloutType;
  emoji?: string | React.ReactElement;
  children: React.ReactNode;
  className?: string;
};

const Callout = React.forwardRef<
  HTMLDivElement,
  CalloutProps & VariantProps<typeof calloutVariants>
>(({ children, type = 'default', emoji = TypeToEmoji[type], className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn(calloutVariants({ type }), className)} {...props}>
      <div
        className="select-none text-xl"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        {emoji}
      </div>
      <div className="w-full min-w-0 leading-7">{children}</div>
    </div>
  );
});

Callout.displayName = 'Callout';

export { Callout };

import React from 'react';
import { CircleXIcon, InfoIcon, TriangleAlertIcon, ZapIcon } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { cn } from '@/lib/utils';
import { calloutStyles } from './callout.css';

const TypeToEmoji = {
  default: <ZapIcon className={calloutStyles.icon} />,
  error: <CircleXIcon className={calloutStyles.icon} />,
  info: <InfoIcon className={calloutStyles.icon} />,
  warning: <TriangleAlertIcon className={calloutStyles.icon} />,
};

type CalloutType = keyof typeof TypeToEmoji;

const calloutVariants = lenient(calloutStyles.root);

type CalloutProps = {
  type?: CalloutType;
  emoji?: string | React.ReactElement;
  children: React.ReactNode;
  className?: string;
};

const Callout = React.forwardRef<
  HTMLDivElement,
  CalloutProps & NonNullable<Parameters<typeof calloutVariants>[0]>
>(({ children, type = 'default', emoji = TypeToEmoji[type], className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn(calloutVariants({ type }), className)} {...props}>
      <div
        className={calloutStyles.emoji}
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        {emoji}
      </div>
      <div>{children}</div>
    </div>
  );
});

Callout.displayName = 'Callout';

export { Callout };

import { cn } from '../lib/utils';

type CalloutType = 'note' | 'tip' | 'warning' | 'critical' | 'info' | 'success';

interface CalloutProps {
  type: CalloutType;
  children: React.ReactNode;
  title?: string;
}

const calloutConfig: Record<
  CalloutType,
  {
    title: string;
    bgColor: string;
    borderColor: string;
    titleColor: string;
  }
> = {
  note: {
    title: 'Note',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-400',
    titleColor: 'text-blue-400',
  },
  tip: {
    title: 'Tip',
    bgColor: 'bg-purple-950/30',
    borderColor: 'border-purple-400',
    titleColor: 'text-purple-400',
  },
  warning: {
    title: 'Warning',
    bgColor: 'bg-yellow-950/30',
    borderColor: 'border-yellow-400',
    titleColor: 'text-yellow-400',
  },
  critical: {
    title: 'critical',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-400',
    titleColor: 'text-red-400',
  },
  info: {
    title: 'Info',
    bgColor: 'bg-cyan-950/30',
    borderColor: 'border-cyan-400',
    titleColor: 'text-cyan-400',
  },
  success: {
    title: 'Success',
    bgColor: 'bg-green-950/30',
    borderColor: 'border-green-400',
    titleColor: 'text-green-400',
  },
};

export function Callout({ type, children, title }: CalloutProps) {
  const config = calloutConfig[type];

  return (
    <div className={cn(config.bgColor, config.borderColor, 'mt-6 border-l-2 p-4')}>
      <div className="min-w-0 flex-1 text-white">
        <div
          className={cn('mb-2 font-mono text-sm font-medium uppercase', config.titleColor)}
          style={{
            letterSpacing: '0.05em',
          }}
        >
          {title ?? config.title}
        </div>
        {/* I used [&_*]:!leading-[inherit] to override line-height forced by nextra */}
        <div className={cn('[&_*]:!leading-[inherit]')}>{children}</div>
      </div>
    </div>
  );
}

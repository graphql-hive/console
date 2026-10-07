import { useState, type MouseEventHandler } from 'react';
import { Box, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export enum ServiceHeadingType {
  NEW,
  DELETED,
}

export function ServiceHeading(props: {
  serviceName: string;
  type?: ServiceHeadingType;
  onClick?: MouseEventHandler<HTMLDivElement>;
  showToggleIcon?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  if (props.serviceName.length === 0) {
    return null;
  }
  const showToggleIcon = props.showToggleIcon ?? props.onClick !== undefined;
  return (
    <div
      className={cn(
        'mt-2 flex flex-row items-center rounded-sm bg-accent-tint px-4 py-2 text-base font-semibold text-accent',
        props.onClick !== undefined && 'cursor-pointer hover:underline',
        props.onClick !== undefined && isOpen && 'rounded-b-none',
      )}
      onClick={e => {
        props.onClick?.(e);
        setIsOpen(!isOpen);
      }}
    >
      <div className="flex grow flex-row items-center">
        <Box className="mr-2 size-4" />
        <span>{props.serviceName}</span>
        {props.type === ServiceHeadingType.NEW ? (
          <span className="ml-2 text-xs text-success">*NEW*</span>
        ) : null}
        {props.type === ServiceHeadingType.DELETED ? (
          <span className="ml-2 text-xs text-critical">*DELETED*</span>
        ) : null}
      </div>
      {showToggleIcon && (
        <div className="flex">
          <ChevronDown className={cn('size-4 transition', isOpen && '-rotate-180')} />
        </div>
      )}
    </div>
  );
}

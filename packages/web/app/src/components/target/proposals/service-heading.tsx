import { useState, type MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CubeIcon } from '@radix-ui/react-icons';

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
        'text-accent bg-accent_10 mt-2 flex flex-row items-center rounded-sm px-4 py-2 text-base font-semibold',
        props.onClick !== undefined && 'cursor-pointer hover:underline',
        props.onClick !== undefined && isOpen && 'rounded-b-none',
      )}
      onClick={e => {
        props.onClick?.(e);
        setIsOpen(!isOpen);
      }}
    >
      <div className="flex grow flex-row items-center">
        <CubeIcon className="mr-2" />
        <span>{props.serviceName}</span>
        {props.type === ServiceHeadingType.NEW ? (
          <span className="ml-2 text-xs text-green-500">*NEW*</span>
        ) : null}
        {props.type === ServiceHeadingType.DELETED ? (
          <span className="ml-2 text-xs text-red-500">*DELETED*</span>
        ) : null}
      </div>
      {showToggleIcon && (
        <div className="flex">
          <ChevronDownIcon className={cn('transition', isOpen && '-rotate-180')} />
        </div>
      )}
    </div>
  );
}

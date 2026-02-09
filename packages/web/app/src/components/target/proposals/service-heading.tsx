import type { MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { CubeIcon } from '@radix-ui/react-icons';

export enum ServiceHeadingType {
  NEW,
  DELETED,
}

export function ServiceHeading(props: {
  serviceName: string;
  type?: ServiceHeadingType;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  if (props.serviceName.length === 0) {
    return null;
  }
  return (
    <div
      className={cn(
        'flex flex-row items-center border-b-2 px-4 pb-2 pt-4 text-base font-semibold',
        props.onClick !== undefined && 'cursor-pointer',
      )}
      onClick={props.onClick}
    >
      <CubeIcon className="mr-2" />
      <span>{props.serviceName}</span>
      {props.type === ServiceHeadingType.NEW ? (
        <span className="ml-2 text-xs text-green-500">*NEW*</span>
      ) : null}
      {props.type === ServiceHeadingType.DELETED ? (
        <span className="ml-2 text-xs text-red-500">*DELETED*</span>
      ) : null}
    </div>
  );
}

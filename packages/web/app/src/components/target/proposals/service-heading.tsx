import { useState, type MouseEventHandler } from 'react';
import { Box, ChevronDown } from 'lucide-react';
import * as shared from '@/styles/shared.css';
import { serviceHeadingStyles } from './service-heading.css';

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
      className={serviceHeadingStyles.root({
        interactive: props.onClick !== undefined,
        open: props.onClick !== undefined && isOpen,
      })}
      onClick={e => {
        props.onClick?.(e);
        setIsOpen(!isOpen);
      }}
    >
      <div className={serviceHeadingStyles.title}>
        <Box className={serviceHeadingStyles.icon} />
        <span>{props.serviceName}</span>
        {props.type === ServiceHeadingType.NEW ? (
          <span className={serviceHeadingStyles.added}>*NEW*</span>
        ) : null}
        {props.type === ServiceHeadingType.DELETED ? (
          <span className={serviceHeadingStyles.removed}>*DELETED*</span>
        ) : null}
      </div>
      {showToggleIcon && (
        <div className={shared.flex}>
          <ChevronDown className={serviceHeadingStyles.chevron({ open: isOpen })} />
        </div>
      )}
    </div>
  );
}

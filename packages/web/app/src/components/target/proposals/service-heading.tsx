import { useState, type MouseEventHandler } from 'react';
import { Box, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import * as styles from './service-heading.css';

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
        styles.serviceHeadingDiv,
        props.onClick !== undefined && styles.serviceHeadingDiv2,
        props.onClick !== undefined && isOpen && styles.serviceHeadingDiv3,
      )}
      onClick={e => {
        props.onClick?.(e);
        setIsOpen(!isOpen);
      }}
    >
      <div className={styles.serviceHeadingDiv4}>
        <Box className={styles.serviceHeadingBox} />
        <span>{props.serviceName}</span>
        {props.type === ServiceHeadingType.NEW ? (
          <span className={styles.serviceHeadingSpan}>*NEW*</span>
        ) : null}
        {props.type === ServiceHeadingType.DELETED ? (
          <span className={styles.serviceHeadingSpan2}>*DELETED*</span>
        ) : null}
      </div>
      {showToggleIcon && (
        <div className={shared.flex}>
          <ChevronDown
            className={cn(
              styles.serviceHeadingChevronDown,
              isOpen && styles.serviceHeadingChevronDown2,
            )}
          />
        </div>
      )}
    </div>
  );
}

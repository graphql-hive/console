import { cn } from '../../lib/utils';
import css from './ecosystem-management.module.css';

export interface DashedLineProps extends React.SVGProps<SVGSVGElement> {
  short?: boolean;
}

export function DashedLine({ short, className, ...rest }: DashedLineProps) {
  const commonProps: React.SVGProps<SVGSVGElement> = {
    preserveAspectRatio: 'none',
    stroke: 'currentColor',
    fill: 'none',
    vectorEffect: 'non-scaling-stroke',
    ...rest,
  };

  if (short) {
    return (
      <svg
        {...commonProps}
        width="111"
        viewBox="0 0 111 114"
        className={cn('h-full overflow-visible', css['animate-dash-reverse'], className)}
      >
        <path
          d="M0 112.5H31.3352C44.59 112.5 55.3351 101.755 55.3352 88.5001L55.3355 25.4999C55.3356 12.2451 66.0807 1.50001 79.3355 1.5L111 1.5"
          strokeWidth="3"
          strokeDasharray="3 6"
        />
      </svg>
    );
  }

  return (
    <svg
      {...commonProps}
      width="107"
      viewBox="0 0 107 326"
      className={cn('h-full overflow-visible', css['animate-dash'], className)}
    >
      <path
        d="M 150 0 H 77.659 c -13.255 0 -24 10.745 -24 24 V 303.5 c 0 13.255 -10.746 24 -24 24 H 0"
        strokeWidth={3}
        strokeDasharray="3 6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

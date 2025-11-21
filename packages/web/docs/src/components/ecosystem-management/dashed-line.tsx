import { cn } from '../../lib/utils';
import css from './ecosystem-management.module.css';

export interface DashedLineProps extends React.SVGProps<SVGSVGElement> {
  short?: boolean;
}

export function DashedLine(props: DashedLineProps) {
  if (props.short) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="111"
        height="114"
        viewBox="0 0 111 114"
        stroke="currentColor"
        fill="none"
        className={cn('overflow-visible', css['animate-dash-reverse'], props.className)}
      >
        <path
          d="M0 112.5H31.3352C44.59 112.5 55.3351 101.755 55.3352 88.5001L55.3355 25.4999C55.3356 12.2451 66.0807 1.50001 79.3355 1.5L111 1.5"
          stroke-width="3"
          stroke-dasharray="3 6"
        />
      </svg>
    );
  }

  return (
    <svg
      width={107}
      height={326}
      viewBox="0 0 107 326"
      stroke="currentColor"
      fill="none"
      {...props}
      className={cn('overflow-visible', css['animate-dash'], props.className)}
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

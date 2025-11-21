import { cn } from '../../lib/utils';

export function DashedLine(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={107}
      height={326}
      viewBox="0 0 107 326"
      stroke="currentColor"
      fill="none"
      {...props}
      className={cn('overflow-visible', props.className)}
    >
      <path
        d="M 150 0 H 77.659 c -13.255 0 -24 10.745 -24 24 V 303.5 c 0 13.255 -10.746 24 -24 24 H 0"
        strokeWidth={3}
        strokeDasharray="3 6"
      />
    </svg>
  );
}

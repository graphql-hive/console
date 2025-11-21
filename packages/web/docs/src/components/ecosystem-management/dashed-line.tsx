export function DashedLine(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={107}
      height={326}
      viewBox="0 0 107 326"
      stroke="currentColor"
      fill="none"
      {...props}
    >
      <path
        d="M107 1.5H77.659c-13.255 0-24 10.745-24 24v275c0 13.255-10.746 24-24 24H0"
        strokeWidth={3}
        strokeDasharray="3 6"
      />
    </svg>
  );
}

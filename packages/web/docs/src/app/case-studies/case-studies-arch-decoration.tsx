import { ReactNode } from 'react';

export function CaseStudiesArchDecoration(props: { className?: string; gradientId: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="385"
      height="220"
      viewBox="0 0 385 220"
      fill="none"
      className={props.className}
    >
      <path
        d="M8.34295e-06 190.864C7.8014e-06 178.475 4.93233 166.577 13.6983 157.811L81.769 89.7401L89.7401 81.769L157.811 13.6983C166.577 4.93231 178.475 -7.8014e-06 190.864 -8.34295e-06L585 -1.87959e-05L585 89.7401L159.868 89.7401C121.134 89.7401 89.7401 121.134 89.7401 159.868L89.7402 228L1.87959e-05 228L8.34295e-06 190.864Z"
        fill={`url(#${props.gradientId})`}
      />
    </svg>
  );
}

export function CaseStudiesGradientDefs(props: { gradientId: string; stops: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="385"
      height="220"
      viewBox="0 0 385 220"
      fill="none"
      className="absolute size-0"
    >
      <defs>
        <linearGradient
          id={props.gradientId}
          x1="71.4243"
          y1="25.186"
          x2="184.877"
          y2="282.363"
          gradientUnits="userSpaceOnUse"
        >
          {props.stops}
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ReactLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23174 23 20.46348" {...props}>
      <rect
        x={-11.5}
        y={-10.231_74}
        width={23}
        height={20.463_48}
        fill="url(#react_paint0_linear)"
        mask="url(#react_logo_mask)"
      />
      <defs>
        <g id="react_logo_icon">
          <circle r={2.05} fill="#fff" />
          <g fill="none" stroke="#fff" strokeWidth={1}>
            <ellipse rx={11} ry={4.2} />
            <ellipse rx={11} ry={4.2} transform="rotate(60)" />
            <ellipse rx={11} ry={4.2} transform="rotate(120)" />
          </g>
        </g>
        <mask
          id="react_logo_mask"
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={-11.5}
          y={-10.231_74}
          width={23}
          height={20.463_48}
        >
          <use href="#react_logo_icon" />
        </mask>
        <linearGradient
          id="react_paint0_linear"
          x1={-11.5}
          y1={-10.231_74}
          x2={11.5}
          y2={10.231_74}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8CBEB3" />
          <stop offset={1} stopColor="#68A8B6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

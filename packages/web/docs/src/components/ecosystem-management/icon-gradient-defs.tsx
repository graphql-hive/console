/**
 * This must be included in one of the SVGs here so they work nicely in Safari.
 */
export function IconGradientDefs() {
  return (
    <svg className="absolute size-0">
      <defs>
        <linearGradient
          id="linear-blue"
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="#8CBEB3" />
          <stop offset="1" stopColor="#68A8B6" />
        </linearGradient>
        <linearGradient
          id="linear-white"
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}

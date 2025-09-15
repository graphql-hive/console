// these are different than CheckIcon and CloseIcon we have in the design system

export function CheckmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M6.66668 10.1134L12.7947 3.98608L13.7373 4.92875L6.66668 11.9994L2.42401 7.75675L3.36668 6.81408L6.66668 10.1134Z" />
    </svg>
  );
}

export function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M7.99999 7.05806L11.3 3.75806L12.2427 4.70072L8.94266 8.00072L12.2427 11.3007L11.2993 12.2434L7.99932 8.94339L4.69999 12.2434L3.75732 11.3001L7.05732 8.00006L3.75732 4.70006L4.69999 3.75872L7.99999 7.05806Z" />
    </svg>
  );
}

export function GatewayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 256 256"
      height="24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z" />
    </svg>
  );
}

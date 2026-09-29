import type { ReactNode } from 'react';

type Size = { height: number; width: number; scaledHeight: number; scaledWidth: number };

// jsdom measures every box as 0, and the real AutoSizer renders nothing until it has a size.
export default function AutoSizer(props: { children: (size: Size) => ReactNode }) {
  return <>{props.children({ height: 800, width: 1200, scaledHeight: 800, scaledWidth: 1200 })}</>;
}

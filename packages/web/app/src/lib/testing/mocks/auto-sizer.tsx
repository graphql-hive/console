import type { ReactNode } from 'react';

type Size = { height: number | undefined; width: number | undefined };

// jsdom measures every box as 0, and the real AutoSizer renders nothing until it has a size.
export function AutoSizer(props: { renderProp: (size: Size) => ReactNode }) {
  return <>{props.renderProp({ height: 800, width: 1200 })}</>;
}

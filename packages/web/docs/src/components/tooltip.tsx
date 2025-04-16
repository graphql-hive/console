import { ReactNode } from 'react';
import { Content, Root, Trigger } from '@radix-ui/react-tooltip';

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <Root delayDuration={350}>
      <Trigger className="hive-focus -mx-1 -my-0.5 rounded px-1 py-0.5 text-left">
        {children}
      </Trigger>
      <Content
        align="start"
        sideOffset={5}
        className="bg-green-1000 z-20 rounded px-2 py-0.5 text-sm font-normal leading-4 text-white shadow"
      >
        {content}
        <svg
          // radix arrow is in wrong spot, so I added a custom one
          width="10"
          height="14"
          viewBox="0 0 12 16"
          fill="currentColor"
          className="text-green-1000 absolute bottom-0 left-1/3 -translate-x-1/2 translate-y-1/2"
        >
          <path d="M0 8L6 0L12 8L6 16L0 8Z" />
        </svg>
      </Content>
    </Root>
  );
}

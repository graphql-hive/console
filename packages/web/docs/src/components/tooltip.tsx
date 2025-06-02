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
        className="bg-green-1000 z-20 rounded px-2 py-[3px] text-sm font-normal text-white shadow"
      >
        {content}
        <TooltipArrow className="text-green-1000 absolute bottom-0 left-1/3 -translate-x-1/2 translate-y-full" />
      </Content>
    </Root>
  );
}

function TooltipArrow(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="10" height="5" viewBox="0 0 8 4" fill="currentColor" {...props}>
      <path d="M5.06066 2.93934C4.47487 3.52513 3.52513 3.52513 2.93934 2.93934L-6.03983e-07 -6.99382e-07L8 0L5.06066 2.93934Z" />
    </svg>
  );
}

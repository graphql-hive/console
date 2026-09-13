import { ComponentProps, ReactElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { useFloatingPortalContainer } from '@/components/base/floating/floating-portal-container';
import * as T from '@radix-ui/react-tooltip';

function Wrapper({
  children,
  content,
  contentProps = {},
}: {
  children: ReactNode;
  content: ReactNode;
  contentProps?: ComponentProps<typeof T.Content>;
}): ReactElement {
  // Kept only for the inventory's old-side transcriptions until 6.12 deletes this file.
  const container = useFloatingPortalContainer();
  const innerContent = (
    <T.Content
      sideOffset={4}
      {...contentProps}
      className={clsx(
        'data-[side=top]:animate-slide-down-fade',
        'data-[side=right]:animate-slide-left-fade',
        'data-[side=bottom]:animate-slide-up-fade',
        'data-[side=left]:animate-slide-right-fade',
        'bg-neutral-5 text-neutral-12 rounded-lg p-4 text-xs font-normal shadow-sm',
        contentProps.className,
      )}
    >
      <T.Arrow className="fill-neutral-5" />
      {content}
    </T.Content>
  );

  return (
    <T.Provider>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        {container ? <T.Portal container={container}>{innerContent}</T.Portal> : innerContent}
      </T.Root>
    </T.Provider>
  );
}

export const Tooltip = Object.assign(Wrapper, { Provider: T.Provider });

import { createContext, useContext } from 'react';
import { GripVerticalIcon } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '../../lib/utils';

type Orientation = NonNullable<React.ComponentProps<typeof Group>['orientation']>;

// v4 exposes the orientation only as aria-orientation on the separator, so the group shares it
// with the handle for the vertical-layout styles below.
const OrientationContext = createContext<Orientation>('horizontal');

function ResizablePanelGroup({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <OrientationContext.Provider value={orientation}>
      <Group
        data-slot="resizable-panel-group"
        orientation={orientation}
        data-orientation={orientation}
        className={cn('size-full', className)}
        {...props}
      />
    </OrientationContext.Provider>
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  const orientation = useContext(OrientationContext);
  return (
    <Separator
      data-slot="resizable-handle"
      data-orientation={orientation}
      className={cn(
        'bg-border focus-visible:ring-ring focus-visible:outline-hidden relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border rounded-xs z-10 flex h-4 w-3 items-center justify-center border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

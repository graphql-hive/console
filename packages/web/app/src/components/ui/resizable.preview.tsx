import { createPreview, type NavPath } from 'react-foundry';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';

export const nav: NavPath = 'Components/Resizable';

function Pane({ label }: { label: string }) {
  return (
    <div className="text-fg-secondary flex h-full items-center justify-center text-xs">{label}</div>
  );
}

/**
 * The trace page's split, the only call site: span waterfall over span details, 70/30 with a
 * grip on the divider. Drag it, double-click it to reset, and use the arrow keys once it has
 * focus. The box has the fixed height a vertical group needs for its percentages to mean anything.
 */
export const TraceSplit = createPreview(() => (
  <div className="border-line h-[28rem] w-[48rem] rounded-md border border-dashed">
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize="70%" minSize="20%" maxSize="80%">
        <Pane label="Span waterfall (defaultSize 70%, minSize 20%, maxSize 80%)" />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="30%" minSize="10%" maxSize="80%">
        <Pane label="Span details (defaultSize 30%, minSize 10%, maxSize 80%)" />
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
));

/** The default orientation, side by side, with the bare divider and no grip. */
export const Horizontal = createPreview(() => (
  <div className="border-line h-[16rem] w-[48rem] rounded-md border border-dashed">
    <ResizablePanelGroup>
      <ResizablePanel defaultSize="50%" minSize="10%">
        <Pane label="Left" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="50%" minSize="10%">
        <Pane label="Right" />
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
));

import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Popover } from './popover';

export const nav: NavPath = 'Base/Floating/Popover';

/** Structured mode: pass `title` and the header with close button is rendered for you. */
export const Structured = createPreview(() => (
  <Popover
    trigger={<Button label="Alert details" />}
    title="Alert details"
    description="Configure the threshold and notification settings."
    content={
      <div className="space-y-2 text-sm">
        <div className="text-neutral-11">
          Status: <span className="text-success">Normal</span>
        </div>
        <div className="text-neutral-11">Last evaluated: 2 minutes ago</div>
      </div>
    }
  />
));

/** Raw mode: no `title`, so content is rendered directly with no header or padding. */
export const Raw = createPreview(() => (
  <Popover
    trigger={<Button label="Info" />}
    content={
      <p className="text-neutral-11 p-3 text-sm">
        A raw popover with custom content and no header.
      </p>
    }
  />
));

export const WithArrow = createPreview(() => (
  <Popover
    trigger={<Button label="With arrow" />}
    title="Tooltip-style"
    content={<p className="text-neutral-11 text-sm">Arrows point back at the trigger.</p>}
    arrow
  />
));

export const Widths = createPreview(() => (
  <div className="flex items-center gap-4">
    <Popover
      trigger={<Button label="Small" />}
      title="Small"
      width="sm"
      content={<p className="text-neutral-11 text-sm">w-64</p>}
    />
    <Popover
      trigger={<Button label="Medium" />}
      title="Medium"
      width="md"
      content={<p className="text-neutral-11 text-sm">w-80, the default</p>}
    />
    <Popover
      trigger={<Button label="Large" />}
      title="Large"
      width="lg"
      content={<p className="text-neutral-11 text-sm">w-96</p>}
    />
  </div>
));

export const Sides = createPreview(() => (
  <div className="flex items-center gap-4">
    <Popover
      trigger={<Button label="Top" />}
      side="top"
      content={<p className="text-neutral-11 p-3 text-sm">side=&quot;top&quot;</p>}
    />
    <Popover
      trigger={<Button label="Right" />}
      side="right"
      content={<p className="text-neutral-11 p-3 text-sm">side=&quot;right&quot;</p>}
    />
    <Popover
      trigger={<Button label="Bottom" />}
      side="bottom"
      content={<p className="text-neutral-11 p-3 text-sm">side=&quot;bottom&quot;</p>}
    />
    <Popover
      trigger={<Button label="Left" />}
      side="left"
      content={<p className="text-neutral-11 p-3 text-sm">side=&quot;left&quot;</p>}
    />
  </div>
));

export const NoCloseButton = createPreview(() => (
  <Popover
    trigger={<Button label="No close button" />}
    title="Read only"
    hideCloseButton
    content={<p className="text-neutral-11 text-sm">Dismiss by clicking outside.</p>}
  />
));

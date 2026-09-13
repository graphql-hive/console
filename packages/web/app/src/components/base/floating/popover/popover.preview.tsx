import { useRef, useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Input } from '../../input/input';
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

/** Raw mode: no `title`, so content is rendered directly with no header. Padded by default. */
export const Raw = createPreview(() => (
  <Popover
    trigger={<Button label="Info" />}
    content={<p className="text-neutral-11 text-sm">A raw popover with custom content.</p>}
  />
));

/**
 * `padding="none"` for content that lays itself out edge to edge: a list of rows, a calendar,
 * a panel with its own header rule.
 */
export const RawPadding = createPreview(() => (
  <div className="flex items-center gap-4">
    <Popover
      trigger={<Button label="Default padding" />}
      content={<p className="text-neutral-11 text-sm">p-4 around the content.</p>}
    />
    <Popover
      trigger={<Button label="No padding" />}
      padding="none"
      content={
        <ul className="text-neutral-11 text-sm">
          {['getUser', 'listProjects', 'createTarget'].map(op => (
            <li key={op} className="border-neutral-5 border-b px-3 py-2 last:border-b-0">
              {op}
            </li>
          ))}
        </ul>
      }
    />
  </div>
));

export const WithArrow = createPreview(() => (
  <Popover
    trigger={<Button label="With arrow" />}
    title="Tooltip-style"
    content={<p className="text-neutral-11 text-sm">Arrows point back at the trigger.</p>}
    arrow
  />
));

/**
 * One scale for both modes. Raw defaults to `sm` (the legacy popover's width), structured to
 * `md`. `lg` and `xl` are the two widest panels in the app, rounded to the rem grid.
 */
export const Widths = createPreview(() => (
  <div className="flex flex-wrap items-center gap-4">
    <Popover
      trigger={<Button label="auto" />}
      width="auto"
      content={<p className="text-neutral-11 text-sm">Sizes to content.</p>}
    />
    <Popover
      trigger={<Button label="sm" />}
      width="sm"
      content={<p className="text-neutral-11 text-sm">w-72, 288px. The raw default.</p>}
    />
    <Popover
      trigger={<Button label="md" />}
      width="md"
      content={<p className="text-neutral-11 text-sm">w-80, 320px. The structured default.</p>}
    />
    <Popover
      trigger={<Button label="lg" />}
      width="lg"
      content={<p className="text-neutral-11 text-sm">28rem, 448px. Was 450.</p>}
    />
    <Popover
      trigger={<Button label="xl" />}
      width="xl"
      content={<p className="text-neutral-11 text-sm">34rem, 544px. Was 550.</p>}
    />
  </div>
));

export const Sides = createPreview(() => (
  <div className="flex items-center gap-4">
    <Popover
      trigger={<Button label="Top" />}
      side="top"
      content={<p className="text-neutral-11 text-sm">side=&quot;top&quot;</p>}
    />
    <Popover
      trigger={<Button label="Right" />}
      side="right"
      content={<p className="text-neutral-11 text-sm">side=&quot;right&quot;</p>}
    />
    <Popover
      trigger={<Button label="Bottom" />}
      side="bottom"
      content={<p className="text-neutral-11 text-sm">side=&quot;bottom&quot;</p>}
    />
    <Popover
      trigger={<Button label="Left" />}
      side="left"
      content={<p className="text-neutral-11 text-sm">side=&quot;left&quot;</p>}
    />
  </div>
));

/**
 * The close button works uncontrolled now: it is a Base UI `Close` rather than a call to an
 * `onOpenChange` the call site may not have passed.
 */
export const NoCloseButton = createPreview(() => (
  <div className="flex items-center gap-4">
    <Popover
      trigger={<Button label="With close button" />}
      title="Uncontrolled"
      content={<p className="text-neutral-11 text-sm">The X closes this.</p>}
    />
    <Popover
      trigger={<Button label="No close button" />}
      title="Read only"
      hideCloseButton
      content={<p className="text-neutral-11 text-sm">Dismiss by clicking outside.</p>}
    />
  </div>
));

/**
 * `anchor` positions the popup against an element that is not its trigger. The date-range
 * picker's shape: a calendar opened from a button inside a field, but placed beside the whole
 * panel the field is in. No `trigger` at all; the call site controls `open`.
 */
export const AnchoredToSibling = createPreview(() => {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={panel}
      className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex w-72 flex-col gap-3 rounded-md border p-4"
    >
      <span className="text-neutral-11 text-xs">A panel with a field in it</span>
      <div className="flex items-center gap-2">
        <Input value="2026-09-01" readOnly />
        <Button label="Pick" onClick={() => setOpen(o => !o)} />
      </div>
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={panel}
        side="left"
        sideOffset={4}
        collisionPadding={8}
        width="auto"
        content={
          <p className="text-neutral-11 text-sm">
            Positioned against the panel, not the Pick button.
          </p>
        }
      />
    </div>
  );
});

/**
 * An Input as the trigger. `initialFocus={false}` keeps focus in the field while the popup is
 * open, so typing filters the suggestions instead of being swallowed by the popup.
 */
export const InputTrigger = createPreview(() => {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const tags = ['public', 'internal', 'deprecated', 'beta'].filter(t => t.includes(value));
  return (
    <div className="w-64">
      <Popover
        open={open && tags.length > 0}
        onOpenChange={setOpen}
        initialFocus={false}
        padding="none"
        width="auto"
        align="start"
        trigger={
          <Input
            placeholder="Add a tag"
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        }
        content={
          <ul className="text-neutral-11 w-48 text-sm">
            {tags.map(t => (
              <li key={t} className="hover:bg-neutral-4 cursor-pointer px-3 py-1.5">
                {t}
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
});

/** `modal` blocks the page behind the popup. For a panel that is a task, not a glance. */
export const Modal = createPreview(() => (
  <div className="flex items-center gap-4">
    <Popover
      trigger={<Button label="Modal" />}
      modal
      title="Pick a range"
      content={
        <p className="text-neutral-11 text-sm">
          Try clicking the other button while this is open: it does nothing until you close this.
        </p>
      }
    />
    <Button variant="outline">Another button</Button>
  </div>
));

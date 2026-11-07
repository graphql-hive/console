import { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { TagSuggestions } from '@/components/target/settings/contract-form';
import { cn } from '@/lib/utils';
import { Button } from '../../button/button';
import { Input } from '../../input/input';
import { floatingVariants } from '../shared-styles';
import { Popover } from './popover';
import * as styles from './popover.preview.css';

export const nav: NavPath = 'Primitives/Floating/Popover';

/** Structured mode: pass `title` and the header with close button is rendered for you. */
export const Structured = createPreview(() => (
  <Popover
    trigger={<Button label="Alert details" />}
    title="Alert details"
    description="Configure the threshold and notification settings."
    content={
      <div className={styles.div}>
        <div className={styles.div2}>
          Status: <span className={styles.span}>Normal</span>
        </div>
        <div className={styles.div2}>Last evaluated: 2 minutes ago</div>
      </div>
    }
  />
));

/** Raw mode: no `title`, so content is rendered directly with no header. Padded by default. */
export const Raw = createPreview(() => (
  <Popover
    trigger={<Button label="Info" />}
    content={<p className={styles.p}>A raw popover with custom content.</p>}
  />
));

/**
 * `padding="none"` for content that lays itself out edge to edge: a list of rows, a calendar,
 * a panel with its own header rule.
 */
export const RawPadding = createPreview(() => (
  <div className={styles.div3}>
    <Popover
      trigger={<Button label="Default padding" />}
      content={<p className={styles.p}>p-4 around the content.</p>}
    />
    <Popover
      trigger={<Button label="No padding" />}
      padding="none"
      content={
        <ul className={styles.ul}>
          {['getUser', 'listProjects', 'createTarget'].map(op => (
            <li key={op} className={styles.li}>
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
    content={<p className={styles.p}>Arrows point back at the trigger.</p>}
    arrow
  />
));

/**
 * One scale for both modes. Raw defaults to `sm`, structured to `md`. `lg` and `xl` are the two widest panels in the app, rounded to the rem grid.
 */
export const Widths = createPreview(() => (
  <div className={styles.div4}>
    <Popover
      trigger={<Button label="auto" />}
      width="auto"
      content={<p className={styles.p}>Sizes to content.</p>}
    />
    <Popover
      trigger={<Button label="sm" />}
      width="sm"
      content={<p className={styles.p}>w-72, 288px. The raw default.</p>}
    />
    <Popover
      trigger={<Button label="md" />}
      width="md"
      content={<p className={styles.p}>w-80, 320px. The structured default.</p>}
    />
    <Popover
      trigger={<Button label="lg" />}
      width="lg"
      content={<p className={styles.p}>28rem, 448px. Was 450.</p>}
    />
    <Popover
      trigger={<Button label="xl" />}
      width="xl"
      content={<p className={styles.p}>34rem, 544px. Was 550.</p>}
    />
  </div>
));

export const Sides = createPreview(() => (
  <div className={styles.div3}>
    <Popover
      trigger={<Button label="Top" />}
      side="top"
      content={<p className={styles.p}>side=&quot;top&quot;</p>}
    />
    <Popover
      trigger={<Button label="Right" />}
      side="right"
      content={<p className={styles.p}>side=&quot;right&quot;</p>}
    />
    <Popover
      trigger={<Button label="Bottom" />}
      side="bottom"
      content={<p className={styles.p}>side=&quot;bottom&quot;</p>}
    />
    <Popover
      trigger={<Button label="Left" />}
      side="left"
      content={<p className={styles.p}>side=&quot;left&quot;</p>}
    />
  </div>
));

/**
 * The close button works uncontrolled now: it is a Base UI `Close` rather than a call to an
 * `onOpenChange` the call site may not have passed.
 */
export const NoCloseButton = createPreview(() => (
  <div className={styles.div3}>
    <Popover
      trigger={<Button label="With close button" />}
      title="Uncontrolled"
      content={<p className={styles.p}>The X closes this.</p>}
    />
    <Popover
      trigger={<Button label="No close button" />}
      title="Read only"
      hideCloseButton
      content={<p className={styles.p}>Dismiss by clicking outside.</p>}
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
    <div ref={panel} className={cn(floatingVariants({ padding: 'md' }), styles.div5)}>
      <span className={styles.span2}>A panel with a field in it</span>
      <div className={styles.div6}>
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
        content={<p className={styles.p}>Positioned against the panel, not the Pick button.</p>}
      />
    </div>
  );
});

// The contract form's tag field: the Input is the `anchor`, not the trigger, and
// `initialFocus={false}` keeps the caret in the field while the suggestions are open.
export const InputAnchor = createPreview(() => {
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState(['public']);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.div7}>
      <Input
        ref={inputRef}
        placeholder="Add a tag"
        autoComplete="off"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={inputRef}
        align="start"
        initialFocus={false}
        padding="none"
        width="auto"
        content={
          <TagSuggestions
            tags={['public', 'internal', 'deprecated', 'beta']}
            selected={selected}
            onToggle={tag =>
              setSelected(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
              )
            }
          />
        }
      />
    </div>
  );
});

/**
 * `openOnHover` for an infotip: an icon whose only job is to open the explanation. Hover opens
 * it after the tooltip delay, click toggles it, so it is reachable by keyboard and touch too.
 * Base UI's rule: if the trigger exists to open the popup, it is a popover, not a tooltip.
 */
export const Infotip = createPreview(() => (
  <div className={styles.div6}>
    <span className={styles.span3}>Resolution count</span>
    <Popover
      trigger={
        <button type="button" aria-label="What resolution count means" className={styles.button}>
          <Info className={styles.info} />
        </button>
      }
      openOnHover
      content={
        <p className={styles.p}>
          The number of times this field was executed. A single request can resolve a field many
          times, or skip it entirely.
        </p>
      }
    />
  </div>
));

/** `modal` blocks the page behind the popup. For a panel that is a task, not a glance. */
export const Modal = createPreview(() => (
  <div className={styles.div3}>
    <Popover
      trigger={<Button label="Modal" />}
      modal
      title="Pick a range"
      content={
        <p className={styles.p}>
          Try clicking the other button while this is open: it does nothing until you close this.
        </p>
      }
    />
    <Button variant="outline">Another button</Button>
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Popover, {
    trigger: {
      type: 'radio',
      options: ['button', 'icon'],
      default: 'button',
      derive: kind =>
        kind === 'icon' ? (
          <button type="button" aria-label="What resolution count means" className={styles.button}>
            <Info className={styles.info} />
          </button>
        ) : (
          <Button label="Alert details" />
        ),
    },
    // Empty leaves the popover in raw mode: no header, so no close button either.
    title: { type: 'text', default: 'Alert details', derive: text => text || undefined },
    description: { type: 'text', default: 'Configure the threshold and notification settings.' },
    content: {
      type: 'text',
      default: 'Status: Normal. Last evaluated 2 minutes ago.',
      derive: text => <p className={styles.p}>{text}</p>,
    },
    hideCloseButton: { type: 'boolean', default: false },
    padding: { type: 'radio', options: ['default', 'none'], default: 'default' },
    // Unset falls back per mode: `sm` raw, `md` structured.
    width: {
      type: 'radio',
      options: ['unset', 'auto', 'sm', 'md', 'lg', 'xl'],
      default: 'unset',
      derive: step => (step === 'unset' ? undefined : step),
    },
    side: { type: 'radio', options: ['bottom', 'top', 'left', 'right'], default: 'bottom' },
    align: { type: 'radio', options: ['center', 'start', 'end'], default: 'center' },
    arrow: { type: 'boolean', default: false },
    modal: { type: 'boolean', default: false },
    openOnHover: { type: 'boolean', default: false },
  }),
  render: v => {
    const shared = {
      trigger: v.trigger,
      width: v.width,
      side: v.side,
      align: v.align,
      arrow: v.arrow,
      modal: v.modal,
      openOnHover: v.openOnHover,
    };
    // `title` is the discriminant: with one the header renders and `padding` is not a prop.
    return v.title === undefined ? (
      <Popover {...shared} content={v.content} padding={v.padding} />
    ) : (
      <Popover
        {...shared}
        title={v.title}
        description={v.description}
        content={v.content}
        hideCloseButton={v.hideCloseButton}
      />
    );
  },
});

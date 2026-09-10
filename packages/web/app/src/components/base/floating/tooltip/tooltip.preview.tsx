import { CircleHelp, Info } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Tooltip } from './tooltip';

export const nav: NavPath = 'Base/Floating/Tooltip';

/**
 * A hover and focus hint. `trigger` is your own element and `content` is what it says, so there
 * is nothing to compose and no `className` to pass.
 *
 * Deliberately smaller than the other floating panels: a tooltip explains the surface it sits
 * over, so it should not read as large as that surface.
 */
export const Default = createPreview(() => (
  <Tooltip trigger={<Button label="Hover me" />} content="Runs a check against the registry." />
));

/** Any element can be the trigger. An icon button is the common case. */
export const IconTrigger = createPreview(() => (
  <Tooltip
    trigger={
      <button type="button" className="text-neutral-10 hover:text-neutral-12">
        <Info className="size-4" />
      </button>
    }
    content="Resolution count is the number of times this field was executed."
  />
));

/** Content wraps at `max-w-64`, so a longer explanation stacks rather than stretching. */
export const LongContent = createPreview(() => (
  <Tooltip
    trigger={<Button label="Why is this disabled?" />}
    content="This differs from request count because a single request can resolve a field many times, or skip it entirely."
  />
));

/** `content` takes a node, so it can carry structure rather than one line. */
export const RichContent = createPreview(() => (
  <Tooltip
    trigger={
      <button type="button" className="text-neutral-10 hover:text-neutral-12">
        <CircleHelp className="size-4" />
      </button>
    }
    content={
      <>
        <p className="mb-1 font-medium">Impact</p>
        <p>Total time spent on this operation in the selected period, in seconds.</p>
      </>
    }
  />
));

/** All four sides. `top` is the default. */
export const Sides = createPreview(() => (
  <div className="flex gap-3 p-16">
    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
      <Tooltip
        key={side}
        trigger={<Button label={side} />}
        content={`Positioned ${side}.`}
        side={side}
      />
    ))}
  </div>
));

/** `arrow` points at the trigger, for when the association is not obvious from position alone. */
export const WithArrow = createPreview(() => (
  <div className="flex gap-3">
    <Tooltip trigger={<Button label="No arrow" />} content="The default." />
    <Tooltip trigger={<Button label="With arrow" />} content="Points at its trigger." arrow />
  </div>
));

/**
 * `delay` is the wait before showing, so the tooltip does not flash while the pointer crosses on
 * its way elsewhere. Hover across all three to feel the difference.
 */
export const Delays = createPreview(() => (
  <div className="flex gap-3">
    <Tooltip trigger={<Button label="0ms" />} content="Immediate." delay={0} />
    <Tooltip trigger={<Button label="200ms (default)" />} content="The default." />
    <Tooltip trigger={<Button label="600ms" />} content="Deliberate hover only." delay={600} />
  </div>
));

/**
 * `disabled` turns it off without removing it from the tree, for a trigger whose explanation only
 * applies in some states. The left one never opens.
 */
export const Disabled = createPreview(() => (
  <div className="flex gap-3">
    <Tooltip trigger={<Button label="Disabled" />} content="You will not see this." disabled />
    <Tooltip trigger={<Button label="Enabled" />} content="You will see this." />
  </div>
));

/**
 * A trigger with `pointer-events-none`, such as a disabled control, never receives hover, so the
 * tooltip would never open. Wrap it and put the tooltip on the wrapper instead. The left button
 * is the trap; the right one is the fix.
 */
export const DisabledTrigger = createPreview(() => (
  <div className="flex gap-3">
    <Tooltip
      trigger={
        <span className="pointer-events-none opacity-50">
          <Button label="Never opens" />
        </span>
      }
      content="You will not see this."
    />
    <Tooltip
      trigger={
        <span className="block">
          <span className="pointer-events-none opacity-50">
            <Button label="Opens" />
          </span>
        </span>
      }
      content="The wrapper takes the hover."
    />
  </div>
));

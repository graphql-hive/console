import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Card } from './card';

export const nav: NavPath = 'Base/Primitives/Card';

export const Default = createPreview(() => (
  <Card title="Alert rule" description="Notify the team when p99 latency crosses the threshold.">
    <p className="text-neutral-11 text-sm">Evaluated every 5 minutes against the last hour.</p>
  </Card>
));

/** No children, so the card is just its heading block. */
export const WithoutContent = createPreview(() => (
  <Card title="Schema checks" description="No checks have run for this target yet." />
));

/** `description` takes a node as well as a string, which is how call sites get a link into it. */
export const RichDescription = createPreview(() => (
  <Card
    title="Destination"
    description={
      <>
        Select the target destination for this alert. Configure destinations{' '}
        <a href="#" className="text-accent underline">
          here
        </a>
        .
      </>
    }
  />
));

/** Title with no description, the shape the SSO settings cards use. */
export const TitleOnly = createPreview(() => (
  <Card title="SCIM Provision Defaults">
    <p className="text-neutral-11 text-sm">Applied to every user provisioned via SCIM.</p>
  </Card>
));

/**
 * Children with no title or description. No call site does this yet, but it is the branch where
 * the body owns its own top inset, so it is the one to check if a card ever ships headerless.
 */
export const ContentOnly = createPreview(() => (
  <Card>
    <p className="text-neutral-11 text-sm">
      Padding is even on all four sides here, since there is no heading block above to supply it.
    </p>
  </Card>
));

/**
 * The two surfaces side by side. Foundry's canvas is set to the app's own page background in
 * `foundry.config.ts` (neutral-3 light, neutral-2 dark), so this compares them on the surface
 * they actually ship against. Worth checking in both themes: `raised` swaps its fill between
 * them and `base` does not.
 */
export const OnSurface = createPreview(() => (
  <div className="flex gap-4">
    <Card
      variants={{ onSurface: 'base' }}
      title="Base"
      description="Border only, no fill. Today's v2/card."
    />
    <Card
      variants={{ onSurface: 'raised' }}
      title="Raised"
      description="Filled, one step off the page. Today's ui/card."
    />
  </div>
));

/**
 * `interactive` is for a card that is itself a link or button, so it has to be hovered to show
 * anything. Both surfaces are here because the hover fill is shared between them: check it reads
 * as a lift on `raised` and does not look like a fill appearing from nowhere on `base`.
 */
export const Interactive = createPreview(() => (
  <div className="flex gap-4">
    <Card
      variants={{ onSurface: 'base', interactive: true }}
      title="Base"
      description="Hover me."
    />
    <Card
      variants={{ onSurface: 'raised', interactive: true }}
      title="Raised"
      description="Hover me. This is the project card's surface."
    />
  </div>
));

/**
 * `bodyPadding: 'none'` for content that runs to the card edge. The project card is the reason it
 * exists: a full-bleed sparkline with a text row under it that carries its own `px-4`. The card
 * supplies the vertical inset itself, since dropping the padding drops all four sides.
 */
export const BodyPadding = createPreview(() => (
  <div className="grid w-[36rem] grid-cols-2 gap-4">
    <Card variants={{ onSurface: 'raised' }} title="Default">
      <div className="bg-accent/20 text-neutral-11 rounded-sm p-4 text-center text-xs">
        Inset by the card's p-5
      </div>
    </Card>
    <Card variants={{ onSurface: 'raised', bodyPadding: 'none' }} title="None">
      <div className="bg-accent/20 text-neutral-11 p-4 text-center text-xs">Runs to the edge</div>
    </Card>
  </div>
));

/**
 * `large` heads a page section; `xlarge` is the auth card, which is the whole page rather than a
 * section of one. The description does not scale with the title, so the thing to check here is
 * that it still reads as secondary at `xlarge` rather than looking orphaned under it.
 */
export const TitleSize = createPreview(() => (
  <div className="flex flex-col gap-4">
    <Card
      variants={{ titleSize: 'default' }}
      title="Default"
      description="text-sm, the size the insights stat cards render at."
    />
    <Card
      variants={{ titleSize: 'large' }}
      title="Large"
      description="text-lg, for section-heading cards. Today's ui/card CardTitle."
    />
    <Card
      variants={{ titleSize: 'xlarge' }}
      title="Extra large"
      description="text-2xl, for auth cards, which own the whole page."
    />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    onSurface: { type: 'radio', options: ['base', 'raised'], default: 'base' },
    titleSize: { type: 'radio', options: ['default', 'large', 'xlarge'], default: 'default' },
    bodyPadding: { type: 'radio', options: ['default', 'none'], default: 'default' },
    interactive: { type: 'boolean', default: false },
    title: { type: 'text', default: 'Alert rule' },
    description: { type: 'text', default: 'Notify the team when p99 latency crosses.' },
  }),
  render: v => (
    <Card
      variants={{
        onSurface: v.onSurface,
        titleSize: v.titleSize,
        bodyPadding: v.bodyPadding,
        interactive: v.interactive,
      }}
      title={v.title}
      description={v.description}
    >
      {/* Tinted so `bodyPadding` is visible; a card with no children has no body to inset. */}
      <div className="bg-accent/20 text-neutral-11 p-4 text-center text-xs">Body</div>
    </Card>
  ),
});

import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Badge } from './badge/badge';
import { Button } from './button/button';
import { PageLead } from './page-lead';

export const nav: NavPath = 'Base/PageLead';

export const Default = createPreview(() => (
  <div className="w-[36rem]">
    <PageLead
      title="Alerts"
      description="Get notified when your GraphQL API's traffic, errors, or latency cross a threshold."
    />
  </div>
));

/** `titleAccessory` flows inline with the title rather than onto its own row. */
export const WithBadge = createPreview(() => (
  <div className="w-[36rem]">
    <PageLead
      title="Schema checks"
      description="Every check run against this target, newest first."
      titleAccessory={<Badge variant="secondary">42 this month</Badge>}
    />
  </div>
));

export const WithAction = createPreview(() => (
  <div className="w-[36rem]">
    <PageLead
      title="Access tokens"
      description="Tokens let CI and the CLI publish schemas on your behalf."
      titleAccessory={
        <Button variant="primary" size="sm">
          Create token
        </Button>
      }
    />
  </div>
));

export const LongDescription = createPreview(() => (
  <div className="w-[36rem]">
    <PageLead
      title="Usage reporting"
      description="Hive aggregates every operation your gateway reports, so you can see which fields are actually used before you deprecate them. Reporting is sampled at the client and flushed in batches."
    />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    title: { type: 'text', default: 'Alerts' },
    description: {
      type: 'text',
      default: "Get notified when your API's traffic or latency crosses a threshold.",
    },
    accessory: { type: 'boolean', default: false },
  }),
  render: v => (
    <div className="w-[36rem]">
      <PageLead
        title={v.title}
        description={v.description}
        titleAccessory={v.accessory ? <Badge variant="secondary">Beta</Badge> : undefined}
      />
    </div>
  ),
});

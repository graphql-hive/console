import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export const nav: NavPath = 'Base/Primitives/Card';

export const Default = createPreview(() => (
  <Card>
    <CardHeader>
      <CardTitle title="Alert rule" />
      <CardDescription description="Notify the team when p99 latency crosses the threshold." />
    </CardHeader>
    <CardContent>
      <p className="text-neutral-11 text-sm">Evaluated every 5 minutes against the last hour.</p>
    </CardContent>
  </Card>
));

export const HeaderOnly = createPreview(() => (
  <Card>
    <CardHeader>
      <CardTitle title="Schema checks" />
      <CardDescription description="No checks have run for this target yet." />
    </CardHeader>
  </Card>
));

export const Selectable = createPreview(() => (
  <div className="flex w-[36rem] gap-4">
    <Card variant="selectable">
      <CardContent variant="selection">
        <div>
          <CardTitle title="Federation" />
          <CardDescription description="Compose multiple subgraphs into one supergraph." />
        </div>
      </CardContent>
    </Card>
    <Card variant="selected">
      <CardContent variant="selection">
        <div>
          <CardTitle title="Single schema" />
          <CardDescription description="One schema, published from a single service." />
        </div>
      </CardContent>
    </Card>
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    title: { type: 'text', default: 'Alert rule' },
    description: { type: 'text', default: 'Notify the team when p99 latency crosses.' },
    variant: { type: 'radio', options: ['default', 'selectable', 'selected'], default: 'default' },
  }),
  render: v => (
    <Card variant={v.variant}>
      <CardHeader>
        <CardTitle title={v.title} />
        <CardDescription description={v.description} />
      </CardHeader>
    </Card>
  ),
});

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

export const Playground = createPreview({
  controls: defineControls({
    title: { type: 'text', default: 'Alert rule' },
    description: { type: 'text', default: 'Notify the team when p99 latency crosses.' },
  }),
  render: v => (
    <Card>
      <CardHeader>
        <CardTitle title={v.title} />
        <CardDescription description={v.description} />
      </CardHeader>
    </Card>
  ),
});

import type { Story, StoryDefault } from '@ladle/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export default {
  title: 'UI / Card',
} satisfies StoryDefault;

export const Default: Story = () => (
  <div className="max-w-lg p-8">
    <Card>
      <CardHeader>
        <CardTitle title="1. Alert type and range" />
        <CardDescription description="Select the alert type and range for this alert." />
      </CardHeader>
      <CardContent>
        <p className="text-neutral-11 text-sm">Form fields go here.</p>
      </CardContent>
    </Card>
  </div>
);

export const WithLink: Story = () => (
  <div className="max-w-lg p-8">
    <Card>
      <CardHeader>
        <CardTitle title="4. Destination" />
        <CardDescription
          description={
            <>
              Select the target destination for this alert. Configure destinations{' '}
              <a href="#" className="underline">
                here
              </a>
              .
            </>
          }
        />
      </CardHeader>
      <CardContent>
        <p className="text-neutral-11 text-sm">Destination fields go here.</p>
      </CardContent>
    </Card>
  </div>
);

export const Stacked: Story = () => (
  <div className="max-w-lg space-y-6 p-8">
    <Card>
      <CardHeader>
        <CardTitle title="1. Alert type and range" />
        <CardDescription description="Select the alert type and range for this alert." />
      </CardHeader>
      <CardContent>
        <p className="text-neutral-11 text-sm">Section 1 content.</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle title="2. Alert name and severity" />
        <CardDescription description="Choose a name for your alert and the severity level." />
      </CardHeader>
      <CardContent>
        <p className="text-neutral-11 text-sm">Section 2 content.</p>
      </CardContent>
    </Card>
  </div>
);

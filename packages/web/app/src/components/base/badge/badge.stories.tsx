import { Check, ExternalLink } from 'lucide-react';
import type { Story, StoryDefault } from '@ladle/react';
import { Badge } from './badge';

export default {
  title: 'UI / Badge',
} satisfies StoryDefault;

export const Default: Story = () => (
  <div className="p-8">
    <Badge>Badge</Badge>
  </div>
);

export const Variants: Story = () => (
  <div className="flex flex-wrap items-center gap-4 p-8">
    <Badge>Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
);

export const WithIcon: Story = () => (
  <div className="flex flex-wrap items-center gap-4 p-8">
    <Badge variant="secondary">
      <Check />
      Published
    </Badge>
    <Badge variant="outline">
      Documentation
      <ExternalLink />
    </Badge>
  </div>
);

export const AsLink: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Badge asChild>
      <a href="#badge-link">View schema</a>
    </Badge>
    <Badge asChild variant="outline">
      <a href="#badge-link-outline">
        Documentation
        <ExternalLink />
      </a>
    </Badge>
  </div>
);

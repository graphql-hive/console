import type { Story } from '@ladle/react';
import { HiveLink } from '@/components/ui/hive-link';

export const Default: Story = () => (
  <div className="p-4">
    <HiveLink />
  </div>
);

Default.meta = {
  description: 'HiveLink component that navigates to home page',
};

export const WithCustomClass: Story = () => (
  <div className="p-4 flex gap-4 items-center">
    <HiveLink className="size-8" />
    <HiveLink className="size-12" />
    <HiveLink className="size-16" />
  </div>
);

WithCustomClass.meta = {
  description: 'HiveLink with custom sizes',
};

export const InHeader: Story = () => (
  <div className="border-b border-neutral-6 bg-neutral-1 p-4">
    <div className="flex items-center justify-between">
      <HiveLink className="size-10" />
      <div className="text-neutral-12 font-semibold">GraphQL Hive</div>
    </div>
  </div>
);

InHeader.meta = {
  description: 'HiveLink in header context, common pattern',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">HiveLink Component</h2>
      <p className="text-neutral-11 mb-4">
        Wrapper component that renders HiveLogo as a link to the home page. Commonly used in
        headers and navigation.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <HiveLink />
          </div>
          <p className="text-xs text-neutral-10">
            Renders TanStack Router Link to "/" with HiveLogo
            <br />
            Layout: <code className="text-neutral-12">inline-flex items-center</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Sizes</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex gap-4 items-end">
            <HiveLink className="size-6" />
            <HiveLink className="size-8" />
            <HiveLink className="size-10" />
            <HiveLink className="size-12" />
          </div>
          <p className="text-xs text-neutral-10">
            Use className to control size: <code className="text-neutral-12">size-*</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
            classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10 mb-2">Common patterns:</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>Header/navigation logo that links home</li>
          <li>Onboarding pages (organization-new.tsx, organization-join.tsx)</li>
          <li>
            Usually positioned absolutely:{' '}
            <code className="text-neutral-12">absolute left-6 top-6</code>
          </li>
        </ul>
      </div>
    </div>
  </div>
);

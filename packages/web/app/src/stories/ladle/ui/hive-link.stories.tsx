import { HiveLink } from '@/components/ui/hive-link';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Hive Link',
};

export const Default: Story = () => (
  <div className="p-4">
    <HiveLink />
  </div>
);

Default.meta = {
  description: 'HiveLink component that navigates to home page',
};

export const WithCustomClass: Story = () => (
  <div className="flex items-center gap-4 p-4">
    <HiveLink className="size-8" />
    <HiveLink className="size-12" />
    <HiveLink className="size-16" />
  </div>
);

WithCustomClass.meta = {
  description: 'HiveLink with custom sizes',
};

export const InHeader: Story = () => (
  <div className="border-neutral-6 bg-neutral-1 border-b p-4">
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
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">HiveLink Component</h2>
      <p className="text-neutral-11 mb-4">
        Wrapper component that renders HiveLogo as a link to the home page. Commonly used in headers
        and navigation.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <HiveLink />
          </div>
          <p className="text-neutral-10 text-xs">
            Renders TanStack Router Link to "/" with HiveLogo
            <br />
            Layout: <code className="text-neutral-12">inline-flex items-center</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Sizes</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-end gap-4 rounded-sm border p-4">
            <HiveLink className="size-6" />
            <HiveLink className="size-8" />
            <HiveLink className="size-10" />
            <HiveLink className="size-12" />
          </div>
          <p className="text-neutral-10 text-xs">
            Use className to control size: <code className="text-neutral-12">size-*</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
            classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-10 mb-2 text-xs">Common patterns:</p>
        <ul className="text-neutral-10 space-y-1 text-xs">
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

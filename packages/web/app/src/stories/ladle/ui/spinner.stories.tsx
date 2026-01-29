import { Spinner } from '@/components/ui/spinner';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Spinner',
};

export const Default: Story = () => <Spinner />;

export const Sizes: Story = () => (
  <div className="flex items-center gap-8">
    <div className="space-y-2 text-center">
      <Spinner className="size-4" />
      <p className="text-neutral-11 text-xs">Small (16px)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="size-6" />
      <p className="text-neutral-11 text-xs">Default (24px)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="size-8" />
      <p className="text-neutral-11 text-xs">Large (32px)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="size-12" />
      <p className="text-neutral-11 text-xs">Extra Large (48px)</p>
    </div>
  </div>
);

export const Colors: Story = () => (
  <div className="flex items-center gap-8">
    <div className="space-y-2 text-center">
      <Spinner />
      <p className="text-neutral-11 text-xs">Default (Accent)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="text-neutral-12" />
      <p className="text-neutral-11 text-xs">Neutral</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="text-red-500" />
      <p className="text-neutral-11 text-xs">Red</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="text-green-500" />
      <p className="text-neutral-11 text-xs">Green</p>
    </div>
  </div>
);

export const InContext: Story = () => (
  <div className="max-w-md space-y-6">
    <div className="bg-neutral-1 border-neutral-6 flex items-center gap-3 rounded-sm border p-4">
      <Spinner className="size-5" />
      <span className="text-neutral-11">Loading data...</span>
    </div>

    <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-8">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-neutral-11 text-sm">Please wait</p>
      </div>
    </div>

    <div className="bg-neutral-1 border-neutral-6 relative rounded-sm border p-8">
      <div className="bg-neutral-1/80 absolute inset-0 flex items-center justify-center rounded-sm backdrop-blur-sm">
        <Spinner />
      </div>
      <p className="text-neutral-11">Content behind loading overlay</p>
      <p className="text-neutral-11">This text is blurred while loading</p>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Spinner Variants</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default (Accent Color)</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-4">
            <Spinner />
          </div>
          <p className="text-neutral-10 text-xs">
            Color: <code className="text-neutral-12">text-accent</code>
            <br />
            Border: <code className="text-neutral-12">border-2 border-current</code>
            <br />
            Animation:{' '}
            <code className="text-neutral-12">animate-spin [animation-duration:0.45s]</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Color</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-4">
            <Spinner className="text-neutral-12" />
          </div>
          <p className="text-neutral-10 text-xs">
            Can be customized with <code className="text-neutral-12">className</code> prop
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Size Variants</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Small</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-4">
            <Spinner className="size-4" />
          </div>
          <p className="text-neutral-10 text-xs">
            <code className="text-neutral-12">size-4</code>
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-4">
            <Spinner />
          </div>
          <p className="text-neutral-10 text-xs">
            <code className="text-neutral-12">size-6</code>
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Large</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-4">
            <Spinner className="size-8" />
          </div>
          <p className="text-neutral-10 text-xs">
            <code className="text-neutral-12">size-8</code>
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Extra Large</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-4">
            <Spinner className="size-12" />
          </div>
          <p className="text-neutral-10 text-xs">
            <code className="text-neutral-12">size-12</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Inline Loading</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="flex items-center gap-3">
              <Spinner className="size-5" />
              <span className="text-neutral-11">Loading data...</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Centered Loading</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center rounded-sm border p-8">
            <Spinner />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Loading Overlay</p>
          <div className="bg-neutral-1 border-neutral-6 relative rounded-sm border p-8">
            <div className="bg-neutral-1/80 absolute inset-0 flex items-center justify-center rounded-sm backdrop-blur-sm">
              <Spinner />
            </div>
            <p className="text-neutral-11">Content behind overlay</p>
          </div>
          <p className="text-neutral-10 text-xs">
            Overlay: <code className="text-neutral-12">bg-neutral-1/80 backdrop-blur-sm</code>
          </p>
        </div>
      </div>
    </div>
  </div>
);

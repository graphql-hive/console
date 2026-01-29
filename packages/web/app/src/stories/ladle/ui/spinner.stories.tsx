import type { Story } from '@ladle/react';
import { Spinner } from '@/components/ui/spinner';

export const Default: Story = () => <Spinner />;

export const Sizes: Story = () => (
  <div className="flex items-center gap-8">
    <div className="space-y-2 text-center">
      <Spinner className="size-4" />
      <p className="text-xs text-neutral-11">Small (16px)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="size-6" />
      <p className="text-xs text-neutral-11">Default (24px)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="size-8" />
      <p className="text-xs text-neutral-11">Large (32px)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="size-12" />
      <p className="text-xs text-neutral-11">Extra Large (48px)</p>
    </div>
  </div>
);

export const Colors: Story = () => (
  <div className="flex items-center gap-8">
    <div className="space-y-2 text-center">
      <Spinner />
      <p className="text-xs text-neutral-11">Default (Accent)</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="text-neutral-12" />
      <p className="text-xs text-neutral-11">Neutral</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="text-red-500" />
      <p className="text-xs text-neutral-11">Red</p>
    </div>
    <div className="space-y-2 text-center">
      <Spinner className="text-green-500" />
      <p className="text-xs text-neutral-11">Green</p>
    </div>
  </div>
);

export const InContext: Story = () => (
  <div className="space-y-6 max-w-md">
    <div className="flex items-center gap-3 p-4 bg-neutral-1 rounded border border-neutral-6">
      <Spinner className="size-5" />
      <span className="text-neutral-11">Loading data...</span>
    </div>

    <div className="flex items-center justify-center p-8 bg-neutral-1 rounded border border-neutral-6">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-sm text-neutral-11">Please wait</p>
      </div>
    </div>

    <div className="relative p-8 bg-neutral-1 rounded border border-neutral-6">
      <div className="absolute inset-0 flex items-center justify-center bg-neutral-1/80 backdrop-blur-sm rounded">
        <Spinner />
      </div>
      <p className="text-neutral-11">Content behind loading overlay</p>
      <p className="text-neutral-11">This text is blurred while loading</p>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Spinner Variants</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default (Accent Color)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner />
          </div>
          <p className="text-xs text-neutral-10">
            Color: <code className="text-neutral-12">text-accent</code>
            <br />
            Border: <code className="text-neutral-12">border-2 border-current</code>
            <br />
            Animation: <code className="text-neutral-12">animate-spin [animation-duration:0.45s]</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Color</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner className="text-neutral-12" />
          </div>
          <p className="text-xs text-neutral-10">
            Can be customized with <code className="text-neutral-12">className</code> prop
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Size Variants</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Small</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner className="size-4" />
          </div>
          <p className="text-xs text-neutral-10">
            <code className="text-neutral-12">size-4</code>
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner />
          </div>
          <p className="text-xs text-neutral-10">
            <code className="text-neutral-12">size-6</code>
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Large</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner className="size-8" />
          </div>
          <p className="text-xs text-neutral-10">
            <code className="text-neutral-12">size-8</code>
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Extra Large</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner className="size-12" />
          </div>
          <p className="text-xs text-neutral-10">
            <code className="text-neutral-12">size-12</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Examples</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Inline Loading</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="flex items-center gap-3">
              <Spinner className="size-5" />
              <span className="text-neutral-11">Loading data...</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Centered Loading</p>
          <div className="p-8 bg-neutral-1 rounded border border-neutral-6 flex items-center justify-center">
            <Spinner />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Loading Overlay</p>
          <div className="relative p-8 bg-neutral-1 rounded border border-neutral-6">
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-1/80 backdrop-blur-sm rounded">
              <Spinner />
            </div>
            <p className="text-neutral-11">Content behind overlay</p>
          </div>
          <p className="text-xs text-neutral-10">
            Overlay: <code className="text-neutral-12">bg-neutral-1/80 backdrop-blur-sm</code>
          </p>
        </div>
      </div>
    </div>
  </div>
);

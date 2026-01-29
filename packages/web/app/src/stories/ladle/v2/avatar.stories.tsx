import type { Story } from '@ladle/react';
import { Avatar } from '@/components/v2/avatar';

export default {
  title: "V2 / Avatar",
};


export const Default: Story = () => <Avatar />;

export const WithImage: Story = () => (
  <div className="flex gap-4">
    <Avatar src="https://github.com/shadcn.png" alt="User avatar" />
  </div>
);

export const AllSizes: Story = () => (
  <div className="flex items-end gap-4">
    <div className="flex flex-col items-center gap-2">
      <Avatar size="xs" />
      <span className="text-xs text-neutral-11">xs (20px)</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Avatar size="sm" />
      <span className="text-xs text-neutral-11">sm (34px)</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Avatar size="md" />
      <span className="text-xs text-neutral-11">md (40px)</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Avatar size="lg" />
      <span className="text-xs text-neutral-11">lg (50px)</span>
    </div>
  </div>
);

export const Shapes: Story = () => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center gap-2">
      <Avatar shape="square" />
      <span className="text-xs text-neutral-11">square</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Avatar shape="circle" />
      <span className="text-xs text-neutral-11">circle</span>
    </div>
  </div>
);

export const WithBorder: Story = () => (
  <div className="flex gap-4">
    <Avatar shape="circle" className="border-accent_80 border-2" />
    <Avatar
      shape="circle"
      src="https://github.com/shadcn.png"
      className="border-accent_80 border-2"
    />
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Avatar Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix Avatar wrapper with size variants and shape options. Uses accent colors and neutral
        backgrounds.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Avatar />
          <code className="text-xs">bg-accent_10</code>
          <span className="text-neutral-11 text-xs">- Default background (no image)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Icon Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Avatar />
          <code className="text-xs">text-neutral-12 fill-current</code>
          <span className="text-neutral-11 text-xs">- PersonIcon fallback</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors (Custom)</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Avatar shape="circle" className="border-accent_80 border-2" />
          <code className="text-xs">border-accent_80 border-2</code>
          <span className="text-neutral-11 text-xs">- Accent border variant</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Shape Variants</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Avatar shape="square" size="lg" />
          <code className="text-xs">rounded-md</code>
          <span className="text-neutral-11 text-xs">- Square large (lg)</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar shape="square" size="md" />
          <code className="text-xs">rounded-sm</code>
          <span className="text-neutral-11 text-xs">- Square medium/small/xs</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar shape="circle" />
          <code className="text-xs">rounded-full</code>
          <span className="text-neutral-11 text-xs">- Circle shape</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size Scale</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Avatar size="xs" />
          <code className="text-xs">h-5 w-5</code>
          <span className="text-neutral-11 text-xs">- Extra small (20px)</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar size="sm" />
          <code className="text-xs">h-9 w-9</code>
          <span className="text-neutral-11 text-xs">- Small (34px)</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar size="md" />
          <code className="text-xs">h-10 w-10</code>
          <span className="text-neutral-11 text-xs">- Medium (40px, default)</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar size="lg" />
          <code className="text-xs">h-[50px] w-[50px]</code>
          <span className="text-neutral-11 text-xs">- Large (50px)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Avatar primitives (Root, Image)</li>
        <li>PersonIcon from @radix-ui/react-icons as fallback</li>
        <li>Image has drag-none class to prevent dragging</li>
        <li>Size determined by mapped object of Tailwind classes</li>
        <li>Shape affects border-radius (rounded-md/sm for square, rounded-full for circle)</li>
      </ul>
    </div>
  </div>
);

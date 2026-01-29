import type { Story } from '@ladle/react';
import { FullLogo } from '@/components/common/Logo';

export default {
  title: 'Common / Logo',
};

export const Default: Story = () => <FullLogo />;

export const CustomWidth: Story = () => (
  <div className="space-y-4">
    <FullLogo width={100} />
    <FullLogo width={200} />
    <FullLogo width={300} />
  </div>
);

export const CustomColors: Story = () => (
  <div className="space-y-6">
    <div>
      <p className="text-neutral-11 mb-2 text-sm">Default colors:</p>
      <FullLogo />
    </div>
    <div>
      <p className="text-neutral-11 mb-2 text-sm">Custom main (orange) and sub (white):</p>
      <FullLogo color={{ main: '#FF6B00', sub: '#FFFFFF' }} />
    </div>
    <div className="rounded-md bg-black p-4">
      <p className="text-neutral-11 mb-2 text-sm">On dark background:</p>
      <FullLogo color={{ main: '#FFFFFF', sub: '#C4C4C4' }} />
    </div>
  </div>
);

export const WithClassName: Story = () => (
  <FullLogo className="text-accent" width={200} />
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Common Logo Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        GraphQL Hive full logo SVG component with customizable width and colors. Includes both the
        icon and "HIVE" + "GraphQL" text.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Default Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-sm" style={{ backgroundColor: '#0B0D11' }} />
          <code className="text-xs">#0B0D11</code>
          <span className="text-neutral-11 text-xs">
            - Main color (icon, "HIVE" text)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-sm" style={{ backgroundColor: '#C4C4C4' }} />
          <code className="text-xs">#C4C4C4</code>
          <span className="text-neutral-11 text-xs">- Sub color ("GraphQL" text)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">SVG Structure</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Three main path groups:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Icon (hexagonal GraphQL logo) - uses currentColor</li>
            <li>"HIVE" text - uses color.main prop</li>
            <li>"GraphQL" text - uses color.sub prop</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  className?: string;
  width?: number;  // Default: 139
  color?: LogoColorScheme;  // Default: {main: '#0B0D11', sub: '#C4C4C4'}
}

type LogoColorScheme = {
  main: string;  // For "HIVE" text
  sub: string;   // For "GraphQL" text
};`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">ViewBox and Aspect Ratio</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">viewBox="0 0 139 61"</code>
          <span className="text-neutral-11 text-xs">- Original aspect ratio ~2.28:1</span>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">
            Width prop scales the logo while maintaining aspect ratio
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Header/Navigation:</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <FullLogo width={120} />
          </div>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Landing page (large):</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-6">
            <FullLogo width={250} />
          </div>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>SVG element with responsive width via prop</li>
        <li>Icon path uses currentColor (inherits from className or parent)</li>
        <li>"HIVE" and "GraphQL" text use explicit fill colors via props</li>
        <li>Default color scheme suitable for light backgrounds</li>
        <li>Custom colors allow adaptation to different themes</li>
        <li>Maintains aspect ratio automatically via viewBox</li>
        <li>No height prop - height determined by width and aspect ratio</li>
      </ul>
    </div>
  </div>
);

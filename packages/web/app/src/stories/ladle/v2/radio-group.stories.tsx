import type { Story } from '@ladle/react';
import { Radio, RadioGroup } from '@/components/v2/radio-group';

export default {
  title: 'V2 / Radio Group',
};

export const Default: Story = () => (
  <RadioGroup defaultValue="option1">
    <Radio value="option1">
      <div className="p-3">
        <div className="text-sm font-medium">Option 1</div>
        <div className="text-neutral-10 text-xs">First choice</div>
      </div>
    </Radio>
    <Radio value="option2">
      <div className="p-3">
        <div className="text-sm font-medium">Option 2</div>
        <div className="text-neutral-10 text-xs">Second choice</div>
      </div>
    </Radio>
    <Radio value="option3">
      <div className="p-3">
        <div className="text-sm font-medium">Option 3</div>
        <div className="text-neutral-10 text-xs">Third choice</div>
      </div>
    </Radio>
  </RadioGroup>
);

export const PlanSelection: Story = () => (
  <div className="max-w-md">
    <div className="mb-4 text-sm font-semibold">Choose your plan</div>
    <RadioGroup defaultValue="pro">
      <Radio value="free">
        <div className="p-4">
          <div className="mb-1 text-sm font-medium">Free</div>
          <div className="text-neutral-10 mb-2 text-xs">Perfect for trying out</div>
          <div className="text-lg font-bold">$0/month</div>
        </div>
      </Radio>
      <Radio value="pro">
        <div className="p-4">
          <div className="mb-1 text-sm font-medium">Pro</div>
          <div className="text-neutral-10 mb-2 text-xs">For professional developers</div>
          <div className="text-lg font-bold">$29/month</div>
        </div>
      </Radio>
      <Radio value="enterprise">
        <div className="p-4">
          <div className="mb-1 text-sm font-medium">Enterprise</div>
          <div className="text-neutral-10 mb-2 text-xs">For large organizations</div>
          <div className="text-lg font-bold">Custom pricing</div>
        </div>
      </Radio>
    </RadioGroup>
  </div>
);

export const Disabled: Story = () => (
  <RadioGroup defaultValue="option1">
    <Radio value="option1">
      <div className="p-3">
        <div className="text-sm font-medium">Available option</div>
      </div>
    </Radio>
    <Radio value="option2" disabled>
      <div className="p-3">
        <div className="text-neutral-10 text-sm font-medium">Disabled option</div>
      </div>
    </Radio>
  </RadioGroup>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Radio Group Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Radio Group wrapper for single-choice selection. Each Radio item can contain custom
        content and is styled with accent border on selection.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors (Radio)</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <RadioGroup defaultValue="unchecked">
            <Radio value="unchecked">
              <div className="p-2 text-xs">Unchecked</div>
            </Radio>
          </RadioGroup>
          <code className="text-xs">border (default gray)</code>
          <span className="text-neutral-11 text-xs">- Unchecked border</span>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroup defaultValue="checked">
            <Radio value="checked">
              <div className="p-2 text-xs">Checked</div>
            </Radio>
          </RadioGroup>
          <code className="text-xs">data-[state=checked]:border-accent</code>
          <span className="text-neutral-11 text-xs">- Checked border</span>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroup defaultValue="hover">
            <Radio value="hover">
              <div className="p-2 text-xs">Hover me</div>
            </Radio>
          </RadioGroup>
          <code className="text-xs">hover:border-accent/50</code>
          <span className="text-neutral-11 text-xs">- Hover border (not disabled)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <RadioGroup defaultValue="focus">
            <Radio value="focus">
              <div className="p-2 text-xs">Focus</div>
            </Radio>
          </RadioGroup>
          <code className="text-xs">focus:ring</code>
          <span className="text-neutral-11 text-xs">- Focus ring</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">RadioGroup (container):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">flex flex-col</code> - Vertical layout
            </li>
            <li>
              <code className="text-neutral-12">justify-items-stretch gap-4</code> - Spacing between
              items
            </li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Radio (item):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">rounded-sm border</code> - Border and radius
            </li>
            <li>
              <code className="text-neutral-12">text-left</code> - Left-aligned content
            </li>
            <li>
              <code className="text-neutral-12">relative overflow-hidden</code> - For ripple effects
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="max-w-md space-y-4">
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Simple labels:</p>
          <RadioGroup defaultValue="a">
            <Radio value="a">
              <div className="p-3 text-sm">Option A</div>
            </Radio>
            <Radio value="b">
              <div className="p-3 text-sm">Option B</div>
            </Radio>
          </RadioGroup>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Rich content:</p>
          <RadioGroup defaultValue="premium">
            <Radio value="premium">
              <div className="p-3">
                <div className="text-sm font-medium">Premium</div>
                <div className="text-neutral-10 text-xs">Includes all features</div>
              </div>
            </Radio>
            <Radio value="basic">
              <div className="p-3">
                <div className="text-sm font-medium">Basic</div>
                <div className="text-neutral-10 text-xs">Essential features only</div>
              </div>
            </Radio>
          </RadioGroup>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Radio Group primitives (Root, Item)</li>
        <li>RadioGroup is the container, Radio is individual selectable item</li>
        <li>Each Radio can contain any custom React content as children</li>
        <li>Supports all Radix RadioGroup props (value, defaultValue, onValueChange, etc.)</li>
        <li>Radio supports disabled prop to prevent selection</li>
        <li>Custom className merged with default styles using clsx()</li>
        <li>Data attributes used for checked state styling</li>
      </ul>
    </div>
  </div>
);

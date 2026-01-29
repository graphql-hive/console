import type { Story } from '@ladle/react';
import { useState } from 'react';
import { Modal } from '@/components/v2/modal';
import { Button } from '@/components/ui/button';

export default {
  title: 'V2 / Modal',
};

export const Small: Story = () => (
  <Modal trigger={<Button>Open Small Modal</Button>} size="sm">
    <Modal.Title>Small Modal</Modal.Title>
    <Modal.Description>This is a small modal (450px wide).</Modal.Description>
    <div className="mt-4">
      <p className="text-sm">Modal content goes here.</p>
    </div>
  </Modal>
);

export const Medium: Story = () => (
  <Modal trigger={<Button>Open Medium Modal</Button>} size="md">
    <Modal.Title>Medium Modal</Modal.Title>
    <Modal.Description>This is a medium modal (600px wide).</Modal.Description>
    <div className="mt-4">
      <p className="text-sm">Modal content goes here.</p>
    </div>
  </Modal>
);

export const Large: Story = () => (
  <Modal trigger={<Button>Open Large Modal</Button>} size="lg">
    <Modal.Title>Large Modal</Modal.Title>
    <Modal.Description>This is a large modal (800px wide).</Modal.Description>
    <div className="mt-4">
      <p className="text-sm">Modal content goes here.</p>
    </div>
  </Modal>
);

export const Controlled: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>Open Controlled Modal</Button>
      <Modal open={open} onOpenChange={setOpen}>
        <Modal.Title>Controlled Modal</Modal.Title>
        <Modal.Description>This modal state is controlled externally.</Modal.Description>
        <div className="mt-4 space-y-4">
          <p className="text-sm">You can close this with the X button or programmatically.</p>
          <Button onClick={() => setOpen(false)}>Close Programmatically</Button>
        </div>
      </Modal>
    </div>
  );
};

export const WithForm: Story = () => (
  <Modal trigger={<Button>Open Form Modal</Button>}>
    <Modal.Title>Create New Project</Modal.Title>
    <Modal.Description>Enter the details for your new project.</Modal.Description>
    <div className="mt-6 space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Project Name</label>
        <input
          type="text"
          className="w-full rounded-sm border border-neutral-6 bg-neutral-5 px-3 py-2 text-sm"
          placeholder="my-project"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Description</label>
        <textarea
          className="w-full rounded-sm border border-neutral-6 bg-neutral-5 px-3 py-2 text-sm"
          rows={3}
          placeholder="Project description..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button>Create Project</Button>
      </div>
    </div>
  </Modal>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Modal Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Dialog wrapper with composed Title and Description subcomponents. Provides centered modal with overlay, close button, and size variants.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-5/80 h-8 w-32 rounded-sm" />
          <code className="text-xs">bg-neutral-5/80</code>
          <span className="text-neutral-11 text-xs">- Overlay background (80% opacity)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-neutral-1 h-8 w-32 rounded-sm" />
          <code className="text-xs">bg-neutral-1</code>
          <span className="text-neutral-11 text-xs">- Modal content background</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold">Title</span>
          <code className="text-xs">text-2xl font-extrabold</code>
          <span className="text-neutral-11 text-xs">- Modal.Title (inherits color)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-10 text-sm font-medium">Description</span>
          <code className="text-xs">text-neutral-10 text-sm font-medium</code>
          <span className="text-neutral-11 text-xs">- Modal.Description</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Close Button</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">text-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Default icon color</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">hover:text-accent hover:border-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Hover states</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">absolute right-5 top-5</code>
          <span className="text-neutral-11 text-xs">- Positioned in top right</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size Variants</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">w-[450px]</code>
          <span className="text-neutral-11 text-xs">- Small (default)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">w-[600px]</code>
          <span className="text-neutral-11 text-xs">- Medium</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">w-[800px]</code>
          <span className="text-neutral-11 text-xs">- Large</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">fixed inset-0 z-50</code>
          <span className="text-neutral-11 text-xs">- Overlay positioning</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">left-1/2 top-1/2</code>
          <span className="text-neutral-11 text-xs">- Content centered (with translate)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">max-h-[95%] max-w-[95%]</code>
          <span className="text-neutral-11 text-xs">- Responsive sizing</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">overflow-auto</code>
          <span className="text-neutral-11 text-xs">- Scrollable content</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-md p-7</code>
          <span className="text-neutral-11 text-xs">- Border radius and padding</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">ModalTooltipContext</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Special context for tooltips inside modals:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Provides modal content div as portal container</li>
            <li>Ensures tooltips render inside modal (proper z-index)</li>
            <li>Used by V2 Tooltip component</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">TooltipProvider</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-10 text-xs">
            Modal wraps content in TooltipProvider so tooltips work correctly inside modal
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Custom Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">hive-modal-overlay</code>
          <span className="text-neutral-11 text-xs">- Overlay class for global styling</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">hive-modal</code>
          <span className="text-neutral-11 text-xs">- Content class for global styling</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Dialog primitives (Root, Trigger, Portal, Overlay, Content, Close, Title, Description)</li>
        <li>Object.assign pattern to attach Title and Description as static properties</li>
        <li>XIcon component for close button</li>
        <li>Button component (ghost variant, icon size) for close</li>
        <li>Trigger uses asChild for polymorphic rendering</li>
        <li>Controlled via open and onOpenChange props</li>
        <li>Size prop maps to widthBySize object</li>
        <li>Custom className supported on content</li>
      </ul>
    </div>
  </div>
);

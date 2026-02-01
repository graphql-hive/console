import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import type { Story } from '@ladle/react';

export default {
  title: 'Common / Discard Access Token Draft',
};

export const Default: Story = () => (
  <DiscardAccessTokenDraft
    onContinue={() => {
      console.log('Continue creating token');
    }}
    onDiscard={() => {
      console.log('Discard draft token');
    }}
  />
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Common Discard Access Token Draft Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Confirmation dialog for discarding draft access token. Uses AlertDialog with two actions:
        continue editing or discard draft.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Structure</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<AlertDialog open>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Do you want to discard the access token?</AlertDialogTitle>
      <AlertDialogDescription>
        If you discard now, any draft information will be lost.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={onContinue}>
        Continue creating token
      </AlertDialogCancel>
      <AlertDialogAction onClick={onDiscard}>
        Discard draft token
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`type DiscardAccessTokenDraftProps = {
  onContinue: () => void;  // Continue editing token
  onDiscard: () => void;   // Discard draft and close
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">AlertDialog Components Used</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>AlertDialog - Root component (always open)</li>
        <li>AlertDialogContent - Modal content container</li>
        <li>AlertDialogHeader - Header section with title and description</li>
        <li>AlertDialogTitle - Main heading</li>
        <li>AlertDialogDescription - Supporting text</li>
        <li>AlertDialogFooter - Action buttons container</li>
        <li>AlertDialogCancel - Cancel/Continue button</li>
        <li>AlertDialogAction - Destructive/Confirm button</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Button Labels</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">AlertDialogCancel</code>
          <span className="text-neutral-11 text-xs">- "Continue creating token"</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">AlertDialogAction</code>
          <span className="text-neutral-11 text-xs">- "Discard draft token"</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Use Cases</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>User navigates away from access token creation form</li>
        <li>Unsaved changes in token configuration</li>
        <li>Confirmation before losing draft data</li>
        <li>Destructive action requiring explicit user consent</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Always rendered as open (no trigger needed)</li>
        <li>Parent component controls when to mount/unmount</li>
        <li>Two callback props for different outcomes</li>
        <li>Uses standard AlertDialog styling and behavior</li>
        <li>Cancel action is non-red-500 (continue editing)</li>
        <li>Action button is destructive (discard draft)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Example</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`const [showDiscard, setShowDiscard] = useState(false);

// Show when user tries to leave with unsaved changes
if (showDiscard) {
  return (
    <DiscardAccessTokenDraft
      onContinue={() => setShowDiscard(false)}
      onDiscard={() => {
        clearDraft();
        navigate('/tokens');
      }}
    />
  );
}`}
      </pre>
    </div>
  </div>
);

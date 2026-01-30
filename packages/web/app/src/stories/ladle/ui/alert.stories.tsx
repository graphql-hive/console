import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Alert',
};

export const Default: Story = () => (
  <Alert>
    <AlertTitle>Default Alert</AlertTitle>
    <AlertDescription>This is a default alert with neutral colors</AlertDescription>
  </Alert>
);

export const Destructive: Story = () => (
  <Alert variant="destructive">
    <AlertTitle>Destructive Alert</AlertTitle>
    <AlertDescription>This is a destructive alert for errors and warnings</AlertDescription>
  </Alert>
);

export const WithIcon: Story = () => (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>Information</AlertTitle>
    <AlertDescription>You can add icons to alerts for better visual hierarchy</AlertDescription>
  </Alert>
);

export const DestructiveWithIcon: Story = () => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
  </Alert>
);

export const VariousIcons: Story = () => (
  <div className="max-w-2xl space-y-4">
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>This is an informational alert with an info icon</AlertDescription>
    </Alert>

    <Alert>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>Your changes have been saved successfully</AlertDescription>
    </Alert>

    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        This action cannot be undone. Please proceed with caution.
      </AlertDescription>
    </Alert>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-1 max-w-3xl space-y-8 p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Alert Variants</h2>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-11 mb-2 text-sm font-medium">
            Default (bg-neutral-3, text-neutral-11)
          </p>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>
              Uses neutral colors for general information. Background is neutral-3 with neutral-11
              text.
            </AlertDescription>
          </Alert>
        </div>

        <div>
          <p className="text-neutral-11 mb-2 text-sm font-medium">
            Destructive (border-red/50, text-red)
          </p>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Destructive Alert</AlertTitle>
            <AlertDescription>
              Uses destructive colors for errors and critical warnings. Border and text use the
              destructive color.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Schema Updated</AlertTitle>
          <AlertDescription>
            Your GraphQL schema has been successfully updated. The changes will be reflected in the
            next deployment.
          </AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Rate Limit Exceeded</AlertTitle>
          <AlertDescription>
            You've exceeded your API rate limit. Please wait before making more requests or upgrade
            your plan.
          </AlertDescription>
        </Alert>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Migration Complete</AlertTitle>
          <AlertDescription>
            All data has been successfully migrated to the new database. You can now proceed with
            testing.
          </AlertDescription>
        </Alert>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Icon Positioning</h2>
      <p className="text-neutral-11 mb-4 text-sm">
        Icons are positioned absolutely at left-4 top-4, with content padding applied via
        [&gt;svg~*]:pl-7
      </p>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Icon Alignment</AlertTitle>
        <AlertDescription>
          Notice how the icon aligns with the title and the content is properly padded. The icon
          color is neutral-11 by default and inherits the text color for destructive variants.
        </AlertDescription>
      </Alert>
    </div>
  </div>
);

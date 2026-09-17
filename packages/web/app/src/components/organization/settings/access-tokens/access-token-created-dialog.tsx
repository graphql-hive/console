import { useState } from 'react';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Callout } from '@/components/ui/callout';
import { InputCopy } from '@/components/ui/input-copy';

/** Shows a freshly created token once, and only lets go once the user says they stored it. */
export function AccessTokenCreatedDialog(props: {
  open: boolean;
  privateAccessKey: string;
  onClose: () => void;
}) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  return (
    <AlertDialog
      open={props.open}
      title="Access Token Created"
      description="Your API access token has been generated successfully"
      confirm={{
        label: 'Confirm',
        disabled: !isConfirmed,
        onClick: () => {
          setIsConfirmed(false);
          props.onClose();
        },
      }}
      cancel={false}
    >
      <div className="flex flex-col gap-4">
        <InputCopy value={props.privateAccessKey} onSurface="raised" />
        <Callout type="info">
          This is your unique API key and it is non-recoverable. If you lose this key, you will need
          to create a new one.
        </Callout>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="AccessTokenCreatedDialog-isConfirmed"
            checked={isConfirmed}
            onCheckedChange={value => setIsConfirmed(!!value)}
          />
          <label
            htmlFor="AccessTokenCreatedDialog-isConfirmed"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I stored the access token somewhere safe
          </label>
        </div>
      </div>
    </AlertDialog>
  );
}

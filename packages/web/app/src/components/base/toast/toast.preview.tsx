import { createPreview, type NavPath } from 'react-foundry';
import { Button as LegacyButton } from '@/components/ui/button';
import { Toaster as LegacyToaster } from '@/components/ui/toaster';
import { useToast as useLegacyToast } from '@/components/ui/use-toast';
import { Button } from '../button/button';
import { useToast } from './toast';

export const nav: NavPath = 'Base/Feedback/Toast';

/**
 * One call shape, `toast({ title, description, variant })`, drawn on the neutral-3 surface with a
 * status icon. Up to three stack in the corner, collapsed to the front one until hovered or
 * focused; default and success toasts leave after 5s, destructive ones stay until closed. Swipe
 * right or down to dismiss. Replaces `ui/toast`, `ui/toaster`, `ui/use-toast` and react-toastify.
 *
 * The provider is mounted by foundry's providers, as the router mounts it in the app.
 */

export const Variants = createPreview(() => {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() =>
          toast({ title: 'Token created', description: 'The token has been successfully created.' })
        }
      >
        Default
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            variant: 'success',
            title: 'Filter updated',
            description: 'The saved filter has been updated.',
          })
        }
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            variant: 'destructive',
            title: 'Failed to update the member role',
            description: 'You do not have permission to perform this action.',
          })
        }
      >
        Destructive
      </Button>
      <Button variant="outline" onClick={() => toast({ title: 'Copied to clipboard' })}>
        Title only
      </Button>
    </div>
  );
});

/** Fire several: they stack, collapsed behind the newest, and expand on hover. */
export const Stack = createPreview(() => {
  const { toast } = useToast();
  return (
    <Button
      variant="outline"
      onClick={() => {
        toast({ title: 'Schema published', description: 'Version 3f9a is live on the CDN.' });
        toast({
          variant: 'destructive',
          title: 'Failed to update the alert',
          description: 'Channel "Slack #alerts" no longer exists.',
        });
        toast({ variant: 'success', title: 'Member role updated' });
        toast({ title: 'Invitation sent', description: 'user@the-guild.dev will get an email.' });
      }}
    >
      Fire four (the limit is three)
    </Button>
  );
});

/** A server error as most descriptions are: long, and sticky until read. */
export const LongError = createPreview(() => {
  const { toast } = useToast();
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast({
          variant: 'destructive',
          title: 'Schema composition failed',
          description:
            'Field "User.email" is defined in subgraph "accounts" but is not resolvable from subgraph "reviews". Check that the field is marked @shareable or resolvable via @key.',
        })
      }
    >
      Fire a long error
    </Button>
  );
});

/** `duration` overrides the variant's timeout; the join page keeps its welcome up for 10s. */
export const Duration = createPreview(() => {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'Welcome to the-guild',
            description: 'You can switch organizations from the avatar menu.',
            duration: 10_000,
          })
        }
      >
        10s
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          const { dismiss } = toast({ title: 'Dismissed by code in 1.5s', duration: 0 });
          setTimeout(dismiss, 1500);
        }}
      >
        Sticky, then dismiss()
      </Button>
    </div>
  );
});

/**
 * The same toasts on the legacy toaster and on base, for the gate. Both draw in the same corner,
 * so fire one side at a time. The legacy one keeps a single toast that never leaves on its own.
 */
export const Legacy = createPreview(() => {
  const legacy = useLegacyToast();
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <LegacyButton
        onClick={() =>
          legacy.toast({
            variant: 'destructive',
            title: 'Failed to update the member role',
            description: 'You do not have permission to perform this action.',
          })
        }
      >
        Legacy destructive
      </LegacyButton>
      <LegacyButton
        onClick={() =>
          legacy.toast({
            title: 'Token created',
            description: 'The token has been successfully created.',
          })
        }
      >
        Legacy default
      </LegacyButton>
      <Button
        variant="primary"
        onClick={() =>
          toast({
            variant: 'destructive',
            title: 'Failed to update the member role',
            description: 'You do not have permission to perform this action.',
          })
        }
      >
        Base destructive
      </Button>
      <Button
        variant="primary"
        onClick={() =>
          toast({ title: 'Token created', description: 'The token has been successfully created.' })
        }
      >
        Base default
      </Button>
      <LegacyToaster />
    </div>
  );
});

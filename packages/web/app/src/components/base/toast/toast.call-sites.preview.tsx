import { createPreview, type NavPath } from 'react-foundry';
import { CallSite } from '@/components/inventory/shared';
import { Button } from '../button/button';
import { useToast } from './toast';

export const nav: NavPath = 'Base/Feedback/Toast/Component Examples';

/**
 * Every toast shape in the app, one preview per shape with the call sites it stands for. The
 * copy is the real copy; the mutations behind it are stood in by a button.
 */

export const FailureWithMessage = createPreview({
  label: 'Failure with the server message',
  render: () => <FailureExample />,
});

function FailureExample() {
  const { toast } = useToast();
  return (
    <CallSite
      source="organization/members/list.tsx:468 (stands for about 105 destructive calls, most of them a mutation's error message under a fixed title)"
      origin="base"
      note="Sticky until closed, since the description is the only record of what went wrong."
    >
      <Button
        variant="outline"
        onClick={() =>
          toast({
            variant: 'destructive',
            title: 'Failed to delete a member',
            description: 'You do not have permission to perform this action.',
          })
        }
      >
        Delete member (fails)
      </Button>
    </CallSite>
  );
}

export const Confirmation = createPreview({
  label: 'Confirmation',
  render: () => <ConfirmationExample />,
});

function ConfirmationExample() {
  const { toast } = useToast();
  return (
    <CallSite
      source="pages/organization-join.tsx:72 (stands for the default-variant successes: member deleted, role updated, ticket submitted, filter saved)"
      origin="base"
      note="Leaves after five seconds."
    >
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'Joined organization',
            description: 'You are now a member of the-guild',
          })
        }
      >
        Accept invitation
      </Button>
    </CallSite>
  );
}

export const TitleOnly = createPreview({
  label: 'Title only',
  render: () => <TitleOnlyExample />,
});

function TitleOnlyExample() {
  const { toast } = useToast();
  return (
    <CallSite
      source="lib/hooks/use-clipboard.ts:19 (stands for the laboratory's 'Updated!' and the other single-line toasts that came over from react-toastify)"
      origin="base"
    >
      <Button variant="outline" onClick={() => toast({ title: 'Copied to clipboard' })}>
        Copy
      </Button>
    </CallSite>
  );
}

export const Success = createPreview({
  label: 'Success variant',
  render: () => <SuccessExample />,
});

function SuccessExample() {
  const { toast } = useToast();
  return (
    <CallSite
      source="pages/target-insights-manage-filters.tsx:555"
      origin="base"
      note="The one call site on the success variant."
    >
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
        Update filter
      </Button>
    </CallSite>
  );
}

export const LongerDuration = createPreview({
  label: 'Longer duration',
  render: () => <DurationExample />,
});

function DurationExample() {
  const { toast } = useToast();
  return (
    <CallSite
      source="pages/organization-join.tsx:97"
      origin="base"
      note="The one call site that sets a duration: it fires while redirecting to sign in, so it stays up for ten seconds."
    >
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'Account Required',
            description:
              'To accept an organization invite, you must first have an account, log in, and then use the invitation.',
            variant: 'default',
            duration: 10_000,
          })
        }
      >
        Open an invite while signed out
      </Button>
    </CallSite>
  );
}

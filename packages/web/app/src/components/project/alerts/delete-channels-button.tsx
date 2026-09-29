import { useMutation } from 'urql';
import { Button } from '@/components/base/button/button';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';

export const DeleteChannelsButton_DeleteChannelsMutation = graphql(`
  mutation DeleteChannelsButton_DeleteChannelsMutation($input: DeleteAlertChannelsInput!) {
    deleteAlertChannels(input: $input) {
      ok {
        updatedProject {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

export function DeleteChannelsButton({
  selected,
  onSuccess,
}: {
  selected: string[];
  onSuccess(): void;
}) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const [mutation, mutate] = useMutation(DeleteChannelsButton_DeleteChannelsMutation);

  return (
    <Button
      variant="destructive"
      disabled={selected.length === 0 || mutation.fetching}
      onClick={async () => {
        await mutate({
          input: {
            organizationSlug,
            projectSlug,
            channelIds: selected,
          },
        });
        onSuccess();
      }}
    >
      Delete {selected.length || null}
    </Button>
  );
}

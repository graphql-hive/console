import { ReactElement, useCallback } from 'react';
import { useMutation } from 'urql';
import { Button, Tooltip } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';

const UpdateSchemaVersionStatusMutation = graphql(`
  mutation updateSchemaVersionStatus($input: SchemaVersionUpdateInput!) {
    updateSchemaVersionStatus(input: $input) {
      id
      date
      valid
      log {
        ... on PushedSchemaLog {
          id
          author
          service
          commit
        }
        ... on DeletedSchemaLog {
          id
          deletedService
        }
      }
      baseSchema
    }
  }
`);

const MarkAsValid_SchemaVersionFragment = graphql(`
  fragment MarkAsValid_SchemaVersionFragment on SchemaVersion {
    id
    valid
  }
`);

export function MarkAsValid(props: {
  version: FragmentType<typeof MarkAsValid_SchemaVersionFragment>;
  organizationId: string;
  projectId: string;
  targetId: string;
}): ReactElement | null {
  const version = useFragment(MarkAsValid_SchemaVersionFragment, props.version);
  const [mutation, mutate] = useMutation(UpdateSchemaVersionStatusMutation);
  const markAsValid = useCallback(async () => {
    await mutate({
      input: {
        organization: props.organizationId,
        project: props.projectId,
        target: props.targetId,
        version: version.id,
        valid: true,
      },
    });
  }, [mutate, version]);

  if (version?.valid) {
    return null;
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip content="Enforce a valid state of the schema version. We don't recommend to change the status of your schema manually">
        <Button variant="link" disabled={mutation.fetching} onClick={markAsValid}>
          Mark as valid
        </Button>
      </Tooltip>
    </Tooltip.Provider>
  );
}

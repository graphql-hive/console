import { ReactElement, useCallback, useState } from 'react';
import {
  Editable,
  EditableInput,
  EditablePreview,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Tooltip,
} from '@chakra-ui/react';
import { VscClose, VscSync } from 'react-icons/vsc';
import { gql, useMutation, useQuery } from 'urql';
import { useDebouncedCallback } from 'use-debounce';

import { TargetLayout } from '@/components/layouts';
import { MarkAsValid } from '@/components/target/history/MarkAsValid';
import { Button, DataWrapper, GraphQLBlock, noSchema, Title } from '@/components/v2';
import { Link2Icon } from '@/components/v2/icon';
import { ConnectSchemaModal } from '@/components/v2/modals';
import { SchemaFieldsFragment } from '@/gql/graphql';
import { OrganizationFieldsFragment, ProjectFieldsFragment, ProjectType, TargetFieldsFragment } from '@/graphql';
import { TargetAccessScope, useTargetAccess } from '@/lib/access/target';

const SchemaServiceName_UpdateSchemaServiceName = gql(/* GraphQL */ `
  mutation SchemaServiceName_UpdateSchemaServiceName($input: UpdateSchemaServiceNameInput!) {
    updateSchemaServiceName(input: $input) {
      ok {
        updatedTarget {
          ...TargetFields
          latestSchemaVersion {
            id
            valid
            schemas {
              nodes {
                ...SchemaFields
              }
            }
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const SchemaServiceName: React.FC<{
  version: string;
  schema: SchemaFieldsFragment;
  target: TargetFieldsFragment;
  project: ProjectFieldsFragment;
  organization: OrganizationFieldsFragment;
}> = ({ target, project, organization, schema, version }) => {
  const [mutation, mutate] = useMutation(SchemaServiceName_UpdateSchemaServiceName);
  const hasAccess = useTargetAccess({
    scope: TargetAccessScope.RegistryWrite,
    member: organization.me,
    redirect: false,
  });

  const submit = useCallback(
    (newName: string) => {
      if (schema.service === newName) {
        return;
      }

      if (newName.trim().length === 0) {
        return;
      }

      mutate({
        input: {
          organization: organization.cleanId,
          project: project.cleanId,
          target: target.cleanId,
          version,
          name: schema.service!,
          newName,
        },
      });
    },
    [mutate]
  );

  if ((project.type !== ProjectType.Federation && project.type !== ProjectType.Stitching) || !hasAccess) {
    return <>{schema.service}</>;
  }

  return (
    <Editable defaultValue={schema.service} isDisabled={mutation.fetching} onSubmit={submit}>
      <EditablePreview />
      <EditableInput />
    </Editable>
  );
};

const Schemas: React.FC<{
  organization: OrganizationFieldsFragment;
  project: ProjectFieldsFragment;
  target: TargetFieldsFragment;
  schemas: SchemaFieldsFragment[];
  version: string;
  filterService?: string;
}> = ({ organization, project, target, filterService, version, schemas = [] }) => {
  if (project.type === ProjectType.Single) {
    return <GraphQLBlock className="mb-6" sdl={schemas[0].source} url={schemas[0].url} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {schemas
        .filter(schema => {
          if (filterService && schema.service) {
            return schema.service.toLowerCase().includes(filterService.toLowerCase());
          }

          return true;
        })
        .map(schema => (
          <GraphQLBlock
            key={schema.id}
            sdl={schema.source}
            url={schema.url}
            title={
              <SchemaServiceName
                version={version}
                schema={schema}
                target={target}
                project={project}
                organization={organization}
              />
            }
          />
        ))}
    </div>
  );
};

const SchemaView_LatestSchema = gql(/* GraphQL */ `
  query SchemaView_LatestSchema($selector: TargetSelectorInput!) {
    target(selector: $selector) {
      ...TargetFields
      latestSchemaVersion {
        id
        valid
        schemas {
          nodes {
            ...SchemaFields
          }
        }
      }
    }
  }
`);

const SchemaSyncButton_SchemaSyncCDN = gql(/* GraphQL */ `
  mutation schemaSyncCdn($input: SchemaSyncCDNInput!) {
    schemaSyncCDN(input: $input) {
      __typename
      ... on SchemaSyncCDNSuccess {
        message
      }
      ... on SchemaSyncCDNError {
        message
      }
    }
  }
`);

const SyncSchemaButton: React.FC<{
  target: TargetFieldsFragment;
  project: ProjectFieldsFragment;
  organization: OrganizationFieldsFragment;
}> = ({ target, project, organization }) => {
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [mutation, mutate] = useMutation(SchemaSyncButton_SchemaSyncCDN);
  const hasAccess = useTargetAccess({
    scope: TargetAccessScope.RegistryWrite,
    member: organization.me,
    redirect: false,
  });

  const sync = useCallback(() => {
    mutate({
      input: {
        organization: organization.cleanId,
        project: project.cleanId,
        target: target.cleanId,
      },
    }).then(result => {
      if (result.error) {
        setStatus('error');
      } else {
        setStatus(result.data?.schemaSyncCDN.__typename === 'SchemaSyncCDNError' ? 'error' : 'success');
      }
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    });
  }, [mutate, setStatus]);

  if (!hasAccess || !target.hasSchema) {
    return null;
  }

  return (
    <Tooltip label="Re-upload the latest valid version to Hive CDN" fontSize="xs" placement="bottom-start">
      <Button variant="primary" size="large" onClick={sync} disabled={status !== 'idle' || mutation.fetching}>
        {mutation.fetching
          ? 'Syncing...'
          : status === 'idle'
          ? 'Update CDN'
          : status === 'error'
          ? 'Failed to synchronize'
          : 'CDN is up to date'}
        <VscSync className="ml-8" />
      </Button>
    </Tooltip>
  );
};

function SchemaView({
  organization,
  project,
  target,
}: {
  organization: OrganizationFieldsFragment;
  project: ProjectFieldsFragment;
  target: TargetFieldsFragment;
}) {
  const [isModalOpen, setModalOpen] = useState(false);
  const toggleModalOpen = useCallback(() => {
    setModalOpen(prevOpen => !prevOpen);
  }, []);

  const [filterService, setFilterService] = useState<string | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const debouncedFilter = useDebouncedCallback((value: string) => {
    setFilterService(value);
  }, 500);
  const handleChange = useCallback(
    event => {
      debouncedFilter(event.target.value);
      setTerm(event.target.value);
    },
    [debouncedFilter, setTerm]
  );
  const reset = useCallback(() => {
    setFilterService('');
    setTerm('');
  }, [setFilterService]);

  const isDistributed = project.type === ProjectType.Federation || project.type === ProjectType.Stitching;

  const [query] = useQuery({
    query: SchemaView_LatestSchema,
    variables: {
      selector: {
        organization: organization.cleanId,
        project: project.cleanId,
        target: target.cleanId,
      },
    },
    requestPolicy: 'cache-and-network',
  });

  if (!query.data?.target?.latestSchemaVersion?.schemas.nodes.length) {
    return <>{noSchema}</>;
  }

  return (
    <DataWrapper query={query}>
      {() => (
        <>
          <div className="flex flex-row items-center justify-between">
            <div className="font-light text-gray-500">The latest published schema.</div>
            <div className="flex flex-row items-center gap-4">
              {isDistributed && (
                <form
                  onSubmit={event => {
                    event.preventDefault();
                  }}
                >
                  <InputGroup size="sm" variant="filled">
                    <Input type="text" placeholder="Find service" value={term} onChange={handleChange} />
                    <InputRightElement>
                      <IconButton aria-label="Reset" size="xs" variant="ghost" onClick={reset} icon={<VscClose />} />
                    </InputRightElement>
                  </InputGroup>
                </form>
              )}
              <MarkAsValid version={query.data.target.latestSchemaVersion} />
              <SyncSchemaButton target={target} project={project} organization={organization} />
              <Button size="large" variant="primary" onClick={toggleModalOpen}>
                Connect
                <Link2Icon className="ml-8" />
              </Button>
            </div>
          </div>
          <div className="my-8">
            <Schemas
              organization={organization}
              project={project}
              target={query.data.target}
              filterService={filterService}
              version={query.data.target.latestSchemaVersion.id}
              schemas={query.data.target.latestSchemaVersion.schemas.nodes ?? []}
            />
          </div>
          <ConnectSchemaModal isOpen={isModalOpen} toggleModalOpen={toggleModalOpen} />
        </>
      )}
    </DataWrapper>
  );
}

export default function SchemaPage(): ReactElement {
  return (
    <>
      <Title title="Schema" />
      <TargetLayout value="schema">{props => <SchemaView {...props} />}</TargetLayout>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CombinedError, useQuery } from 'urql';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { useToast } from '@/components/base/toast/toast';
import { ProductUpdatesLink } from '@/components/ui/docs-note';
import { FragmentType, graphql, useFragment } from '@/gql';
import { UpdateSchemaCompositionInput } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, Cross2Icon, ReloadIcon, UpdateIcon } from '@radix-ui/react-icons';
import {
  ExternalCompositionForm,
  ExternalCompositionFormSchema,
  type ExternalCompositionFormValues,
} from './external-composition-form';

const ExternalCompositionStatus_TestQuery = graphql(`
  query ExternalCompositionStatus_TestQuery($selector: TestExternalSchemaCompositionInput!) {
    testExternalSchemaComposition(selector: $selector) {
      ok {
        id
        isNativeFederationEnabled
        externalSchemaComposition {
          endpoint
        }
      }
      error {
        message
      }
    }
  }
`);

const ExternalCompositionSettings_OrganizationFragment = graphql(`
  fragment ExternalCompositionSettings_OrganizationFragment on Organization {
    id
    slug
  }
`);

const ExternalCompositionSettings_ProjectFragment = graphql(`
  fragment ExternalCompositionSettings_ProjectFragment on Project {
    id
    slug
    isNativeFederationEnabled
    externalSchemaComposition {
      endpoint
    }
  }
`);

const ExternalCompositionSettings_UpdateResultFragment = graphql(`
  fragment ExternalCompositionSettings_UpdateResultFragment on UpdateSchemaCompositionResult {
    ok {
      updatedProject {
        id
        externalSchemaComposition {
          endpoint
        }
      }
    }
    error {
      message
      ... on UpdateSchemaCompositionExternalError {
        inputErrors {
          endpoint
          secret
        }
      }
    }
  }
`);

enum TestState {
  LOADING,
  ERROR,
  SUCCESS,
}

const ExternalCompositionStatus = ({
  projectSlug,
  organizationSlug,
}: {
  projectSlug: string;
  organizationSlug: string;
}) => {
  const [{ data, error: gqlError, fetching }, executeTestQuery] = useQuery({
    query: ExternalCompositionStatus_TestQuery,
    variables: {
      selector: {
        projectSlug,
        organizationSlug,
      },
    },
    requestPolicy: 'network-only',
  });
  const error = gqlError?.message ?? data?.testExternalSchemaComposition?.error?.message;
  const testState = fetching
    ? TestState.LOADING
    : error
      ? TestState.ERROR
      : data?.testExternalSchemaComposition?.ok?.externalSchemaComposition?.endpoint
        ? TestState.SUCCESS
        : null;

  const [hidden, setHidden] = useState<boolean>();

  useEffect(() => {
    // only hide the success icon after the duration
    if (testState !== TestState.SUCCESS) return;
    const timerId = setTimeout(() => {
      if (testState === TestState.SUCCESS) {
        setHidden(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timerId);
    };
  }, [testState]);

  return (
    <>
      {testState === TestState.LOADING ? (
        <Tooltip
          trigger={
            <span className="inline-flex">
              <UpdateIcon
                className="text-neutral-10 size-5 animate-spin cursor-default"
                onClick={e => e.preventDefault()}
              />
            </span>
          }
          content="Connecting..."
          side="bottom"
        />
      ) : (
        <Tooltip
          trigger={
            <button
              type="button"
              aria-label="Execute test"
              onClick={e => {
                e.preventDefault();
                setHidden(true);
                executeTestQuery();
              }}
            >
              <ReloadIcon className="size-5" />
            </button>
          }
          content="Execute test"
          side="bottom"
        />
      )}
      {testState === TestState.ERROR ? (
        <Tooltip
          defaultOpen
          trigger={
            <span className="inline-flex">
              <Cross2Icon
                className="size-5 cursor-default text-red-500"
                onClick={e => e.preventDefault()}
              />
            </span>
          }
          content={error}
          side="bottom"
          maxWidth="md"
        />
      ) : null}
      {testState === TestState.SUCCESS && !hidden ? (
        <Tooltip
          trigger={
            <span className="inline-flex">
              <CheckIcon
                className="size-5 cursor-default text-green-500"
                onClick={e => e.preventDefault()}
              />
            </span>
          }
          content="Service is available"
          side="bottom"
          maxWidth="md"
        />
      ) : null}
    </>
  );
};

export const ExternalCompositionSettings = (props: {
  project: FragmentType<typeof ExternalCompositionSettings_ProjectFragment>;
  organization: FragmentType<typeof ExternalCompositionSettings_OrganizationFragment>;
  activeCompositionMode: 'native' | 'external' | 'legacy';
  onMutate: (
    input: UpdateSchemaCompositionInput,
  ) => Promise<
    FragmentType<typeof ExternalCompositionSettings_UpdateResultFragment> | CombinedError
  >;
}) => {
  const project = useFragment(ExternalCompositionSettings_ProjectFragment, props.project);
  const organization = useFragment(
    ExternalCompositionSettings_OrganizationFragment,
    props.organization,
  );
  const { toast } = useToast();
  const [error, setError] = useState<string>();
  const [isMutating, setIsMutating] = useState(false);

  const form = useForm<ExternalCompositionFormValues>({
    resolver: zodResolver(ExternalCompositionFormSchema),
    mode: 'onChange',
    defaultValues: {
      endpoint: project.externalSchemaComposition?.endpoint ?? '',
      secret: '',
    },
    disabled: isMutating,
  });

  function onSubmit(values: ExternalCompositionFormValues) {
    setError(undefined);
    setIsMutating(true);
    void props
      .onMutate({
        project: {
          bySelector: {
            projectSlug: project.slug,
            organizationSlug: organization.slug,
          },
        },
        method: {
          external: {
            endpoint: values.endpoint,
            secret: values.secret,
          },
        },
      })
      .then(result => {
        setIsMutating(false);
        if (result instanceof CombinedError) {
          toast({ variant: 'destructive', title: result.message });
          setError(result.message);
        } else {
          // actually not a hook
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const updateResult = useFragment(
            ExternalCompositionSettings_UpdateResultFragment,
            result,
          );
          if (updateResult.ok) {
            const endpoint = updateResult.ok.updatedProject.externalSchemaComposition?.endpoint;

            toast({ title: 'External composition enabled.' });

            if (endpoint) {
              form.reset(
                {
                  endpoint,
                  secret: '',
                },
                {
                  keepDirty: false,
                  keepDirtyValues: false,
                },
              );
            }
          } else if (updateResult.error) {
            toast({ variant: 'destructive', title: updateResult.error.message });
            setError(updateResult.error.message);

            if (updateResult.error.__typename === 'UpdateSchemaCompositionExternalError') {
              if (updateResult.error.inputErrors?.endpoint) {
                form.setError('endpoint', {
                  type: 'manual',
                  message: updateResult.error.inputErrors.endpoint,
                });
              }

              if (updateResult.error.inputErrors?.secret) {
                form.setError('secret', {
                  type: 'manual',
                  message: updateResult.error.inputErrors.secret,
                });
              }
            }
          }
        }
      });
  }

  return (
    <div className="flex flex-col items-start gap-y-6">
      <div>
        <p className="text-neutral-10 max-w-2xl text-sm">
          For advanced users, you can configure an endpoint for external schema compositions. This
          can be used to implement custom composition logic.
        </p>
        <ProductUpdatesLink
          href="https://the-guild.dev/graphql/hive/docs/features/external-schema-composition"
          text="Read about external schema composition in our documentation."
        />
      </div>
      <div className="flex justify-between">
        <ExternalCompositionForm
          form={form}
          onSubmit={onSubmit}
          endpointStatus={
            project.externalSchemaComposition?.endpoint ? (
              <ExternalCompositionStatus
                projectSlug={project.slug}
                organizationSlug={organization.slug}
              />
            ) : null
          }
          error={error}
          submitLabel={
            props.activeCompositionMode === 'external'
              ? 'Save Configuration'
              : 'Use External Composition'
          }
        />
      </div>
    </div>
  );
};

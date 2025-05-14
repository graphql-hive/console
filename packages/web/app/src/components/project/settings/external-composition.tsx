import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocsNote, ProductUpdatesLink } from '@/components/ui/docs-note';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useNotifications } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, Cross2Icon, ReloadIcon, UpdateIcon } from '@radix-ui/react-icons';

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

const ExternalCompositionForm_EnableMutation = graphql(`
  mutation ExternalCompositionForm_EnableMutation($input: EnableExternalSchemaCompositionInput!) {
    enableExternalSchemaComposition(input: $input) {
      ok {
        id
        isNativeFederationEnabled
        externalSchemaComposition {
          endpoint
        }
      }
      error {
        message
        inputErrors {
          endpoint
          secret
        }
      }
    }
  }
`);

const ExternalCompositionForm_OrganizationFragment = graphql(`
  fragment ExternalCompositionForm_OrganizationFragment on Organization {
    id
    slug
  }
`);

const ExternalCompositionForm_ProjectFragment = graphql(`
  fragment ExternalCompositionForm_ProjectFragment on Project {
    id
    slug
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
    <TooltipProvider delayDuration={100}>
      {testState === TestState.LOADING ? (
        <Tooltip>
          <TooltipTrigger>
            <UpdateIcon
              className="size-5 animate-spin cursor-default text-gray-500"
              onClick={e => e.preventDefault()}
            />
          </TooltipTrigger>
          <TooltipContent side="left">Connecting...</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger>
            <ReloadIcon
              className="size-5"
              onClick={e => {
                e.preventDefault();
                setHidden(true);
                executeTestQuery();
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="mr-1">
            Execute test
          </TooltipContent>
        </Tooltip>
      )}
      {testState === TestState.ERROR ? (
        <Tooltip defaultOpen>
          <TooltipTrigger>
            <Cross2Icon
              className="size-5 cursor-default text-red-500"
              onClick={e => e.preventDefault()}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">
            {error}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {testState === TestState.SUCCESS && !hidden ? (
        <Tooltip>
          <TooltipTrigger>
            <CheckIcon
              className="size-5 cursor-default text-green-500"
              onClick={e => e.preventDefault()}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">
            Service is available
          </TooltipContent>
        </Tooltip>
      ) : null}
    </TooltipProvider>
  );
};

const formSchema = z.object({
  endpoint: z
    .string({
      required_error: 'Please provide an endpoint',
    })
    .url({
      message: 'Invalid URL',
    }),
  secret: z
    .string({
      required_error: 'Please provide a secret',
    })
    .min(2, 'Too short')
    .max(256, 'Max 256 characters long'),
});

type FormValues = z.infer<typeof formSchema>;

const ExternalCompositionForm = ({
  endpoint,
  ...props
}: {
  project: FragmentType<typeof ExternalCompositionForm_ProjectFragment>;
  organization: FragmentType<typeof ExternalCompositionForm_OrganizationFragment>;
  endpoint?: string;
  isNativeCompositionEnabled?: boolean;
  onClickDisable?: () => void;
}) => {
  const project = useFragment(ExternalCompositionForm_ProjectFragment, props.project);
  const organization = useFragment(
    ExternalCompositionForm_OrganizationFragment,
    props.organization,
  );
  const notify = useNotifications();
  const [mutation, enable] = useMutation(ExternalCompositionForm_EnableMutation);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      endpoint: endpoint ?? '',
      secret: '',
    },
    disabled: mutation.fetching,
  });

  function onSubmit(values: FormValues) {
    void enable({
      input: {
        projectSlug: project.slug,
        organizationSlug: organization.slug,
        endpoint: values.endpoint,
        secret: values.secret,
      },
    }).then(result => {
      if (result.data?.enableExternalSchemaComposition?.ok) {
        const endpoint =
          result.data?.enableExternalSchemaComposition?.ok.externalSchemaComposition?.endpoint;

        notify('External composition enabled.', 'success');

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
      } else {
        const error =
          result.error?.message || result.data?.enableExternalSchemaComposition.error?.message;

        if (error) {
          notify(error, 'error');
        }

        const inputErrors = result.data?.enableExternalSchemaComposition.error?.inputErrors;

        if (inputErrors?.endpoint) {
          form.setError('endpoint', {
            type: 'manual',
            message: inputErrors.endpoint,
          });
        }

        if (inputErrors?.secret) {
          form.setError('secret', {
            type: 'manual',
            message: inputErrors.secret,
          });
        }
      }
    });
  }

  return (
    <div className="flex justify-between">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="endpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HTTP Endpoint</FormLabel>
                <FormDescription>A POST request will be sent to that endpoint</FormDescription>
                <div className="flex w-full items-center space-x-2">
                  <FormControl>
                    <Input
                      className="max-w-md shrink-0"
                      placeholder="Endpoint"
                      type="text"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  {!form.formState.isDirty &&
                  (endpoint ||
                    mutation.data?.enableExternalSchemaComposition.ok?.externalSchemaComposition
                      ?.endpoint) ? (
                    <ExternalCompositionStatus
                      projectSlug={project.slug}
                      organizationSlug={organization.slug}
                    />
                  ) : null}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="secret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret</FormLabel>
                <FormDescription>
                  The secret is needed to sign and verify the request.
                </FormDescription>
                <FormControl>
                  <Input
                    className="w-full max-w-md"
                    placeholder="Secret"
                    type="password"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {mutation.error && (
            <div className="mt-2 text-xs text-red-500">{mutation.error.message}</div>
          )}
          {props.isNativeCompositionEnabled ? (
            <DocsNote warn className="mt-0 max-w-2xl">
              Native Federation v2 composition is currently enabled. Until native composition is
              disabled, External Schema Composition won't have any effect.
            </DocsNote>
          ) : null}
          <div className="flex flex-row items-center gap-x-8">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Save Configuration
            </Button>
            {props.onClickDisable ? (
              <Button
                variant="destructive"
                type="button"
                disabled={mutation.fetching || form.formState.isSubmitting}
                onClick={props.onClickDisable}
              >
                Disable External Composition
              </Button>
            ) : null}
          </div>
        </form>
      </Form>
    </div>
  );
};

const ExternalComposition_DisableMutation = graphql(`
  mutation ExternalComposition_DisableMutation($input: DisableExternalSchemaCompositionInput!) {
    disableExternalSchemaComposition(input: $input) {
      ok {
        id
        isNativeFederationEnabled
        externalSchemaComposition {
          endpoint
        }
      }
      error
    }
  }
`);

const ExternalComposition_ProjectConfigurationQuery = graphql(`
  query ExternalComposition_ProjectConfigurationQuery($selector: ProjectSelectorInput!) {
    project(reference: { bySelector: $selector }) {
      id
      slug
      isNativeFederationEnabled
      externalSchemaComposition {
        endpoint
      }
    }
  }
`);

const ExternalCompositionSettings_OrganizationFragment = graphql(`
  fragment ExternalCompositionSettings_OrganizationFragment on Organization {
    slug
    ...ExternalCompositionForm_OrganizationFragment
  }
`);

const ExternalCompositionSettings_ProjectFragment = graphql(`
  fragment ExternalCompositionSettings_ProjectFragment on Project {
    slug
    isNativeFederationEnabled
    ...ExternalCompositionForm_ProjectFragment
  }
`);

export const ExternalCompositionSettings = (props: {
  project: FragmentType<typeof ExternalCompositionSettings_ProjectFragment>;
  organization: FragmentType<typeof ExternalCompositionSettings_OrganizationFragment>;
}) => {
  const project = useFragment(ExternalCompositionSettings_ProjectFragment, props.project);
  const organization = useFragment(
    ExternalCompositionSettings_OrganizationFragment,
    props.organization,
  );
  const [enabled, setEnabled] = useState<boolean>();
  const [mutation, disableComposition] = useMutation(ExternalComposition_DisableMutation);
  const notify = useNotifications();
  const [projectQuery] = useQuery({
    query: ExternalComposition_ProjectConfigurationQuery,
    variables: {
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
      },
    },
  });

  const handleSwitch = useCallback(
    async (status: boolean) => {
      if (status) {
        setEnabled(true);
      } else {
        setEnabled(false);
        const result = await disableComposition({
          input: {
            projectSlug: project.slug,
            organizationSlug: organization.slug,
          },
        });
        const error = result.error?.message || result.data?.disableExternalSchemaComposition.error;
        if (error) {
          notify(error, 'error');
          // fallback to the previous state
          setEnabled(true);
        }
      }
    },
    [disableComposition, setEnabled, notify],
  );

  const externalCompositionConfig = projectQuery.data?.project?.externalSchemaComposition;
  const initialEnabled = !!externalCompositionConfig;
  const isEnabled = typeof enabled === 'boolean' ? enabled : initialEnabled;
  const isLoading = projectQuery.fetching || mutation.fetching;
  const isFormVisible = isEnabled && !isLoading;
  const isNativeCompositionEnabled = projectQuery.data?.project?.isNativeFederationEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>External Schema Composition</div>
          <div>
            {isLoading ? (
              <Spinner />
            ) : (
              <Switch
                className="shrink-0"
                checked={isEnabled}
                onCheckedChange={handleSwitch}
                disabled={mutation.fetching}
              />
            )}
          </div>
        </CardTitle>
        <CardDescription className="max-w-2xl">
          For advanced users, you can configure an endpoint for external schema compositions. This
          can be used to implement custom composition logic.
        </CardDescription>
        <CardDescription>
          <ProductUpdatesLink href="https://the-guild.dev/graphql/hive/docs/features/external-schema-composition">
            Read about external schema composition in our documentation.
          </ProductUpdatesLink>
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isFormVisible ? (
          <ExternalCompositionForm
            project={project}
            organization={organization}
            endpoint={externalCompositionConfig?.endpoint}
            isNativeCompositionEnabled={isNativeCompositionEnabled}
            onClickDisable={() => handleSwitch(false)}
          />
        ) : (
          <Button disabled={mutation.fetching} onClick={() => handleSwitch(true)}>
            Enable external composition
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

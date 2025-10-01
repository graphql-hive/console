import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CombinedError, useQuery } from 'urql';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ProductUpdatesLink } from '@/components/ui/docs-note';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { UpdateSchemaCompositionInput } from '@/gql/graphql';
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

const ExternalCompositionSettings_OrganizationFragment = graphql(`
  fragment ExternalCompositionSettings_OrganizationFragment on Organization {
    slug
  }
`);

const ExternalCompositionSettings_ProjectFragment = graphql(`
  fragment ExternalCompositionSettings_ProjectFragment on Project {
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
      externalSchemaComposition {
        endpoint
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
    <TooltipProvider delayDuration={100}>
      {testState === TestState.LOADING ? (
        <Tooltip>
          <TooltipTrigger>
            <UpdateIcon
              className="size-5 animate-spin cursor-default text-gray-500"
              onClick={e => e.preventDefault()}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">Connecting...</TooltipContent>
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
          <TooltipContent side="bottom" className="mr-1">
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
          <TooltipContent side="bottom" className="max-w-sm">
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
          <TooltipContent side="bottom" className="max-w-sm">
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
  const notify = useNotifications();
  const [error, setError] = useState<string>();
  const [isMutating, setIsMutating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      endpoint: project.externalSchemaComposition?.endpoint ?? '',
      secret: '',
    },
    disabled: isMutating,
  });

  function onSubmit(values: FormValues) {
    setError(undefined);
    setIsMutating(true);
    void props
      .onMutate({
        external: {
          projectSlug: project.slug,
          organizationSlug: organization.slug,
          endpoint: values.endpoint,
          secret: values.secret,
        },
      })
      .then(result => {
        setIsMutating(false);
        if (result instanceof CombinedError) {
          notify(result.message, 'error');
          setError(result.message);
        } else {
          const updateResult = useFragment(
            ExternalCompositionSettings_UpdateResultFragment,
            result,
          );
          if (updateResult.ok) {
            const endpoint = updateResult.ok.externalSchemaComposition?.endpoint;

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
          } else if (updateResult.error) {
            notify(updateResult.error.message, 'error');
            setError(updateResult.error.message);

            if (updateResult.error.__typename === 'UpdateSchemaCompositionExternalError') {
              if (updateResult.error.inputErrors.endpoint) {
                form.setError('endpoint', {
                  type: 'manual',
                  message: updateResult.error.inputErrors.endpoint,
                });
              }

              if (updateResult.error.inputErrors.secret) {
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
        <p className="text-muted-foreground max-w-2xl text-sm">
          For advanced users, you can configure an endpoint for external schema compositions. This
          can be used to implement custom composition logic.
        </p>
        <ProductUpdatesLink href="https://the-guild.dev/graphql/hive/docs/features/external-schema-composition">
          Read about external schema composition in our documentation.
        </ProductUpdatesLink>
      </div>
      <div className="flex justify-between">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-wrap gap-x-24 gap-y-4">
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
                      {!form.formState.isDirty && project.externalSchemaComposition?.endpoint ? (
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
            </div>
            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
            <div className="flex flex-row items-center gap-x-8">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {props.activeCompositionMode === 'external'
                  ? 'Save Configuration'
                  : 'Use External Composition'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

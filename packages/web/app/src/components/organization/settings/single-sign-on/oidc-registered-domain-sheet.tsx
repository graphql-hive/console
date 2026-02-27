import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
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
import * as Sheet from '@/components/ui/sheet';
import { defineStepper } from '@/components/ui/stepper';
import * as Table from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Tag } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';

const OIDCRegisteredDomainSheet_RegisteredDomain = graphql(`
  fragment OIDCRegisteredDomainSheet_RegisteredDomain on OIDCIntegrationDomain {
    id
    domainName
    createdAt
    verifiedAt
    challenge {
      recordValue
      recordName
      recordType
    }
  }
`);

const OIDCRegisteredDomainSheet_RegisterDomainMutation = graphql(`
  mutation OIDCRegisteredDomainSheet_RegisterDomainMutation($input: RegisterOIDCDomainInput!) {
    registerOIDCDomain(input: $input) {
      ok {
        createdOIDCIntegrationDomain {
          id
          ...OIDCRegisteredDomainSheet_RegisteredDomain
        }
        oidcIntegration {
          ...OIDCDomainConfiguration_OIDCIntegrationFragment
        }
      }
      error {
        message
      }
    }
  }
`);

const OIDCRegisteredDomainSheet_VerifyDomainMutation = graphql(`
  mutation OIDCRegisteredDomainSheet_VerifyDomainMutation($input: VerifyOIDCDomainChallengeInput!) {
    verifyOIDCDomainChallenge(input: $input) {
      ok {
        verifiedOIDCIntegrationDomain {
          ...OIDCRegisteredDomainSheet_RegisteredDomain
        }
      }
      error {
        message
      }
    }
  }
`);

const OIDCRegisteredDomainSheet_RequestDomainChallengeMutation = graphql(`
  mutation OIDCRegisteredDomainSheet_RequestDomainChallengeMutation(
    $input: RequestOIDCDomainChallengeInput!
  ) {
    requestOIDCDomainChallenge(input: $input) {
      ok {
        oidcIntegrationDomain {
          ...OIDCRegisteredDomainSheet_RegisteredDomain
        }
      }
      error {
        message
      }
    }
  }
`);

const OIDCRegisteredDomainSheet_DeleteDomainMutation = graphql(`
  mutation OIDCRegisteredDomainSheet_DeleteDomainMutation($input: DeleteOIDCDomainInput!) {
    deleteOIDCDomain(input: $input) {
      ok {
        deletedOIDCIntegrationId
        oidcIntegration {
          ...OIDCDomainConfiguration_OIDCIntegrationFragment
        }
      }
      error {
        message
      }
    }
  }
`);

const FQDNModel = z
  .string()
  .min(3, 'Must be at least 3 characters long')
  .max(255, 'Must be at most 255 characters long.')
  .regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]+$/, 'Invalid domain provided.');

const RegisterDomainFormSchema = z.object({
  domainName: FQDNModel,
});

export function OIDCRegisteredDomainSheet(props: {
  onClose: () => void;
  onRegisterDomainSuccess: (domainId: string) => void;
  domain: null | FragmentType<typeof OIDCRegisteredDomainSheet_RegisteredDomain>;
  oidcIntegrationId: string;
}): React.ReactElement {
  const domain = useFragment(OIDCRegisteredDomainSheet_RegisteredDomain, props.domain);

  const [registerDomainMutationState, registerDomainMutation] = useMutation(
    OIDCRegisteredDomainSheet_RegisterDomainMutation,
  );
  const [verifyDomainMutationState, verifyDomainMutation] = useMutation(
    OIDCRegisteredDomainSheet_VerifyDomainMutation,
  );
  const [deleteDomainMutationState, deleteDomainMutation] = useMutation(
    OIDCRegisteredDomainSheet_DeleteDomainMutation,
  );
  const [requestDomainChallengeMutationState, requestDomainChallengeMutation] = useMutation(
    OIDCRegisteredDomainSheet_RequestDomainChallengeMutation,
  );

  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(RegisterDomainFormSchema),
    defaultValues: {
      domainName: '',
    },
    mode: 'onSubmit',
  });

  async function onCreateDomain() {
    const result = await registerDomainMutation({
      input: {
        oidcIntegrationId: props.oidcIntegrationId,
        domainName: form.getValues().domainName,
      },
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error.message,
      });
      return;
    }

    if (result.data?.registerOIDCDomain.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.data.registerOIDCDomain.error.message,
      });
      return;
    }

    if (result.data?.registerOIDCDomain.ok) {
      props.onRegisterDomainSuccess(
        result.data.registerOIDCDomain.ok.createdOIDCIntegrationDomain.id,
      );
    }
  }

  async function onVerifyDomain(onSuccess: () => void) {
    if (!domain) {
      return;
    }

    const result = await verifyDomainMutation({
      input: {
        oidcDomainId: domain.id,
      },
    });

    if (result.error) {
      return;
    }

    if (result.data?.verifyOIDCDomainChallenge.error) {
      return;
    }

    onSuccess();
  }

  async function onDeleteDomain() {
    if (!domain) {
      return;
    }

    const result = await deleteDomainMutation({
      input: {
        oidcDomainId: domain.id,
      },
    });

    if (result.error) {
      return;
    }

    if (result.data?.deleteOIDCDomain.error) {
      return;
    }

    toast({
      variant: 'default',
      title: `Domain '${domain.domainName}' was removed.`,
    });
    props.onClose();
  }

  const [Stepper] = useState(() =>
    defineStepper(
      {
        id: 'step-1-general',
        title: 'Register Domain',
      },
      {
        id: 'step-2-challenge',
        title: 'Verify Domain Ownership',
      },
      {
        id: 'step-3-complete',
        title: 'Complete',
      },
    ),
  );

  return (
    <Sheet.Sheet open onOpenChange={props.onClose}>
      <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <Sheet.SheetHeader>
          <Sheet.SheetTitle>Register Domain {domain?.domainName}</Sheet.SheetTitle>
        </Sheet.SheetHeader>
        <Stepper.StepperProvider
          variant="horizontal"
          initialStep={
            domain ? (domain.verifiedAt ? 'step-3-complete' : 'step-2-challenge') : 'step-1-general'
          }
        >
          {({ stepper }) => (
            <>
              <Stepper.StepperNavigation className="pb-4">
                {stepper.all.map(step => (
                  <Stepper.StepperStep key={step.id} of={step.id} clickable={false}>
                    <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
                  </Stepper.StepperStep>
                ))}
              </Stepper.StepperNavigation>
              {stepper.switch({
                'step-1-general': () => (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreateDomain)}>
                      <FormField
                        control={form.control}
                        name="domainName"
                        render={({ field }) => {
                          return (
                            <FormItem>
                              <FormLabel>Domain Name</FormLabel>
                              <FormControl>
                                <Input placeholder="example.com" autoComplete="off" {...field} />
                              </FormControl>
                              <FormDescription>
                                The domain you want to register with this OIDC provider.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </form>
                  </Form>
                ),
                'step-2-challenge': () => (
                  <>
                    <p>
                      In order to prove the ownership of the domain we have to perform a DNS
                      challenge.
                    </p>
                    <p>Within your hosted zone create the following DNS record.</p>
                    <Table.Table
                      className={cn(!domain?.challenge && 'opacity-33 pointer-events-none')}
                    >
                      <Table.TableHeader>
                        <Table.TableRow>
                          <Table.TableHead>Property</Table.TableHead>
                          <Table.TableHead>Value</Table.TableHead>
                        </Table.TableRow>
                      </Table.TableHeader>
                      <Table.TableBody>
                        <Table.TableRow>
                          <Table.TableCell>Type</Table.TableCell>
                          <Table.TableCell className="font-mono font-medium">
                            {domain?.challenge?.recordType}{' '}
                            <CopyIconButton
                              label="Copy"
                              value={domain?.challenge?.recordType ?? ''}
                            />
                          </Table.TableCell>
                        </Table.TableRow>
                        <Table.TableRow>
                          <Table.TableCell>Name</Table.TableCell>
                          <Table.TableCell className="font-mono font-medium">
                            {domain?.challenge?.recordName}{' '}
                            <CopyIconButton
                              label="Copy"
                              value={domain?.challenge?.recordName ?? ''}
                            />
                          </Table.TableCell>
                        </Table.TableRow>
                        <Table.TableRow>
                          <Table.TableCell>Value</Table.TableCell>
                          <Table.TableCell className="font-mono font-medium">
                            {domain?.challenge?.recordValue}
                            <CopyIconButton
                              label="Copy"
                              value={domain?.challenge?.recordValue ?? ''}
                            />
                          </Table.TableCell>
                        </Table.TableRow>
                      </Table.TableBody>
                    </Table.Table>
                    {domain && !domain.challenge && (
                      <>
                        <Tag color="yellow" className="text-primary px-4 py-2.5">
                          <p>This challenge has expired.</p>
                        </Tag>
                        <div className="text-red-500">
                          {requestDomainChallengeMutationState.error?.message ??
                            requestDomainChallengeMutationState.data?.requestOIDCDomainChallenge
                              .error?.message}
                        </div>
                        <Button
                          onClick={() =>
                            requestDomainChallengeMutation({
                              input: {
                                oidcDomainId: domain.id,
                              },
                            })
                          }
                          variant="primary"
                          disabled={requestDomainChallengeMutationState.fetching}
                        >
                          Request new challenge
                        </Button>
                      </>
                    )}
                  </>
                ),
                'step-3-complete': () => (
                  <>
                    <p>
                      This domain was successfully verified. Users logging in with that email do not
                      need to confirm their email.
                    </p>
                  </>
                ),
              })}
              <Sheet.SheetFooter className="mb-0 mt-auto flex-wrap">
                {stepper.switch({
                  'step-1-general': () => (
                    <>
                      <Button variant="secondary" onClick={props.onClose}>
                        Abort
                      </Button>
                      <Button
                        variant="primary"
                        onClick={form.handleSubmit(onCreateDomain)}
                        disabled={registerDomainMutationState.fetching}
                      >
                        Next: Verify Domain Ownership
                      </Button>
                    </>
                  ),
                  'step-2-challenge': () => (
                    <>
                      <div className="mb-2 basis-full text-right text-red-500">
                        {deleteDomainMutationState.error?.message ??
                          deleteDomainMutationState.data?.deleteOIDCDomain.error?.message ??
                          verifyDomainMutationState.error?.message ??
                          verifyDomainMutationState.data?.verifyOIDCDomainChallenge.error?.message}
                      </div>
                      <Button
                        variant="destructive"
                        onClick={onDeleteDomain}
                        disabled={
                          deleteDomainMutationState.fetching || verifyDomainMutationState.fetching
                        }
                      >
                        Delete Domain
                      </Button>
                      <Button variant="secondary" onClick={props.onClose} className="ml-auto">
                        Close
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => onVerifyDomain(() => stepper.goTo('step-3-complete'))}
                        disabled={
                          verifyDomainMutationState.fetching ||
                          deleteDomainMutationState.fetching ||
                          !domain?.challenge
                        }
                      >
                        Next: Complete
                      </Button>
                    </>
                  ),
                  'step-3-complete': () => (
                    <>
                      <Button variant="destructive" onClick={onDeleteDomain}>
                        Delete Domain
                      </Button>
                      <Button variant="primary" onClick={props.onClose} className="ml-auto">
                        Close
                      </Button>
                    </>
                  ),
                })}
              </Sheet.SheetFooter>
            </>
          )}
        </Stepper.StepperProvider>
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

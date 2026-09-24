import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Button } from '@/components/base/button/button';
import { DescriptionList } from '@/components/base/description-list/description-list';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { useToast } from '@/components/base/toast/toast';
import { Callout } from '@/components/ui/callout';
import { defineStepper } from '@/components/ui/stepper';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterDomainForm, RegisterDomainFormSchema } from './register-domain-form';

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

export function OIDCRegisteredDomainSheet(props: {
  open: boolean;
  onClose: () => void;
  /** Fires once the close transition has finished; the parent remounts the sheet on it. */
  onOpenChangeComplete: (open: boolean) => void;
  onRegisterDomainSuccess: (domainId: string) => void;
  domain: null | FragmentType<typeof OIDCRegisteredDomainSheet_RegisteredDomain>;
  oidcIntegrationId: string;
}): React.ReactElement {
  const domain = useFragment(OIDCRegisteredDomainSheet_RegisteredDomain, props.domain);
  // track whether we arer in the process of a verification
  // eslint-disable-next-line react/hook-use-state
  const [isInStepperProcess] = useState(!domain?.verifiedAt);

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
      form.setError('domainName', {
        message: result.data.registerOIDCDomain.error.message,
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

  const [showDeleteDomainConfirmation, setShowDeleteDomainConfirmation] = useState(false);

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
    setShowDeleteDomainConfirmation(false);
    props.onClose();
  }

  const challengeError =
    deleteDomainMutationState.error?.message ??
    deleteDomainMutationState.data?.deleteOIDCDomain.error?.message ??
    verifyDomainMutationState.error?.message ??
    verifyDomainMutationState.data?.verifyOIDCDomainChallenge.error?.message;

  // eslint-disable-next-line react/hook-use-state
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
    <>
      <Stepper.StepperProvider
        variant="horizontal"
        initialStep={
          domain ? (domain.verifiedAt ? 'step-3-complete' : 'step-2-challenge') : 'step-1-general'
        }
      >
        {({ stepper }) => (
          <Sheet
            open={props.open}
            onOpenChange={props.onClose}
            onOpenChangeComplete={props.onOpenChangeComplete}
            title={
              <>
                {isInStepperProcess ? stepper.current.title : 'Domain Settings'}{' '}
                {domain?.domainName && <span className="ml-3 font-mono">{domain?.domainName}</span>}
              </>
            }
            footer={stepper.switch({
              'step-1-general': () => (
                <>
                  <Button variant="outline" onClick={props.onClose}>
                    Abort
                  </Button>
                  <Button
                    variant="primary"
                    onClick={form.handleSubmit(onCreateDomain)}
                    disabled={registerDomainMutationState.fetching}
                    data-button-next-verify-domain-ownership
                  >
                    Next: Verify Domain Ownership
                  </Button>
                </>
              ),
              'step-2-challenge': () => (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDomainConfirmation(true)}
                    disabled={
                      deleteDomainMutationState.fetching || verifyDomainMutationState.fetching
                    }
                  >
                    Delete Domain
                  </Button>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={props.onClose}>
                      Close
                    </Button>
                    <Button
                      data-button-next-complete
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
                  </div>
                </>
              ),
              'step-3-complete': () => (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDomainConfirmation(true)}
                    disabled={deleteDomainMutationState.fetching}
                  >
                    Delete Domain
                  </Button>
                  <div className="ml-auto">
                    <Button variant="primary" onClick={props.onClose}>
                      Close
                    </Button>
                  </div>
                </>
              ),
            })}
          >
            {isInStepperProcess && (
              <Stepper.StepperNavigation className="pb-4">
                {stepper.all.map(step => (
                  <Stepper.StepperStep key={step.id} of={step.id} clickable={false}>
                    <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
                  </Stepper.StepperStep>
                ))}
              </Stepper.StepperNavigation>
            )}
            {stepper.switch({
              'step-1-general': () => <RegisterDomainForm form={form} onSubmit={onCreateDomain} />,
              'step-2-challenge': () => (
                <>
                  <p>
                    In order to prove the ownership of the domain we have to perform a DNS
                    challenge.
                  </p>
                  <p>Within your hosted zone create the following DNS record.</p>
                  <div className={cn(!domain?.challenge && 'opacity-33 pointer-events-none')}>
                    <DescriptionList
                      rows={[
                        {
                          items: [
                            {
                              term: 'Type',
                              description: domain?.challenge?.recordType ?? '',
                              mono: true,
                              copyable: true,
                            },
                            {
                              term: 'Name',
                              description: domain?.challenge?.recordName ?? '',
                              mono: true,
                              copyable: true,
                            },
                            {
                              term: 'Value',
                              description: domain?.challenge?.recordValue ?? '',
                              mono: true,
                              copyable: true,
                            },
                          ],
                        },
                      ]}
                    />
                  </div>
                  {domain && !domain.challenge && (
                    <>
                      <Callout type="warning">This challenge has expired.</Callout>
                      <div className="text-red-500">
                        {requestDomainChallengeMutationState.error?.message ??
                          requestDomainChallengeMutationState.data?.requestOIDCDomainChallenge.error
                            ?.message}
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
            {stepper.current.id === 'step-2-challenge' && challengeError ? (
              <p className="mt-4 text-red-500">{challengeError}</p>
            ) : null}
          </Sheet>
        )}
      </Stepper.StepperProvider>
      <DeleteDomainConfirmationDialog
        open={showDeleteDomainConfirmation}
        onClose={() => setShowDeleteDomainConfirmation(false)}
        onConfirm={onDeleteDomain}
      />
    </>
  );
}

function DeleteDomainConfirmationDialog(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={props.open}
      onOpenChange={next => {
        if (!next) {
          props.onClose();
        }
      }}
      title="Do you want to delete this domain?"
      confirm={{ label: 'Delete Domain', variant: 'destructive', onClick: props.onConfirm }}
    />
  );
}

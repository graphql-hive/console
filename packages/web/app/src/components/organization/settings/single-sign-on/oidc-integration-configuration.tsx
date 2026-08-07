import { ReactElement, useState } from 'react';
import { AlertOctagonIcon, BugPlayIcon, CheckIcon, PlusIcon, SettingsIcon } from 'lucide-react';
import { useMutation } from 'urql';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/base/card/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heading } from '@/components/ui/heading';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import * as Table from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { Tag } from '@/components/v2';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { ConnectSingleSignOnProviderSheet } from './connect-single-sign-on-provider-sheet';
import { DebugOIDCIntegrationModal } from './debug-oidc-integration-modal';
import { OIDCDefaultResourceSelector } from './oidc-default-resource-selector';
import { OIDCDefaultRoleSelector } from './oidc-default-role-selector';
import { OIDCRegisteredDomainSheet } from './oidc-registered-domain-sheet';

const UpdateOIDCIntegrationForm_UpdateOIDCRestrictionsMutation = graphql(`
  mutation UpdateOIDCIntegrationForm_UpdateOIDCRestrictionsMutation(
    $input: UpdateOIDCRestrictionsInput!
  ) {
    updateOIDCRestrictions(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          oidcUserJoinOnly
          oidcUserAccessOnly
          requireInvitation
          oidcForVerifiedDomainsRequired
          userProvisioningRequired
        }
      }
      error {
        message
      }
    }
  }
`);

const UpdateOIDCIntegrationForm_UpdateOIDCIntegrationMutation = graphql(`
  mutation UpdateOIDCIntegrationForm_UpdateOIDCIntegrationMutation(
    $input: UpdateOIDCIntegrationInput!
  ) {
    updateOIDCIntegration(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          tokenEndpoint
          userinfoEndpoint
          authorizationEndpoint
          clientId
          clientSecretPreview
          additionalScopes
          userIdClaim
        }
      }
      error {
        message
        details {
          clientId
          clientSecret
          tokenEndpoint
          userinfoEndpoint
          authorizationEndpoint
          additionalScopes
        }
      }
    }
  }
`);

const OIDCIntegrationConfiguration_OIDCIntegration = graphql(`
  fragment OIDCIntegrationConfiguration_OIDCIntegration on OIDCIntegration {
    id
    oidcUserJoinOnly
    oidcUserAccessOnly
    requireInvitation
    authorizationEndpoint
    tokenEndpoint
    userinfoEndpoint
    userIdClaim
    clientId
    clientSecretPreview
    additionalScopes
    defaultMemberRole {
      id
      ...OIDCDefaultRoleSelector_MemberRoleFragment
    }
    ...OIDCDomainConfiguration_OIDCIntegrationFragment
    ...OIDCAccessSettings_OIDCIntegrationFragment
  }
`);

const OIDCIntegrationConfiguration_Organization = graphql(`
  fragment OIDCIntegrationConfiguration_Organization on Organization {
    id
    ...OIDCAccessSettings_OrganizationFragment
  }
`);

const enum ModalState {
  closed,
  openSettings,
  openDelete,
  openDebugLogs,
  /** show confirmation dialog to ditch draft state of new access token */
  closing,
}

export function OIDCIntegrationConfiguration(props: {
  organization: FragmentType<typeof OIDCIntegrationConfiguration_Organization>;
  oidcIntegration: FragmentType<typeof OIDCIntegrationConfiguration_OIDCIntegration>;
}) {
  const organization = useFragment(OIDCIntegrationConfiguration_Organization, props.organization);
  const oidcIntegration = useFragment(
    OIDCIntegrationConfiguration_OIDCIntegration,
    props.oidcIntegration,
  );
  const { toast } = useToast();
  const [oidcRestrictionsMutation, oidcRestrictionsMutate] = useMutation(
    UpdateOIDCIntegrationForm_UpdateOIDCRestrictionsMutation,
  );
  const [_, updateOIDCIntegrationMutate] = useMutation(
    UpdateOIDCIntegrationForm_UpdateOIDCIntegrationMutation,
  );
  const [modalState, setModalState] = useState(ModalState.closed);

  const onOidcRestrictionChange = async (
    name:
      | 'oidcUserJoinOnly'
      | 'oidcUserAccessOnly'
      | 'requireInvitation'
      | 'oidcForVerifiedDomainsRequired'
      | 'userProvisioningRequired',
    value: boolean,
  ) => {
    if (oidcRestrictionsMutation.fetching) {
      return;
    }

    try {
      toast({
        title: 'Updating OIDC restrictions...',
        variant: 'default',
      });
      const result = await oidcRestrictionsMutate({
        input: {
          oidcIntegrationId: oidcIntegration.id,
          [name]: value,
        },
      });

      if (result.data?.updateOIDCRestrictions.ok) {
        toast({
          title: 'OIDC restrictions updated successfully',
          description: {
            oidcUserJoinOnly: value
              ? 'Only OIDC users can now join the organization'
              : 'Joining the organization is no longer restricted to OIDC users',
            oidcUserAccessOnly: value
              ? 'Only OIDC users can now access the organization'
              : 'Access to the organization is no longer restricted to OIDC users',
            requireInvitation: value
              ? 'Only invited users can now access the organization.'
              : 'Access to the organization is no longer restricted to invited users.',
            oidcForVerifiedDomainsRequired: value
              ? 'OIDC login is now required for verified domains.'
              : 'Other login methods are now allowed for verified domains.',
            userProvisioningRequired: value
              ? 'Users must be provisioned via SCIM before signing in with OIDC.'
              : 'Users are provisioned when signing in with OIDC.',
          }[name],
        });
      } else {
        toast({
          title: 'Failed to update OIDC restrictions',
          description: result.data?.updateOIDCRestrictions.error?.message ?? result.error?.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to update OIDC restrictions',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="flex">
          <Heading size="lg">Overview</Heading>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => setModalState(ModalState.openDebugLogs)}
                >
                  <BugPlayIcon size="12" />{' '}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Debug OIDC Integration</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p>Endpoints for configuring the OIDC provider.</p>
        <Table.Table>
          <Table.TableHeader>
            <Table.TableRow>
              <Table.TableHead>Endpoint</Table.TableHead>
              <Table.TableHead>URL</Table.TableHead>
            </Table.TableRow>
          </Table.TableHeader>
          <Table.TableBody>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Sign-in redirect URI</Table.TableCell>
              <Table.TableCell>
                <span
                  data-oidc-property-sign-in-redirect-uri
                >{`${env.appBaseUrl}/auth/callback/oidc`}</span>{' '}
                <CopyIconButton label="Copy" value={`${env.appBaseUrl}/auth/callback/oidc`} />
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Sign-out redirect URI</Table.TableCell>
              <Table.TableCell>
                <span data-oidc-property-sign-out-redirect-uri>{`${env.appBaseUrl}/logout`}</span>{' '}
                <CopyIconButton label="Copy" value={`${env.appBaseUrl}/logout`} />
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Sign-in URL</Table.TableCell>
              <Table.TableCell>
                <span
                  data-oidc-property-sign-in-url
                >{`${env.appBaseUrl}/auth/oidc?id=${oidcIntegration.id}`}</span>{' '}
                <CopyIconButton
                  label="Copy"
                  value={`${env.appBaseUrl}/auth/oidc?id=${oidcIntegration.id}`}
                />
              </Table.TableCell>
            </Table.TableRow>
          </Table.TableBody>
        </Table.Table>
      </div>
      <div className="space-y-2">
        <div className="flex">
          <Heading size="lg">OIDC Configuration</Heading>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => setModalState(ModalState.openSettings)}
                >
                  <SettingsIcon size="12" />{' '}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Update endpoint configuration</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Table.Table>
          <Table.TableHeader>
            <Table.TableRow>
              <Table.TableHead>Configuration</Table.TableHead>
              <Table.TableHead>Value</Table.TableHead>
            </Table.TableRow>
          </Table.TableHeader>
          <Table.TableBody>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Authorization Endpoint</Table.TableCell>
              <Table.TableCell>{oidcIntegration.authorizationEndpoint}</Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Token Endpoint</Table.TableCell>
              <Table.TableCell>{oidcIntegration.tokenEndpoint}</Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">User Info Endpoint</Table.TableCell>
              <Table.TableCell>{oidcIntegration.userinfoEndpoint}</Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Client ID</Table.TableCell>
              <Table.TableCell className="font-mono">{oidcIntegration.clientId}</Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Client Secret</Table.TableCell>
              <Table.TableCell className="font-mono">
                •••••••{oidcIntegration.clientSecretPreview}
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>User ID Claim</TooltipTrigger>
                    <TooltipContent className="text-xs">
                      The claim that should be used to uniquely identify an user.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Table.TableCell>
              <Table.TableCell className="font-mono">
                {oidcIntegration.userIdClaim ?? <span className="text-neutral-10">none set</span>}
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>Additional Scopes</TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Additional scopes that are requested from the OIDC provider.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Table.TableCell>
              <Table.TableCell>
                {oidcIntegration.additionalScopes.length ? (
                  <span className="font-mono">{oidcIntegration.additionalScopes.join(' ')}</span>
                ) : (
                  <span className="text-neutral-8">none</span>
                )}
              </Table.TableCell>
            </Table.TableRow>
          </Table.TableBody>
        </Table.Table>
      </div>
      <OIDCDomainConfiguration
        oidcIntegration={oidcIntegration}
        onRestrictionChange={onOidcRestrictionChange}
      />
      <OIDCAccessSettings
        oidcIntegration={oidcIntegration}
        organization={organization}
        onRestrictionChange={onOidcRestrictionChange}
      />
      <div className="space-y-2">
        <Heading size="lg">Remove OIDC Provider</Heading>
        <p>Completly disconnect the OIDC provider and all configuration.</p>
        <Button variant="destructive" onClick={() => setModalState(ModalState.openDelete)}>
          Delete OIDC Provider
        </Button>
      </div>
      {modalState === ModalState.openSettings && (
        <ConnectSingleSignOnProviderSheet
          onClose={() => setModalState(ModalState.closed)}
          initialValues={{
            additionalScopes: oidcIntegration.additionalScopes.join(' '),
            userIdClaim: oidcIntegration.userIdClaim ?? '',
            clientId: oidcIntegration.clientId,
            authorizationEndpoint: oidcIntegration.authorizationEndpoint,
            tokenEndpoint: oidcIntegration.tokenEndpoint,
            userinfoEndpoint: oidcIntegration.userinfoEndpoint,
            clientSecretPreview: oidcIntegration.clientSecretPreview,
          }}
          onSave={async args => {
            const result = await updateOIDCIntegrationMutate({
              input: {
                oidcIntegrationId: oidcIntegration.id,
                clientId: args.clientId || undefined,
                clientSecret: args.clientSecret || undefined,
                userIdClaim: args.userIdClaim || undefined,
                additionalScopes: args.additionalScopes?.trim()
                  ? args.additionalScopes.trim().split(' ')
                  : undefined,
                authorizationEndpoint: args.authorizationEndpoint || undefined,
                tokenEndpoint: args.tokenEndpoint || undefined,
                userinfoEndpoint: args.userinfoEndpoint || undefined,
              },
            });

            if (result.data?.updateOIDCIntegration.error) {
              const { error } = result.data.updateOIDCIntegration;

              return {
                type: 'error',
                clientId: error.details.clientId ?? null,
                clientSecret: error.details.clientSecret ?? null,
                authorizationEndpoint: error.details.authorizationEndpoint ?? null,
                userinfoEndpoint: error.details.userinfoEndpoint ?? null,
                tokenEndpoint: error.details.tokenEndpoint ?? null,
                additionalScopes: error.details.additionalScopes ?? null,
              };
            }

            toast({
              variant: 'default',
              title: 'Updated OIDC Configuration',
            });

            return {
              type: 'success',
            };
          }}
        />
      )}
      {modalState === ModalState.openDelete && (
        <RemoveOIDCIntegrationModal
          close={() => setModalState(ModalState.closed)}
          oidcIntegrationId={oidcIntegration.id}
        />
      )}
      {modalState === ModalState.openDebugLogs && (
        <DebugOIDCIntegrationModal
          close={() => setModalState(ModalState.closed)}
          oidcIntegrationId={oidcIntegration.id}
        />
      )}
    </div>
  );
}

const OIDCDomainConfiguration_OIDCIntegrationFragment = graphql(`
  fragment OIDCDomainConfiguration_OIDCIntegrationFragment on OIDCIntegration {
    id
    registeredDomains {
      id
      domainName
      createdAt
      verifiedAt
      ...OIDCRegisteredDomainSheet_RegisteredDomain
    }
    oidcForVerifiedDomainsRequired
  }
`);

function OIDCDomainConfiguration(props: {
  oidcIntegration: FragmentType<typeof OIDCDomainConfiguration_OIDCIntegrationFragment>;
  onRestrictionChange: (name: 'oidcForVerifiedDomainsRequired', value: boolean) => void;
}) {
  const oidcIntegration = useFragment(
    OIDCDomainConfiguration_OIDCIntegrationFragment,
    props.oidcIntegration,
  );

  const [state, setState] = useState(
    null as
      | null
      | {
          type: 'create';
        }
      | {
          type: 'manage';
          domainId: string;
        },
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex">
          <Heading size="lg">Registered Domains</Heading>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-button-add-new-domain
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => setState({ type: 'create' })}
                >
                  <PlusIcon size="12" />{' '}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add new domain</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p>
          Verify domain ownership to skip mandatory email confirmation for organization members.
        </p>
        <Table.Table>
          <Table.TableHeader>
            <Table.TableRow>
              <Table.TableHead>Domain</Table.TableHead>
              <Table.TableHead>Status</Table.TableHead>
              <Table.TableHead />
            </Table.TableRow>
          </Table.TableHeader>
          <Table.TableBody>
            {oidcIntegration.registeredDomains.map(domain => (
              <Table.TableRow key={domain.id}>
                <Table.TableCell className="font-mono font-medium">
                  {domain.domainName}
                </Table.TableCell>
                <Table.TableCell>
                  {domain.verifiedAt ? (
                    <>
                      Verified <CheckIcon size="12" className="inline-block" />
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip delayDuration={0} disableHoverableContent>
                        <TooltipTrigger>
                          Pending <AlertOctagonIcon size="12" className="inline-block" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          The domain ownership challenge has not been completed.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Table.TableCell>
                <Table.TableCell className="text-right">
                  <TooltipProvider>
                    <Tooltip delayDuration={0} disableHoverableContent>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setState({
                            domainId: domain.id,
                            type: 'manage',
                          })
                        }
                        className="ml-auto"
                      >
                        <SettingsIcon size="10" />
                      </Button>
                      <TooltipContent className="text-xs">Manage</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Table.TableCell>
              </Table.TableRow>
            ))}
          </Table.TableBody>
          {oidcIntegration.registeredDomains.length === 0 && (
            <Table.TableCaption>No Domains registered</Table.TableCaption>
          )}
        </Table.Table>
      </div>
      <Card>
        <CardHeader>
          <CardTitle title="Domain Settings" />
          <CardDescription description="Settings for the verified domains." />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
              <p>Require OIDC Login</p>
              <p className="max-w-[500px] text-xs font-normal leading-snug">
                Enforce sign in/up through OIDC for verified domains. Any other login method will be
                blocked. The organization owner is excluded from this restriction.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogContent>
                {oidcIntegration.oidcForVerifiedDomainsRequired ? (
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable enforced OIDC login</AlertDialogTitle>
                    <AlertDialogDescription>
                      Users will be able to login with any method, such as email + password or
                      social logins.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                ) : (
                  <AlertDialogHeader>
                    <AlertDialogTitle>Enforce OIDC login</AlertDialogTitle>{' '}
                    <AlertDialogDescription>
                      Users will no longer be able to login with email+password or social logins.
                      <Callout type="warning">
                        This action can potentially lock you out of the organization. Make sure your
                        OIDC provider is not configured properly and you can log in using it.
                      </Callout>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() =>
                      props.onRestrictionChange(
                        'oidcForVerifiedDomainsRequired',
                        !oidcIntegration.oidcForVerifiedDomainsRequired,
                      )
                    }
                  >
                    {oidcIntegration.oidcForVerifiedDomainsRequired
                      ? 'Disable enforced ODIC login'
                      : 'Enforce OIDC login'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              <AlertDialogTrigger>
                <Switch
                  checked={oidcIntegration.oidcForVerifiedDomainsRequired}
                  data-cy="oidc-require-verified-domain-login-toggle"
                />
              </AlertDialogTrigger>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      {state && (
        <OIDCRegisteredDomainSheet
          key={state.type}
          oidcIntegrationId={oidcIntegration.id}
          domain={
            (state.type === 'manage'
              ? oidcIntegration.registeredDomains.find(domain => domain.id === state.domainId)
              : null) ?? null
          }
          onClose={() => setState(null)}
          onRegisterDomainSuccess={domainId =>
            setState({
              type: 'manage',
              domainId,
            })
          }
        />
      )}
    </div>
  );
}

const OIDCAccessSettings_OIDCIntegrationFragment = graphql(`
  fragment OIDCAccessSettings_OIDCIntegrationFragment on OIDCIntegration {
    id
    oidcUserJoinOnly
    oidcUserAccessOnly
    requireInvitation
    userProvisioningRequired
    defaultMemberRole {
      id
      ...OIDCDefaultRoleSelector_MemberRoleFragment
    }
    defaultResourceAssignment {
      ...OIDCDefaultResourceSelector_ResourceAssignmentFragment
    }
  }
`);

const OIDCAccessSettings_OrganizationFragment = graphql(`
  fragment OIDCAccessSettings_OrganizationFragment on Organization {
    id
    slug
    me {
      id
      role {
        id
        name
      }
    }
    memberRoles {
      edges {
        node {
          id
          ...OIDCDefaultRoleSelector_MemberRoleFragment
        }
      }
    }
    pendingSCIMManagementConfirmationsCount
    viewerCanManageSCIM
    ...OIDCDefaultResourceSelector_OrganizationFragment
  }
`);

function OIDCAccessSettings(props: {
  oidcIntegration: FragmentType<typeof OIDCAccessSettings_OIDCIntegrationFragment>;
  organization: FragmentType<typeof OIDCAccessSettings_OrganizationFragment>;
  onRestrictionChange: (
    name:
      | 'oidcUserJoinOnly'
      | 'oidcUserAccessOnly'
      | 'requireInvitation'
      | 'userProvisioningRequired',
    value: boolean,
  ) => void;
}) {
  const organization = useFragment(OIDCAccessSettings_OrganizationFragment, props.organization);
  const oidcIntegration = useFragment(
    OIDCAccessSettings_OIDCIntegrationFragment,
    props.oidcIntegration,
  );
  const isAdmin = organization?.me?.role.name === 'Admin';
  const isSCIMProvisioningEnabled =
    organization.viewerCanManageSCIM && oidcIntegration.userProvisioningRequired;

  return (
    <div>
      <Heading>User Provisioning</Heading>
      <p>Configure how users should be provisioned by your identity provider.</p>
      <div className="mt-2 space-y-4 rounded-lg border p-6">
        <RadioGroup value={isSCIMProvisioningEnabled ? 'scim' : 'oidc'} className="flex gap-4">
          <Card
            variant={!isSCIMProvisioningEnabled ? 'selected' : 'selectable'}
            onClick={
              oidcIntegration.userProvisioningRequired
                ? () => props.onRestrictionChange('userProvisioningRequired', false)
                : undefined
            }
          >
            <CardContent variant="selection">
              <RadioGroupItem value="oidc" id="oidc-mode" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="oidc-mode" className="cursor-pointer text-base font-medium">
                  {organization.viewerCanManageSCIM ? (
                    <>Mixed OIDC and SCIM</>
                  ) : (
                    <>Managed via OIDC</>
                  )}
                </Label>
                <p className="mt-1 text-sm">Users are provisioned when signing in via OIDC.</p>
                {organization.viewerCanManageSCIM && (
                  <p className="mt-1 text-sm">
                    Optionally, users and groups can be provisioned via SCIM.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {organization.viewerCanManageSCIM ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Card variant={isSCIMProvisioningEnabled ? 'selected' : 'selectable'}>
                  <CardContent variant="selection">
                    <RadioGroupItem value="scim" id="scim-mode" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="scim-mode" className="cursor-pointer text-base font-medium">
                        <span>Managed via SCIM</span>
                      </Label>
                      <p className="mt-1 text-sm">
                        Users and groups are exclusively managed by your identity provider via SCIM.
                      </p>
                      <p className="mt-1 text-sm">
                        Roles and permissions are assigned to groups via role mappings.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Require SCIM provisioning?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Users who are not provisioned through SCIM will no longer be able to access this
                    organization. The organization owner is not affected.
                    <Callout type="warning">
                      Members with unresolved SCIM provisioning conflicts will keep their current
                      access until you review them. New OIDC users must first be provisioned through
                      SCIM.
                    </Callout>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => props.onRestrictionChange('userProvisioningRequired', true)}
                  >
                    Require SCIM provisioning
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </RadioGroup>
        {isSCIMProvisioningEnabled ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle title="SCIM Provision Defaults" />
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                      <p>Organization access restricted to (active) provisioned users</p>
                      <p className="text-neutral-10 max-w-[500px] text-xs font-normal leading-snug">
                        Only (active) users provisioned via SCIM can access the organization.
                        <br />
                        <span className="font-bold">
                          The organization owner is excluded from this restriction.
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                      <p>Sync groups via SCIM</p>
                      <p className="text-neutral-10 max-w-[500px] text-xs font-normal leading-snug">
                        Groups are provisioned and updated via SCIM.{' '}
                        <Link
                          to="/$organizationSlug/view/members"
                          params={{ organizationSlug: organization.slug }}
                          search={{ page: 'groups' }}
                          className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
                        >
                          Manage Groups
                        </Link>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                      <p>Sync users via SCIM</p>
                      <p className="text-neutral-10 max-w-[500px] text-xs font-normal leading-snug">
                        Users are provisioned and updated via SCIM.{' '}
                        <Link
                          to="/$organizationSlug/view/members"
                          params={{ organizationSlug: organization.slug }}
                          search={{ page: 'list' }}
                          className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
                        >
                          Manage Users
                        </Link>
                      </p>
                    </div>
                    {organization.pendingSCIMManagementConfirmationsCount > 0 && (
                      <div>
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex text-xs text-yellow-500">
                                {organization.pendingSCIMManagementConfirmationsCount} SCIM
                                provisioning conflict
                                {organization.pendingSCIMManagementConfirmationsCount === 1
                                  ? ''
                                  : 's'}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] space-y-2">
                              <p>
                                SCIM provisioning matched existing organization members. Review each
                                match before allowing SCIM to manage the account.
                              </p>
                              <Link
                                to="/$organizationSlug/view/members"
                                params={{ organizationSlug: organization.slug }}
                                search={{
                                  page: 'list',
                                  showPendingSCIMManagementConfirmations: true,
                                }}
                                className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
                              >
                                Review conflicts
                              </Link>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                      <p>Assign permissions via groups</p>
                      <p className="text-neutral-10 max-w-[500px] text-xs font-normal leading-snug">
                        Assign role mappings to groups to grant permissions to group members.{' '}
                        <Link
                          to="/$organizationSlug/view/members"
                          params={{ organizationSlug: organization.slug }}
                          search={{ page: 'groups' }}
                          className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
                        >
                          Manage Groups
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle title="OIDC Provision Settings" />
              <CardDescription description="Customize the provision behaviour vor OIDC." />
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                    <p>Require OIDC to Join</p>
                    <p className="text-neutral-10 text-xs font-normal leading-snug">
                      Restricts new accounts joining the organization to be authenticated via OIDC.
                      <br />
                      <span className="font-bold">
                        Existing non-OIDC members will keep their access.
                      </span>
                    </p>
                  </div>
                  <Switch
                    checked={oidcIntegration.oidcUserJoinOnly}
                    onCheckedChange={checked =>
                      props.onRestrictionChange('oidcUserJoinOnly', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                    <p>Require OIDC to Access</p>
                    <p className="text-neutral-10 text-xs font-normal leading-snug">
                      Prompt users to authenticate with OIDC before accessing the organization.
                      <br />
                      <span className="font-bold">
                        Existing users without OIDC credentials will not be able to access the
                        organization.
                      </span>
                    </p>
                  </div>
                  <Switch
                    checked={oidcIntegration.oidcUserAccessOnly}
                    onCheckedChange={checked =>
                      props.onRestrictionChange('oidcUserAccessOnly', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
                    <p>Require Invitation to Join</p>
                    <p className="text-neutral-10 text-xs font-normal leading-snug">
                      Restricts only invited OIDC accounts to join the organization.
                    </p>
                  </div>
                  <Switch
                    checked={oidcIntegration.requireInvitation}
                    data-cy="oidc-require-invitation-toggle"
                    onCheckedChange={checked =>
                      props.onRestrictionChange('requireInvitation', checked)
                    }
                  />
                </div>
                <div
                  className={cn(
                    'space-y-1 text-sm font-medium leading-none',
                    isAdmin ? null : 'cursor-not-allowed',
                  )}
                >
                  <p>Default Member Role</p>
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex basis-2/3 flex-col md:basis-1/2">
                      <p className="text-neutral-10 text-xs font-normal leading-snug">
                        This role is assigned to new members who sign in via OIDC.{' '}
                        <span className="font-medium">
                          Only members with the Admin role can modify it.
                        </span>
                      </p>
                    </div>
                    <div className="flex min-w-[150px] basis-1/3 md:basis-1/2">
                      <OIDCDefaultRoleSelector
                        className="w-full"
                        disabled={!isAdmin}
                        oidcIntegrationId={oidcIntegration.id}
                        defaultRole={oidcIntegration.defaultMemberRole}
                        memberRoles={organization.memberRoles?.edges.map(edge => edge.node) ?? []}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <OIDCDefaultResourceSelector
                  oidcIntegrationId={oidcIntegration.id}
                  organization={organization}
                  resourceAssignment={oidcIntegration.defaultResourceAssignment ?? {}}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

const RemoveOIDCIntegrationModal_DeleteOIDCIntegrationMutation = graphql(`
  mutation RemoveOIDCIntegrationModal_DeleteOIDCIntegrationMutation(
    $input: DeleteOIDCIntegrationInput!
  ) {
    deleteOIDCIntegration(input: $input) {
      ok {
        organization {
          id
          oidcIntegration {
            id
          }
        }
      }
      error {
        message
      }
    }
  }
`);

function RemoveOIDCIntegrationModal(props: {
  close: () => void;
  oidcIntegrationId: null | string;
}): ReactElement {
  const [mutation, mutate] = useMutation(RemoveOIDCIntegrationModal_DeleteOIDCIntegrationMutation);
  const { oidcIntegrationId } = props;

  return (
    <Dialog open onOpenChange={props.close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove OpenID Connect Integration</DialogTitle>
        </DialogHeader>
        {mutation.data?.deleteOIDCIntegration.ok ? (
          <>
            <p>The OIDC integration has been removed successfully.</p>
            <div className="text-right">
              <Button onClick={props.close}>Close</Button>
            </div>
          </>
        ) : oidcIntegrationId === null ? (
          <>
            <p>This organization does not have an OIDC integration.</p>
            <div className="text-right">
              <Button onClick={props.close}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <Tag color="yellow" className="px-4 py-2.5">
              <p>
                This action is not reversible and revoke access to all users that have signed in
                with this OIDC integration.
              </p>
            </Tag>
            <p>Do you really want to proceed?</p>

            <div className="space-x-2 text-right">
              <Button variant="outline" onClick={props.close}>
                Close
              </Button>
              <Button
                variant="destructive"
                disabled={mutation.fetching}
                onClick={async () => {
                  await mutate({ input: { oidcIntegrationId } });
                }}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

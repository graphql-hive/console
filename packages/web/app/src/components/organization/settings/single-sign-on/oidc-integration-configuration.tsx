import { useState } from 'react';
import { PlusIcon, SettingsIcon } from 'lucide-react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Heading } from '@/components/ui/heading';
import { Switch } from '@/components/ui/switch';
import * as Table from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/laboratory/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConnectSingleSignOnProviderSheet } from './connect-single-sign-on-provider-sheet';
import { OIDCDefaultResourceSelector } from './oidc-default-resource-selector';
import { OIDCDefaultRoleSelector } from './oidc-default-role-selector';
import { ConnectSingleSignOnProviderState } from './single-sign-on-subpage';

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
    clientId
    clientSecretPreview
    additionalScopes
    defaultMemberRole {
      id
      ...OIDCDefaultRoleSelector_MemberRoleFragment
    }
    defaultResourceAssignment {
      ...OIDCDefaultResourceSelector_ResourceAssignmentFragment
    }
    ...OIDCDomainConfiguration_OIDCIntegrationFragment
  }
`);

const OIDCIntegrationConfiguration_Organization = graphql(`
  fragment OIDCIntegrationConfiguration_Organization on Organization {
    id
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
    ...OIDCDefaultResourceSelector_OrganizationFragment
  }
`);

export function OIDCIntegrationConfiguration(props: {
  organization: FragmentType<typeof OIDCIntegrationConfiguration_Organization>;
  oidcIntegration: FragmentType<typeof OIDCIntegrationConfiguration_OIDCIntegration>;
}) {
  const organization = useFragment(OIDCIntegrationConfiguration_Organization, props.organization);
  const oidcIntegration = useFragment(
    OIDCIntegrationConfiguration_OIDCIntegration,
    props.oidcIntegration,
  );
  const isAdmin = organization?.me?.role.name === 'Admin';
  const { toast } = useToast();
  const [oidcRestrictionsMutation, oidcRestrictionsMutate] = useMutation(
    UpdateOIDCIntegrationForm_UpdateOIDCRestrictionsMutation,
  );
  const [_, updateOIDCIntegrationMutate] = useMutation(
    UpdateOIDCIntegrationForm_UpdateOIDCIntegrationMutation,
  );
  const [modalState, setModalState] = useState(ConnectSingleSignOnProviderState.closed);

  const onOidcRestrictionChange = async (
    name: 'oidcUserJoinOnly' | 'oidcUserAccessOnly' | 'requireInvitation',
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
        <Heading size="lg">Overview</Heading>
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
                {`${env.appBaseUrl}/auth/callback/oidc `}
                <CopyIconButton label="Copy" value={`${env.appBaseUrl}/auth/callback/oidc`} />
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Sign-out redirect URI</Table.TableCell>
              <Table.TableCell>
                {`${env.appBaseUrl}/logout `}
                <CopyIconButton label="Copy" value={`${env.appBaseUrl}/logout`} />
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Sign-in URL</Table.TableCell>
              <Table.TableCell>
                {`${env.appBaseUrl}/auth/oidc?id=${oidcIntegration.id} `}
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
                  onClick={() => setModalState(ConnectSingleSignOnProviderState.open)}
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
              <Table.TableCell>{oidcIntegration.clientId}</Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Client Secret</Table.TableCell>
              <Table.TableCell className="font-mono">
                •••••••{oidcIntegration.clientSecretPreview}
              </Table.TableCell>
            </Table.TableRow>
            <Table.TableRow>
              <Table.TableCell className="font-medium">Additional Scopes</Table.TableCell>
              <Table.TableCell>{oidcIntegration.additionalScopes.join(' ')}</Table.TableCell>
            </Table.TableRow>
          </Table.TableBody>
        </Table.Table>
      </div>
      <OIDCDomainConfiguration oidcIntegration={oidcIntegration} />
      <div className="space-y-2">
        <Heading size="lg">Access Settings</Heading>
        <div className="space-y-5">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
              <p>Require OIDC to Join</p>
              <p className="text-neutral-10 text-xs font-normal leading-snug">
                Restricts new accounts joining the organization to be authenticated via OIDC.
                <br />
                <span className="font-bold">Existing non-OIDC members will keep their access.</span>
              </p>
            </div>
            <Switch
              checked={oidcIntegration.oidcUserJoinOnly}
              onCheckedChange={checked => onOidcRestrictionChange('oidcUserJoinOnly', checked)}
              disabled={oidcRestrictionsMutation.fetching}
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
              onCheckedChange={checked => onOidcRestrictionChange('oidcUserAccessOnly', checked)}
              disabled={oidcRestrictionsMutation.fetching}
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
              onCheckedChange={checked => onOidcRestrictionChange('requireInvitation', checked)}
              disabled={oidcRestrictionsMutation.fetching}
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
      </div>
      <div className="space-y-2">
        <Heading size="lg">Remove OIDC Provider</Heading>
        <p>Completly disconnect the OIDC provider and all configuration.</p>
        <Button variant="destructive">Delete OIDC Provider</Button>
      </div>
      {modalState === ConnectSingleSignOnProviderState.open && (
        <ConnectSingleSignOnProviderSheet
          onClose={() => setModalState(ConnectSingleSignOnProviderState.closed)}
          initialValues={{
            additionalScopes: oidcIntegration.additionalScopes.join(' '),
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
                clientId: args.clientId || null,
                clientSecret: args.clientSecret || null,
                additionalScopes: args.additionalScopes?.split(' ') || null,
                authorizationEndpoint: args.authorizationEndpoint || null,
                tokenEndpoint: args.tokenEndpoint || null,
                userinfoEndpoint: args.userinfoEndpoint || null,
              },
            });

            if (result.data?.updateOIDCIntegration.error) {
              const { error } = result.data?.updateOIDCIntegration;

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
    }
  }
`);

function OIDCDomainConfiguration(props: {
  oidcIntegration: FragmentType<typeof OIDCDomainConfiguration_OIDCIntegrationFragment>;
}) {
  const oidcIntegration = useFragment(
    OIDCDomainConfiguration_OIDCIntegrationFragment,
    props.oidcIntegration,
  );

  return (
    <div className="space-y-2">
      <div className="flex">
        <Heading size="lg">Registered Domains</Heading>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" className="ml-auto" onClick={() => {}}>
                <PlusIcon size="12" />{' '}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add new domain</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p>Verify domain ownership to skip mandatory email confirmation for organization members.</p>
      <Table.Table>
        <Table.TableHeader>
          <Table.TableRow>
            <Table.TableHead>Domain</Table.TableHead>
            <Table.TableHead>Status</Table.TableHead>
            <Table.TableHead></Table.TableHead>
          </Table.TableRow>
        </Table.TableHeader>
        <Table.TableBody>
          {oidcIntegration.registeredDomains.map(domain => (
            <Table.TableRow>
              <Table.TableCell className="font-mono font-medium">
                {domain.domainName}
              </Table.TableCell>
              <Table.TableCell>{domain.verifiedAt ? 'Verified' : 'Pending'}</Table.TableCell>
              <Table.TableCell className="text-right"></Table.TableCell>
            </Table.TableRow>
          ))}
        </Table.TableBody>
      </Table.Table>
    </div>
  );
}

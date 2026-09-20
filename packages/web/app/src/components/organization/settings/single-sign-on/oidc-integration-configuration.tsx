import { ReactElement, useMemo, useState } from 'react';
import { AlertOctagonIcon, BugPlayIcon, CheckIcon, PlusIcon, SettingsIcon } from 'lucide-react';
import { useMutation } from 'urql';
import { Card } from '@/components/base/card/card';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { DescriptionList } from '@/components/base/description-list/description-list';
import { Popover } from '@/components/base/floating/popover/popover';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Switch } from '@/components/base/switch/switch';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/base/button/button';
import { Callout } from '@/components/ui/callout';
import { Heading } from '@/components/ui/heading';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
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
  // Bumped once a sheet or modal has closed, so the next open starts fresh.
  const [overlaySession, setOverlaySession] = useState(0);
  const resetOnClose = (isOpen: boolean) => {
    if (!isOpen) {
      setOverlaySession(s => s + 1);
    }
  };

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
        <div className="flex justify-between">
          <Heading size="lg">Overview</Heading>
          <Tooltip
            trigger={
              <Button size="icon-sm" onClick={() => setModalState(ModalState.openDebugLogs)}>
                <BugPlayIcon size="12" />{' '}
              </Button>
            }
            content="Debug OIDC Integration"
          />
        </div>
        <p>Endpoints for configuring the OIDC provider.</p>
        <DescriptionList
          rows={[
            {
              items: [
                {
                  term: 'Sign-in redirect URI',
                  description: `${env.appBaseUrl}/auth/callback/oidc`,
                  mono: true,
                  copyable: true,
                  attrs: { 'data-oidc-property-sign-in-redirect-uri': '' },
                },
              ],
            },
            {
              items: [
                {
                  term: 'Sign-out redirect URI',
                  description: `${env.appBaseUrl}/logout`,
                  mono: true,
                  copyable: true,
                  attrs: { 'data-oidc-property-sign-out-redirect-uri': '' },
                },
              ],
            },
            {
              items: [
                {
                  term: 'Sign-in URL',
                  description: `${env.appBaseUrl}/auth/oidc?id=${oidcIntegration.id}`,
                  mono: true,
                  copyable: true,
                  attrs: { 'data-oidc-property-sign-in-url': '' },
                },
              ],
            },
          ]}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Heading size="lg">OIDC Configuration</Heading>
          <Tooltip
            trigger={
              <Button size="icon-sm" onClick={() => setModalState(ModalState.openSettings)}>
                <SettingsIcon size="12" />{' '}
              </Button>
            }
            content="Update endpoint configuration"
          />
        </div>
        <DescriptionList
          rows={[
            {
              items: [
                {
                  term: 'Authorization Endpoint',
                  description: oidcIntegration.authorizationEndpoint,
                  mono: true,
                },
              ],
            },
            {
              items: [
                { term: 'Token Endpoint', description: oidcIntegration.tokenEndpoint, mono: true },
              ],
            },
            {
              items: [
                {
                  term: 'User Info Endpoint',
                  description: oidcIntegration.userinfoEndpoint,
                  mono: true,
                },
              ],
            },
            {
              items: [
                { term: 'Client ID', description: oidcIntegration.clientId, mono: true },
                {
                  term: 'Client Secret',
                  description: `•••••••${oidcIntegration.clientSecretPreview}`,
                  mono: true,
                },
              ],
            },
            {
              items: [
                {
                  term: 'User ID Claim',
                  tooltip: 'The claim that should be used to uniquely identify an user.',
                  description: oidcIntegration.userIdClaim ?? (
                    <span className="text-neutral-10">none set</span>
                  ),
                  mono: true,
                },
                {
                  term: 'Additional Scopes',
                  tooltip: 'Additional scopes that are requested from the OIDC provider.',
                  description: oidcIntegration.additionalScopes.length ? (
                    oidcIntegration.additionalScopes.join(' ')
                  ) : (
                    <span className="text-neutral-8">none</span>
                  ),
                  mono: true,
                },
              ],
            },
          ]}
        />
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
      <ConnectSingleSignOnProviderSheet
        key={`settings-${overlaySession}`}
        open={modalState === ModalState.openSettings}
        onClose={() => setModalState(ModalState.closed)}
        onOpenChangeComplete={resetOnClose}
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
      <RemoveOIDCIntegrationModal
        key={`delete-${overlaySession}`}
        open={modalState === ModalState.openDelete}
        close={() => setModalState(ModalState.closed)}
        onOpenChangeComplete={resetOnClose}
        oidcIntegrationId={oidcIntegration.id}
      />
      <DebugOIDCIntegrationModal
        key={`debug-${overlaySession}`}
        open={modalState === ModalState.openDebugLogs}
        close={() => setModalState(ModalState.closed)}
        onOpenChangeComplete={resetOnClose}
        oidcIntegrationId={oidcIntegration.id}
      />
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

type RegisteredDomain = DocumentType<
  typeof OIDCDomainConfiguration_OIDCIntegrationFragment
>['registeredDomains'][number];

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
  const [enforceOpen, setEnforceOpen] = useState(false);
  // The sheet keeps its last domain through the exit transition and remounts once closed. It
  // also remounts when a new domain is registered, which is what moves it to the verify step.
  const sheetState = useKeepPreviousData(state ?? undefined, state === null);
  const [domainSheetSession, setDomainSheetSession] = useState(0);

  const columns = useMemo<ColumnDef<RegisteredDomain, unknown>[]>(
    () => [
      {
        id: 'domain',
        header: 'Domain',
        meta: { width: 'fill' },
        cell: ({ row }) => (
          <DataTableCell kind="text" value={row.original.domainName} mono weight="medium" />
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.verifiedAt ? (
            <DataTableCell kind="status" label="Verified" icon={CheckIcon} iconTone="success" />
          ) : (
            <DataTableCell
              kind="status"
              label="Pending"
              icon={AlertOctagonIcon}
              iconTone="warning"
              tooltip="The domain ownership challenge has not been completed."
            />
          ),
      },
      {
        id: 'manage',
        meta: { width: 'xs' },
        cell: ({ row }) => (
          <DataTableCell
            kind="icon-button"
            icon={SettingsIcon}
            label={`Manage ${row.original.domainName}`}
            onClick={() => setState({ domainId: row.original.id, type: 'manage' })}
          />
        ),
      },
    ],
    [setState],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Heading size="lg">Registered Domains</Heading>
          <Tooltip
            trigger={
              <Button
                data-button-add-new-domain
                size="icon-sm"
                onClick={() => setState({ type: 'create' })}
              >
                <PlusIcon size="12" />{' '}
              </Button>
            }
            content="Add new domain"
          />
        </div>
        <p>
          Verify domain ownership to skip mandatory email confirmation for organization members.
        </p>
        <DataTable
          data={oidcIntegration.registeredDomains}
          columns={columns}
          getRowId={domain => domain.id}
          pagination={{ kind: 'none' }}
          emptyMessage="No Domains registered"
        />
      </div>
      <Card title="Domain Settings" description="Settings for the verified domains.">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
            <p>Require OIDC Login</p>
            <p className="max-w-[500px] text-xs font-normal leading-snug">
              Enforce sign in/up through OIDC for verified domains. Any other login method will be
              blocked. The organization owner is excluded from this restriction.
            </p>
          </div>
          {/* The switch only asks; the dialog's confirm flips the setting. */}
          <Switch
            checked={oidcIntegration.oidcForVerifiedDomainsRequired}
            onCheckedChange={() => setEnforceOpen(true)}
            data-cy="oidc-require-verified-domain-login-toggle"
          />
          <AlertDialog
            open={enforceOpen}
            onOpenChange={setEnforceOpen}
            title={
              oidcIntegration.oidcForVerifiedDomainsRequired
                ? 'Disable enforced OIDC login'
                : 'Enforce OIDC login'
            }
            description={
              oidcIntegration.oidcForVerifiedDomainsRequired
                ? 'Users will be able to login with any method, such as email + password or social logins.'
                : 'Users will no longer be able to login with email+password or social logins.'
            }
            confirm={{
              label: oidcIntegration.oidcForVerifiedDomainsRequired
                ? 'Disable enforced ODIC login'
                : 'Enforce OIDC login',
              variant: 'destructive',
              onClick: () => {
                props.onRestrictionChange(
                  'oidcForVerifiedDomainsRequired',
                  !oidcIntegration.oidcForVerifiedDomainsRequired,
                );
                setEnforceOpen(false);
              },
            }}
          >
            {oidcIntegration.oidcForVerifiedDomainsRequired ? null : (
              <Callout type="warning">
                This action can potentially lock you out of the organization. Make sure your OIDC
                provider is configured properly and you can log in using it.
              </Callout>
            )}
          </AlertDialog>
        </div>
      </Card>
      <OIDCRegisteredDomainSheet
        key={`${sheetState?.type ?? 'none'}-${sheetState?.type === 'manage' ? sheetState.domainId : ''}-${domainSheetSession}`}
        open={state !== null}
        onOpenChangeComplete={isOpen => {
          if (!isOpen) {
            setDomainSheetSession(s => s + 1);
          }
        }}
        oidcIntegrationId={oidcIntegration.id}
        domain={
          (sheetState?.type === 'manage'
            ? oidcIntegration.registeredDomains.find(domain => domain.id === sheetState.domainId)
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
  const [confirmSCIMProvisioning, setConfirmSCIMProvisioning] = useState(false);

  // Only a change in either direction should do anything, so both branches no-op when the group
  // is already on that option.
  const handleProvisioningChange = (next: string) => {
    if (next === 'scim') {
      // Requiring SCIM locks out members who are not provisioned through it, so the radio only
      // opens the confirmation. The group is controlled by server state, so it stays on `oidc`
      // until the mutation lands. Relaxing the restriction needs no confirmation.
      if (!isSCIMProvisioningEnabled) {
        setConfirmSCIMProvisioning(true);
      }
      return;
    }
    if (isSCIMProvisioningEnabled) {
      props.onRestrictionChange('userProvisioningRequired', false);
    }
  };

  return (
    <div>
      <Heading>User Provisioning</Heading>
      <p>Configure how users should be provisioned by your identity provider.</p>
      <div className="mt-2 space-y-4 rounded-lg border p-6">
        <RadioGroup
          variant="as-card"
          orientation="horizontal"
          value={isSCIMProvisioningEnabled ? 'scim' : 'oidc'}
          onValueChange={handleProvisioningChange}
          items={[
            {
              value: 'oidc',
              label: organization.viewerCanManageSCIM ? 'Mixed OIDC and SCIM' : 'Managed via OIDC',
              ariaLabel: organization.viewerCanManageSCIM
                ? 'Mixed OIDC and SCIM'
                : 'Managed via OIDC',
              description: organization.viewerCanManageSCIM
                ? 'Users are provisioned when signing in via OIDC. Optionally, users and groups can be provisioned via SCIM.'
                : 'Users are provisioned when signing in via OIDC.',
            },
            ...(organization.viewerCanManageSCIM
              ? [
                  {
                    value: 'scim',
                    label: 'Managed via SCIM',
                    ariaLabel: 'Managed via SCIM',
                    description:
                      'Users and groups are exclusively managed by your identity provider via SCIM. Roles and permissions are assigned to groups via role mappings.',
                  },
                ]
              : []),
          ]}
        />
        <AlertDialog
          open={confirmSCIMProvisioning}
          onOpenChange={setConfirmSCIMProvisioning}
          title="Require SCIM provisioning?"
          description="Users who are not provisioned through SCIM will no longer be able to access this organization. The organization owner is not affected."
          confirm={{
            label: 'Require SCIM provisioning',
            variant: 'destructive',
            onClick: () => {
              props.onRestrictionChange('userProvisioningRequired', true);
              setConfirmSCIMProvisioning(false);
            },
          }}
        >
          <Callout type="warning">
            Members with unresolved SCIM provisioning conflicts will keep their current access until
            you review them. New OIDC users must first be provisioned through SCIM.
          </Callout>
        </AlertDialog>
        {isSCIMProvisioningEnabled ? (
          <>
            <Card title="SCIM Provision Defaults">
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
                      <Popover
                        trigger={
                          <button type="button" className="flex text-xs text-yellow-500">
                            {organization.pendingSCIMManagementConfirmationsCount} SCIM provisioning
                            conflict
                            {organization.pendingSCIMManagementConfirmationsCount === 1 ? '' : 's'}
                          </button>
                        }
                        openOnHover
                        content={
                          <div className="text-neutral-11 space-y-2 text-sm">
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
                          </div>
                        }
                      />
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
            </Card>
          </>
        ) : (
          <Card
            title="OIDC Provision Settings"
            description="Customize the provision behaviour vor OIDC."
          >
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
                      width="full"
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
  open: boolean;
  close: () => void;
  /** Fires once the close transition has finished; the parent remounts the modal on it. */
  onOpenChangeComplete: (open: boolean) => void;
  oidcIntegrationId: null | string;
}): ReactElement {
  const [mutation, mutate] = useMutation(RemoveOIDCIntegrationModal_DeleteOIDCIntegrationMutation);
  const { oidcIntegrationId } = props;
  const removed = !!mutation.data?.deleteOIDCIntegration.ok;

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.close}
      onOpenChangeComplete={props.onOpenChangeComplete}
      title="Remove OpenID Connect Integration"
      footer={
        removed || oidcIntegrationId === null ? (
          <Button onSurface="raised" onClick={props.close}>
            Close
          </Button>
        ) : (
          <>
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
          </>
        )
      }
    >
      {removed ? (
        <p>The OIDC integration has been removed successfully.</p>
      ) : oidcIntegrationId === null ? (
        <p>This organization does not have an OIDC integration.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Callout type="warning">
            This action is not reversible and revoke access to all users that have signed in with
            this OIDC integration.
          </Callout>
          <p>Do you really want to proceed?</p>
        </div>
      )}
    </Dialog>
  );
}

import { useState } from 'react';
import { KeyIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/ui/primitives/button/button';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { ConnectSingleSignOnProviderSheet } from './connect-single-sign-on-provider-sheet';
import { OIDCIntegrationConfiguration } from './oidc-integration-configuration';

export const SingleSignOnSubpageQuery = graphql(`
  query SingleSignOnSubpageQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      oidcIntegration {
        __typename
        id
        ...OIDCIntegrationConfiguration_OIDCIntegration
      }
      ...OIDCIntegrationConfiguration_Organization
    }
  }
`);

const SingleSignOnSubpage_CreateOIDCIntegrationMutation = graphql(`
  mutation SingleSignOnSubpage_CreateOIDCIntegrationMutation($input: CreateOIDCIntegrationInput!) {
    createOIDCIntegration(input: $input) {
      ok {
        organization {
          id
          oidcIntegration {
            ...OIDCIntegrationConfiguration_OIDCIntegration
          }
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

const enum ConnectSingleSignOnProviderState {
  closed,
  open,
  /** show confirmation dialog to ditch draft state of new access token */
  closing,
}

export function SingleSignOnSubpage(): React.ReactNode {
  const { organizationSlug } = useSlugs('organization');
  const [query] = useQuery({
    query: SingleSignOnSubpageQuery,
    variables: {
      organizationSlug,
    },
  });
  const { toast } = useToast();
  const [_, mutate] = useMutation(SingleSignOnSubpage_CreateOIDCIntegrationMutation);

  const [modalState, setModalState] = useState(ConnectSingleSignOnProviderState.closed);
  // Bumped once the sheet has closed, so the next open starts from a clean form.
  const [sheetSession, setSheetSession] = useState(0);

  const organization = query.data?.organization;
  const oidcIntegration = organization?.oidcIntegration;

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="SSO and SCIM"
        description="Link your Hive organization to a single-sign-on provider such as Okta or Microsoft Entra ID via OpenID Connect. Provision users via the SCIM v2 protocol."
        docsLink={{
          href: '/management/sso-oidc-provider',
          text: 'Documentation',
        }}
      />
      <div className="text-fg-secondary max-w-[800px] space-y-4">
        {(query.fetching || query.stale) && !oidcIntegration ? (
          <LoadingSkeleton />
        ) : oidcIntegration ? (
          <OIDCIntegrationConfiguration
            oidcIntegration={oidcIntegration}
            organization={organization}
          />
        ) : (
          <>
            <div className="mt-5">
              <Button
                onClick={() => setModalState(ConnectSingleSignOnProviderState.open)}
                data-button-connect-open-id-provider
              >
                <KeyIcon className="mr-2" />
                Connect Open ID Connect Provider
              </Button>
            </div>
            <p>Your organization has currently no Open ID Connect provider configured.</p>
            <ConnectSingleSignOnProviderSheet
              key={sheetSession}
              open={modalState === ConnectSingleSignOnProviderState.open}
              onClose={() => setModalState(ConnectSingleSignOnProviderState.closed)}
              onOpenChangeComplete={isOpen => {
                if (!isOpen) {
                  setSheetSession(s => s + 1);
                }
              }}
              initialValues={null}
              onSave={async values => {
                const result = await mutate({
                  input: {
                    organizationId: organization?.id ?? '',
                    clientId: values.clientId,
                    clientSecret: values.clientSecret ?? '',
                    authorizationEndpoint: values.authorizationEndpoint,
                    tokenEndpoint: values.tokenEndpoint,
                    userinfoEndpoint: values.userinfoEndpoint,
                    userIdClaim: values.userIdClaim,
                    additionalScopes:
                      values.additionalScopes.trim() === ''
                        ? []
                        : values.additionalScopes.trim().split(' '),
                  },
                });

                if (result.data?.createOIDCIntegration.error) {
                  const { error } = result.data.createOIDCIntegration;
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
                  title: 'Set up OIDC provider.',
                });

                return {
                  type: 'success',
                };
              }}
            />
          </>
        )}
      </div>
    </SubPageLayout>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {/* Overview Section */}
      <section className="space-y-8">
        <span className="flex w-24">
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className="flex w-72">
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-8">
              <span className="flex w-36">
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className="flex w-80">
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* OIDC Configuration Section */}
      <section className="space-y-8">
        <span className="flex w-40">
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-8">
              <span className="flex w-36">
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className="flex w-72">
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Registered Domains Section */}
      <section className="space-y-8">
        <span className="flex w-44">
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className="flex w-96">
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className="flex gap-8">
          <span className="flex w-24">
            <Skeleton variants={{ width: 'full' }} />
          </span>
          <span className="flex w-24">
            <Skeleton variants={{ width: 'full' }} />
          </span>
        </div>
      </section>

      {/* Access Settings Section */}
      <section className="space-y-8">
        <span className="flex w-36">
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="flex w-40">
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className="flex w-72">
                <Skeleton variants={{ size: 'sm', width: 'full' }} />
              </span>
            </div>
            <span className="block h-6 w-11">
              <Skeleton variants={{ shape: 'block' }} />
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

import { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { KeyIcon } from '@/components/ui/icon';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { ConnectSingleSignOnProviderSheet } from './connect-single-sign-on-provider-sheet';
import { OIDCIntegrationConfiguration } from './oidc-integration-configuration';

type SingleSignOnSubPageProps = {
  organizationSlug: string;
};

const SingleSignOnSubpageQuery = graphql(`
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

export function SingleSignOnSubpage(props: SingleSignOnSubPageProps): React.ReactNode {
  const [query] = useQuery({
    query: SingleSignOnSubpageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
    requestPolicy: 'network-only',
  });
  const { toast } = useToast();
  const [_, mutate] = useMutation(SingleSignOnSubpage_CreateOIDCIntegrationMutation);

  const [modalState, setModalState] = useState(ConnectSingleSignOnProviderState.closed);

  const organization = query.data?.organization;
  const oidcIntegration = organization?.oidcIntegration;

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Single Sign On Provider"
        description={
          <>
            <CardDescription>
              Link your Hive organization to a single-sign-on provider such as Okta or Microsoft
              Entra ID via OpenID Connect.
            </CardDescription>
            <CardDescription>
              <DocsLink className="text-neutral-10 text-sm" href="/management/sso-oidc-provider">
                Instructions for connecting your provider.
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <div className="text-neutral-10 max-w-[800px] space-y-4">
        {query.fetching ? (
          <LoadingSkeleton />
        ) : oidcIntegration ? (
          <OIDCIntegrationConfiguration
            oidcIntegration={oidcIntegration}
            organization={organization}
          />
        ) : (
          <>
            <Button
              className="mt-5"
              onClick={() => setModalState(ConnectSingleSignOnProviderState.open)}
              data-button-connect-open-id-provider
            >
              <KeyIcon className="mr-2" />
              Connect Open ID Connect Provider
            </Button>
            <p>Your organization has currently no Open ID Connect provider configured.</p>
            {modalState === ConnectSingleSignOnProviderState.open && (
              <ConnectSingleSignOnProviderSheet
                onClose={() => setModalState(ConnectSingleSignOnProviderState.closed)}
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
            )}
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
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-72" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-8">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-80" />
            </div>
          ))}
        </div>
      </section>

      {/* OIDC Configuration Section */}
      <section className="space-y-8">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-8">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-72" />
            </div>
          ))}
        </div>
      </section>

      {/* Registered Domains Section */}
      <section className="space-y-8">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </section>

      {/* Access Settings Section */}
      <section className="space-y-8">
        <Skeleton className="h-6 w-36" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </section>
    </>
  );
}

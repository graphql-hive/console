import { useState } from 'react';
import { KeyIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Button } from '@/components/ui/primitives/button/button';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { ConnectSingleSignOnProviderSheet } from './connect-single-sign-on-provider-sheet';
import { OIDCIntegrationConfiguration } from './oidc-integration-configuration';
import * as styles from './single-sign-on-subpage.css';

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
      <div className={styles.singleSignOnSubpageDiv}>
        {(query.fetching || query.stale) && !oidcIntegration ? (
          <LoadingSkeleton />
        ) : oidcIntegration ? (
          <OIDCIntegrationConfiguration
            oidcIntegration={oidcIntegration}
            organization={organization}
          />
        ) : (
          <>
            <div className={styles.singleSignOnSubpageDiv2}>
              <Button
                onClick={() => setModalState(ConnectSingleSignOnProviderState.open)}
                data-button-connect-open-id-provider
              >
                <KeyIcon className={styles.singleSignOnSubpageKeyIcon} />
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
      <section className={styles.loadingSkeletonSection}>
        <span className={styles.loadingSkeletonSpan}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className={styles.loadingSkeletonSpan2}>
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className={styles.loadingSkeletonDiv}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.loadingSkeletonDiv2}>
              <span className={styles.loadingSkeletonSpan3}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={styles.loadingSkeletonSpan4}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* OIDC Configuration Section */}
      <section className={styles.loadingSkeletonSection2}>
        <span className={styles.loadingSkeletonSpan5}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <div className={styles.loadingSkeletonDiv3}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.loadingSkeletonDiv4}>
              <span className={styles.loadingSkeletonSpan6}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={styles.loadingSkeletonSpan7}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Registered Domains Section */}
      <section className={styles.loadingSkeletonSection3}>
        <span className={styles.loadingSkeletonSpan8}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className={styles.loadingSkeletonSpan9}>
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className={styles.loadingSkeletonDiv5}>
          <span className={styles.loadingSkeletonSpan10}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
          <span className={styles.loadingSkeletonSpan11}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
        </div>
      </section>

      {/* Access Settings Section */}
      <section className={styles.loadingSkeletonSection4}>
        <span className={styles.loadingSkeletonSpan12}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.loadingSkeletonDiv6}>
            <div className={styles.loadingSkeletonDiv7}>
              <span className={styles.loadingSkeletonSpan13}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={styles.loadingSkeletonSpan14}>
                <Skeleton variants={{ size: 'sm', width: 'full' }} />
              </span>
            </div>
            <span className={styles.loadingSkeletonSpan15}>
              <Skeleton variants={{ shape: 'block' }} />
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

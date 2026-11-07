import { useCallback, useEffect } from 'react';
import { LogOutIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { HiveLogo } from '@/components/ui/brand-icon';
import { DataWrapper } from '@/components/ui/data-wrapper';
import { DottedBackground } from '@/components/ui/dotted-background';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { useSession } from '@/lib/auth/use-session';
import { HiveStripeWrapper } from '@/lib/billing/stripe';
import { Link, useRouter } from '@tanstack/react-router';
import * as styles from './organization-join.css';

export const JoinOrganizationPage_JoinOrganizationMutation = graphql(`
  mutation JoinOrganizationPage_JoinOrganizationMutation($code: String!) {
    joinOrganization(code: $code) {
      __typename
      ... on OrganizationPayload {
        selector {
          organizationSlug
        }
        organization {
          id
          slug
        }
      }
      ... on OrganizationInvitationError {
        message
      }
    }
  }
`);

const JoinOrganizationPage_OrganizationInvitationQuery = graphql(`
  query JoinOrganizationPage_OrganizationInvitationQuery($code: String!) {
    organizationByInviteCode(code: $code) {
      __typename
      ... on OrganizationInvitationPayload {
        name
      }
      ... on OrganizationInvitationError {
        message
      }
    }
  }
`);

export function JoinOrganizationPage(props: { inviteCode: string }) {
  const router = useRouter();
  const session = useSession();
  const { toast } = useToast();
  const code = props.inviteCode;
  const [query] = useQuery({
    query: JoinOrganizationPage_OrganizationInvitationQuery,
    variables: { code },
  });
  const [mutation, mutate] = useMutation(JoinOrganizationPage_JoinOrganizationMutation);
  const accept = useCallback(async () => {
    const result = await mutate({ code });
    if (result.data) {
      if (result.data.joinOrganization.__typename === 'OrganizationInvitationError') {
        toast({
          title: 'Failed to join organization',
          description: result.data.joinOrganization.message,
          variant: 'destructive',
        });
      } else {
        const org = result.data.joinOrganization.organization;
        toast({
          title: 'Joined organization',
          description: `You are now a member of ${org.slug}`,
        });
        void router.navigate({
          to: '/$organizationSlug',
          params: { organizationSlug: org.slug },
        });
      }
    }
  }, [mutate, code, router, toast]);

  const goBack = useCallback(() => {
    void router.navigate({
      to: '/',
    });
  }, [router]);

  const orgName =
    query.data?.organizationByInviteCode?.__typename === 'OrganizationInvitationPayload'
      ? query.data.organizationByInviteCode.name
      : null;

  useEffect(() => {
    if (!session.loading && !session.doesSessionExist) {
      toast({
        title: 'Account Required',
        description:
          'To accept an organization invite, you must first have an account, log in, and then use the invitation.',
        variant: 'default',
        duration: 10_000,
      });
      void router.navigate({
        to: '/auth/sign-in',
        search: {
          redirectToPath: router.latestLocation.pathname,
        },
      });
    }
  }, [!session.loading && !session.doesSessionExist, toast, router]);

  if (session.loading) {
    return (
      <div className={styles.joinOrganizationPageDiv}>
        <Spinner />
      </div>
    );
  }

  if (!session.doesSessionExist) {
    return <></>;
  }

  return (
    <HiveStripeWrapper>
      <Meta title={orgName ? `Invitation to ${orgName}` : 'Invitation'} />
      <DottedBackground className={styles.joinOrganizationPageDottedBackground}>
        <div className={styles.joinOrganizationPageDiv2}>
          <Button variant="outline" onClick={() => router.navigate({ to: '/logout' })}>
            <LogOutIcon className={styles.joinOrganizationPageLogOutIcon} /> Sign out
          </Button>
        </div>
        <Link to="/" className={styles.joinOrganizationPageLink}>
          <HiveLogo className={styles.joinOrganizationPageHiveLogo} />
        </Link>
        <div className={styles.joinOrganizationPageDiv3}>
          <DataWrapper query={query} organizationSlug={null}>
            {({ data }) => {
              if (data.organizationByInviteCode == null) {
                return null;
              }
              const invitation = data.organizationByInviteCode;

              if (invitation.__typename === 'OrganizationInvitationError') {
                return (
                  <div className={styles.joinOrganizationPageDiv4}>
                    <Card
                      variants={{ onSurface: 'raised', titleSize: 'large' }}
                      title="Invitation Error"
                    >
                      {invitation.message}
                      <div className={styles.joinOrganizationPageDiv5}>
                        <Button width="full" onSurface="raised" onClick={goBack}>
                          Back to Hive
                        </Button>
                      </div>
                    </Card>
                  </div>
                );
              }

              return (
                <div className={styles.joinOrganizationPageDiv4}>
                  <Card
                    variants={{ onSurface: 'raised', titleSize: 'large' }}
                    title={`Join "${invitation.name}" organization`}
                  >
                    <p>
                      You've been invited to become a member of{' '}
                      <span className={styles.joinOrganizationPageSpan}>{invitation.name}</span>.
                    </p>
                    <p className={styles.joinOrganizationPageP}>
                      By accepting the invitation, you will be able to collaborate with other
                      members of this organization.
                    </p>
                    <div className={styles.joinOrganizationPageDiv6}>
                      <Button
                        variant="outline"
                        width="full"
                        disabled={mutation.fetching}
                        onClick={goBack}
                      >
                        Ignore
                      </Button>
                      <Button
                        width="full"
                        onSurface="raised"
                        onClick={accept}
                        disabled={mutation.fetching}
                      >
                        Accept
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            }}
          </DataWrapper>
        </div>
      </DottedBackground>
    </HiveStripeWrapper>
  );
}

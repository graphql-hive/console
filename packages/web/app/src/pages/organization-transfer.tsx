import { useCallback } from 'react';
import { LoaderCircleIcon, LogOutIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { HiveLogo } from '@/components/ui/brand-icon';
import { DottedBackground } from '@/components/ui/dotted-background';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { Link, useRouter } from '@tanstack/react-router';
import { organizationTransferStyles } from './organization-transfer.css';

const classes = {
  title: organizationTransferStyles.title,
  description: organizationTransferStyles.description,
  actions: organizationTransferStyles.actions,
};

const OrganizationTransferPage_GetRequest = graphql(`
  query OrganizationTransferPage_GetRequest($selector: OrganizationTransferRequestSelector!) {
    organizationTransferRequest(selector: $selector) {
      organization {
        id
        slug
      }
      ownerName
    }
  }
`);

const OrganizationTransferPage_AnswerRequest = graphql(`
  mutation OrganizationTransferPage_AnswerRequest($input: AnswerOrganizationTransferRequestInput!) {
    answerOrganizationTransferRequest(input: $input) {
      ok {
        accepted
      }
      error {
        message
      }
    }
  }
`);

export function OrganizationTransferPage(props: { organizationSlug: string; code: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const code = props.code;
  const [query] = useQuery({
    query: OrganizationTransferPage_GetRequest,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
        code,
      },
    },
  });
  const [mutation, mutate] = useMutation(OrganizationTransferPage_AnswerRequest);
  const answer = useCallback(
    async (accept: boolean) => {
      const result = await mutate({
        input: {
          code,
          organizationSlug: props.organizationSlug,
          accept,
        },
      });
      if (result.data?.answerOrganizationTransferRequest) {
        if (result.data.answerOrganizationTransferRequest.ok) {
          if (accept) {
            toast({ title: 'The organization is now yours!' });
          }
          void router.navigate({
            to: '/$organizationSlug',
            params: {
              organizationSlug: props.organizationSlug,
            },
          });
        } else {
          toast({
            variant: 'destructive',
            title: result.data.answerOrganizationTransferRequest.error!.message,
          });
        }
      }

      if (result.error) {
        toast({ variant: 'destructive', title: 'Failed to answer' });
      }
    },
    [mutate, props.organizationSlug, code, router, toast],
  );

  const accept = useCallback(() => answer(true), [answer]);
  const reject = useCallback(() => answer(false), [answer]);

  const goBack = useCallback(() => {
    void router.navigate({
      to: '/',
    });
  }, [router]);

  return (
    <>
      <Meta title="Organization Transfer" />
      <DottedBackground className={organizationTransferStyles.background}>
        <div className={organizationTransferStyles.root}>
          <div className={organizationTransferStyles.signOut}>
            <Button
              variant="outline"
              onClick={() =>
                void router.navigate({
                  to: '/logout',
                })
              }
            >
              <LogOutIcon className={organizationTransferStyles.signOutIcon} /> Sign out
            </Button>
          </div>
          <Link to="/" className={organizationTransferStyles.home}>
            <HiveLogo className={organizationTransferStyles.logo} />
          </Link>
          <div className={organizationTransferStyles.body}>
            <div className={organizationTransferStyles.content}>
              {query.stale || query.fetching ? (
                <div>
                  <LoaderCircleIcon className={organizationTransferStyles.spinner} />
                  Loading
                </div>
              ) : query.error ? (
                <>
                  <h1 className={classes.title}>Organization Transfer Error</h1>
                  <p>{query.error.message}</p>

                  <p className={classes.description}>
                    Please make sure you are signed-in with the correct account for this
                    organization.
                  </p>

                  <div className={classes.actions}>
                    <Button onClick={goBack}>Back to Hive</Button>
                    <Button render={<Link to="/logout" />}>Sign Out</Button>
                  </div>
                </>
              ) : !query?.data?.organizationTransferRequest ? (
                <>
                  <h1 className={classes.title}>Organization Transfer Error</h1>
                  <p className={classes.description}>Not found</p>

                  <div className={classes.actions}>
                    <Button onClick={goBack}>Back to Hive</Button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className={classes.title}>Accept the transfer?</h1>
                  <p className={classes.description}>
                    {query.data.organizationTransferRequest.ownerName} wants to transfer the "
                    {query.data.organizationTransferRequest.organization.slug}" organization to you.
                  </p>

                  <div className={classes.actions}>
                    <Button onClick={accept} disabled={mutation.fetching}>
                      Accept
                    </Button>
                    <Button variant="destructive" onClick={reject} disabled={mutation.fetching}>
                      Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DottedBackground>
    </>
  );
}

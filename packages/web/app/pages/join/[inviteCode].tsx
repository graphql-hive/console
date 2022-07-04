import * as React from 'react';
import tw from 'twin.macro';
import { useRouteSelector } from '@/lib/hooks/use-route-selector';
import { track } from '@/lib/mixpanel';
import { useQuery, useMutation } from 'urql';
import { OrganizationInvitationDocument, JoinOrganizationDocument } from '@/graphql';
import { Button } from '@chakra-ui/react';
import { Title } from '@/components/common';
import { DataWrapper } from '@/components/common/DataWrapper';
import { useNotifications } from '@/lib/hooks/use-notifications';

const Center = tw.div`w-full h-full flex flex-row items-center justify-center`;

const Invitation = {
  Root: tw.div`flex flex-col text-center md:w-2/3 w-full`,
  Title: tw.h1`sm:text-4xl text-3xl mb-4 font-medium text-white`,
  Description: tw.p`mb-8 leading-relaxed`,
  Actions: tw.div`flex flex-row gap-2 items-center justify-center`,
};

export default function OrganizationPage() {
  const router = useRouteSelector();
  const notify = useNotifications();
  const code = router.query.inviteCode as string;
  const [query] = useQuery({
    query: OrganizationInvitationDocument,
    variables: {
      code,
    },
  });
  const [mutation, mutate] = useMutation(JoinOrganizationDocument);
  const accept = React.useCallback(() => {
    track('JOIN_ORGANIZATION_ATTEMPT', {
      code,
    });
    mutate({
      code,
    }).then(result => {
      if (result.data) {
        if (result.data.joinOrganization.__typename === 'OrganizationInvitationError') {
          notify(result.data.joinOrganization.message, 'error');
        } else {
          const org = result.data.joinOrganization.organization;
          notify(`You joined "${org.name}" organization`, 'success');
          track('JOIN_ORGANIZATION_ATTEMPT_SUCCESS', {
            code,
          });
          router.visitOrganization({
            organizationId: org.cleanId,
          });
        }
      }
    });
  }, [mutate, code, router, notify]);

  const goBack = React.useCallback(() => {
    track('JOIN_ORGANIZATION_ATTEMPT_FAILURE', {
      code,
    });
    router.visitHome();
  }, [router]);

  return (
    <>
      <Title title="Invitation" />
      <DataWrapper query={query}>
        {({ data }) => {
          if (data.organizationByInviteCode == null) {
            return null;
          }
          const invitation = data.organizationByInviteCode;

          if (invitation.__typename === 'OrganizationInvitationError') {
            return (
              <Center>
                <Invitation.Root>
                  <Invitation.Title>Invitation Error</Invitation.Title>
                  <Invitation.Description>{invitation.message}</Invitation.Description>

                  <Invitation.Actions>
                    <Button onClick={goBack}>Back to Hive</Button>
                  </Invitation.Actions>
                </Invitation.Root>
              </Center>
            );
          }

          return (
            <Center>
              <Invitation.Root>
                <Invitation.Title>Join "{invitation.name}" organization?</Invitation.Title>
                <Invitation.Description>
                  You've been invited to join "{invitation.name}" organization on GraphQL Hive.
                </Invitation.Description>

                <Invitation.Actions>
                  <Button colorScheme="primary" onClick={accept} disabled={mutation.fetching}>
                    Accept
                  </Button>
                  <Button disabled={mutation.fetching} onClick={goBack}>
                    Ignore
                  </Button>
                </Invitation.Actions>
              </Invitation.Root>
            </Center>
          );
        }}
      </DataWrapper>
    </>
  );
}

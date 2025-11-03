import { useState } from 'react';
import { useQuery } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { CreateAccessTokenState } from '../access-tokens/access-tokens-sub-page';
import { CreatePersonalAccessTokenSheetContent } from './create-personal-access-token-sheet-content';
import { PersonalAccessTokensTable } from './personal-access-tokens-table';

const PersonalAccessTokensSubPage_OrganizationQuery = graphql(`
  query PersonalAccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      me {
        id
        accessTokens(first: 20) {
          __typename
          ...PersonalAccessTokensTable_OrganizationAccessTokenConnectionFragment
        }
      }
      ...CreatePersonalAccessTokenSheetContent_OrganizationFragment
    }
  }
`);

type PersonalAccessTokensSubPageProps = {
  organizationSlug: string;
};

export function PersonalAccessTokensSubPage(
  props: PersonalAccessTokensSubPageProps,
): React.ReactNode {
  const [query, refetchQuery] = useQuery({
    query: PersonalAccessTokensSubPage_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
    requestPolicy: 'network-only',
  });
  const [createAccessTokenState, setCreateAccessTokenState] = useState<CreateAccessTokenState>(
    CreateAccessTokenState.closed,
  );

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Personal Access Tokens"
        description={
          <div className="max-w-[800px] space-y-2">
            <CardDescription>
              Here you can manage access tokens on behalf of your users authority. You can create
              and assign access tokens with a subset of your organization membership permissions and
              resource access.
            </CardDescription>
            <CardDescription>
              Your personal access tokens are disabled once your user account looses the authority
              to issue personal access tokens.
            </CardDescription>
            <CardDescription>
              It is recommended to use personal access tokens for local development. If you are
              setting up CI or CD pipelines please instead consider using project or organization
              scoped access tokens.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/access-tokens"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </div>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-personal-access-tokens">
        <Sheet.Sheet
          open={createAccessTokenState !== CreateAccessTokenState.closed}
          onOpenChange={isOpen => {
            if (isOpen === false) {
              setCreateAccessTokenState(CreateAccessTokenState.closing);
              return;
            }
            setCreateAccessTokenState(CreateAccessTokenState.open);
          }}
        >
          <Sheet.SheetTrigger asChild>
            <Button data-cy="organization-settings-access-tokens-create-new">
              Create new access token
            </Button>
          </Sheet.SheetTrigger>
          {createAccessTokenState !== CreateAccessTokenState.closed &&
            query.data?.organization?.me && (
              <CreatePersonalAccessTokenSheetContent
                organization={query.data.organization}
                onSuccess={() => {
                  setCreateAccessTokenState(CreateAccessTokenState.closed);
                  refetchQuery();
                }}
              />
            )}
        </Sheet.Sheet>
        {createAccessTokenState === CreateAccessTokenState.closing && (
          <AlertDialog.AlertDialog open>
            <AlertDialog.AlertDialogContent>
              <AlertDialog.AlertDialogHeader>
                <AlertDialog.AlertDialogTitle>
                  Do you want to discard the access token?
                </AlertDialog.AlertDialogTitle>
                <AlertDialog.AlertDialogDescription>
                  If you cancel now, any draft information will be lost.
                </AlertDialog.AlertDialogDescription>
              </AlertDialog.AlertDialogHeader>
              <AlertDialog.AlertDialogFooter>
                <AlertDialog.AlertDialogCancel
                  onClick={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
                >
                  Cancel
                </AlertDialog.AlertDialogCancel>
                <AlertDialog.AlertDialogAction
                  onClick={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
                >
                  Close
                </AlertDialog.AlertDialogAction>
              </AlertDialog.AlertDialogFooter>
            </AlertDialog.AlertDialogContent>
          </AlertDialog.AlertDialog>
        )}
        {query.data?.organization?.me?.accessTokens && (
          <PersonalAccessTokensTable
            accessTokens={query.data.organization.me.accessTokens}
            organizationSlug={props.organizationSlug}
            refetch={refetchQuery}
          />
        )}
      </div>
    </SubPageLayout>
  );
}

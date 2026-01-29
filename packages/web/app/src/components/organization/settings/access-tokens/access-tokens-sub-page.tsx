import { useState } from 'react';
import { useQuery } from 'urql';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { AccessTokensTable } from './access-tokens-table';
import { CreateAccessTokenSheetContent } from './create-access-token-sheet-content';

type AccessTokensSubPageProps = {
  organizationSlug: string;
};

const AccessTokensSubPage_OrganizationQuery = graphql(`
  query AccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      allAccessTokens(first: 10) {
        ...AccessTokensTable_AccessTokenConnectionFragment
      }
      ...CreateAccessTokenSheetContent_OrganizationFragment
      ...ResourceSelector_OrganizationFragment
    }
  }
`);

export const enum CreateAccessTokenState {
  closed,
  open,
  /** show confirmation dialog to ditch draft state of new access token */
  closing,
}

export function AccessTokensSubPage(props: AccessTokensSubPageProps): React.ReactNode {
  const [query, refetchQuery] = useQuery({
    query: AccessTokensSubPage_OrganizationQuery,
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
        subPageTitle="Access Tokens"
        description={
          <div className="max-w-[800px] space-y-2">
            <CardDescription>
              Access Tokens are used for the Hive CLI, Hive Public GraphQL API and Hive Usage
              Reporting. Granular resource based access can be granted based on permissions.
            </CardDescription>
            <CardDescription>
              Here you can see, create and revoke access tokens issued within the whole organization
              (including project, personal and organization scoped) access tokens.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/access-tokens"
                className="text-neutral-10 hover:text-neutral-11"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </div>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-access-tokens">
        <Sheet
          open={createAccessTokenState !== CreateAccessTokenState.closed}
          onOpenChange={isOpen => {
            if (isOpen === false) {
              setCreateAccessTokenState(CreateAccessTokenState.closing);
              return;
            }
            setCreateAccessTokenState(CreateAccessTokenState.open);
          }}
        >
          <SheetTrigger asChild>
            <Button data-cy="organization-settings-access-tokens-create-new">
              Create new access token
            </Button>
          </SheetTrigger>
          {createAccessTokenState !== CreateAccessTokenState.closed && query.data?.organization && (
            <>
              <CreateAccessTokenSheetContent
                organization={query.data.organization}
                onSuccess={() => {
                  setCreateAccessTokenState(CreateAccessTokenState.closed);
                  refetchQuery();
                }}
              />
            </>
          )}
        </Sheet>
        {createAccessTokenState === CreateAccessTokenState.closing && (
          <DiscardAccessTokenDraft
            onContinue={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
            onDiscard={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
          />
        )}
        {query.data?.organization && (
          <AccessTokensTable
            accessTokens={query.data.organization.allAccessTokens}
            organizationSlug={props.organizationSlug}
            refetch={refetchQuery}
          />
        )}
      </div>
    </SubPageLayout>
  );
}

import { useState } from 'react';
import { useQuery } from 'urql';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { Button } from '@/components/ui/button';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { graphql } from '@/gql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { AccessTokenCreatedDialog } from '../access-tokens/access-token-created-dialog';
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
          ...PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment
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
  // See the organization sub-page: the draft resets after the close transition, and the key
  // opens its own dialog as soon as it arrives.
  const [createSession, setCreateSession] = useState(0);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const shownKey = useKeepPreviousData(createdKey ?? undefined, createdKey === null);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Personal Access Tokens"
        description={
          <>
            <p>
              Here you can manage access tokens on behalf of your users authority. You can create
              and assign access tokens with a subset of your organization membership permissions and
              resource access.
            </p>
            <p>
              Your personal access tokens are disabled once your user account looses the authority
              to issue personal access tokens.
            </p>
            <p>
              It is recommended to use personal access tokens for local development. If you are
              setting up CI or CD pipelines please instead consider using project or organization
              scoped access tokens.
            </p>
          </>
        }
        docsLink={{
          href: '/schema-registry/management/access-tokens',
          text: 'Learn more about Access Tokens',
        }}
        sideContent={
          <>
            {query.data?.organization?.me ? (
              <>
                {/* Outside the keyed sheet, so it is still there to take focus back on close. */}
                <Button
                  data-cy="organization-settings-access-tokens-create-new"
                  onClick={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
                >
                  Create new access token
                </Button>
                <CreatePersonalAccessTokenSheetContent
                  key={createSession}
                  open={createAccessTokenState !== CreateAccessTokenState.closed}
                  onOpenChange={isOpen => {
                    if (isOpen === false) {
                      setCreateAccessTokenState(CreateAccessTokenState.closing);
                      return;
                    }
                    setCreateAccessTokenState(CreateAccessTokenState.open);
                  }}
                  onOpenChangeComplete={isOpen => {
                    if (!isOpen) {
                      setCreateSession(s => s + 1);
                    }
                  }}
                  organization={query.data.organization}
                  onSuccess={privateAccessKey => {
                    setCreatedKey(privateAccessKey);
                    setCreateAccessTokenState(CreateAccessTokenState.closed);
                    refetchQuery();
                  }}
                />
              </>
            ) : (
              <Button disabled data-cy="organization-settings-access-tokens-create-new">
                Create new access token
              </Button>
            )}
            <DiscardAccessTokenDraft
              open={createAccessTokenState === CreateAccessTokenState.closing}
              onContinue={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
              onDiscard={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
            />
            <AccessTokenCreatedDialog
              open={createdKey !== null}
              privateAccessKey={shownKey ?? ''}
              onClose={() => setCreatedKey(null)}
            />
          </>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-personal-access-tokens">
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

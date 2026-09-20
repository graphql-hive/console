import { useState } from 'react';
import { useQuery } from 'urql';
import { PageLead } from '@/components/base/page-lead';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { Button } from '@/components/base/button/button';
import { SubPageLayout } from '@/components/ui/page-content-layout';
import { graphql } from '@/gql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { AccessTokenCreatedDialog } from '../../../organization/settings/access-tokens/access-token-created-dialog';
import { CreateAccessTokenState } from '../../../organization/settings/access-tokens/access-tokens-sub-page';
import { CreateProjectAccessTokenSheetContent } from './create-project-access-token-sheet-content';
import { ProjectAccessTokensTable } from './project-access-tokens-table';

const ProjectAccessTokensSubPage_OrganizationQuery = graphql(`
  query ProjectAccessTokensSubPage_OrganizationQuery(
    $organizationSlug: String!
    $projectSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        accessTokens(first: 20) {
          ...ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment
        }
        ...CreateProjectAccessTokenSheetContent_ProjectFragment
      }
      ...CreateProjectAccessTokenSheetContent_OrganizationFragment
    }
  }
`);

type PersonalAccessTokensSubPageProps = {
  organizationSlug: string;
  projectSlug: string;
};

export function ProjectAccessTokensSubPage(
  props: PersonalAccessTokensSubPageProps,
): React.ReactNode {
  const [query, refetchQuery] = useQuery({
    query: ProjectAccessTokensSubPage_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
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
      <PageLead
        title="Project Access Tokens"
        description="These are the access tokens created for this project. Members with permissions can manage and issues access tokens for CI/CD integrations with the CLI or local development."
        docsLink={{
          href: '/schema-registry/management/access-tokens',
          text: 'Learn more about Access Tokens',
        }}
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-personal-access-tokens">
        {query.data?.organization?.project ? (
          <>
            {/* Outside the keyed sheet, so it is still there to take focus back on close. */}
            <Button
              data-cy="organization-settings-access-tokens-create-new"
              onClick={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
            >
              Create new access token
            </Button>
            <CreateProjectAccessTokenSheetContent
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
              project={query.data.organization.project}
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

        {query.data?.organization?.project?.accessTokens && (
          <ProjectAccessTokensTable
            accessTokens={query.data.organization.project.accessTokens}
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            refetch={refetchQuery}
          />
        )}
      </div>
    </SubPageLayout>
  );
}

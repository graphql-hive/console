import { useState } from 'react';
import { useQuery } from 'urql';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { graphql } from '@/gql';
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

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Access Tokens"
        description={
          <>
            <CardDescription>
              These are the access tokens created for this project. Members with permissions can
              manage and issues access tokens for CI/CD integrations with the CLI or local
              development.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/access-tokens"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-personal-access-tokens">
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
          {createAccessTokenState !== CreateAccessTokenState.closed &&
            query.data?.organization?.project && (
              <CreateProjectAccessTokenSheetContent
                organization={query.data.organization}
                project={query.data.organization.project}
                onSuccess={() => {
                  setCreateAccessTokenState(CreateAccessTokenState.closed);
                  refetchQuery();
                }}
              />
            )}
        </Sheet>
        {createAccessTokenState === CreateAccessTokenState.closing && (
          <DiscardAccessTokenDraft
            continueFn={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
            discardFn={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
          />
        )}
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

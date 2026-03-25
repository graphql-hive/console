import { useQuery } from 'urql';
import { TokenExpiration } from '@/components/organization/settings/access-tokens/token-expiration';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { PermissionDetailView } from '../../../organization/settings/access-tokens/permission-detail-view';

const ProjectAccessTokenDetailViewSheet_OrganizationQuery = graphql(`
  query ProjectAccessTokenDetailViewSheet_OrganizationQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $accessTokenId: ID!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        accessToken(id: $accessTokenId) {
          id
          title
          description
          resolvedResourcePermissionGroups(includeAll: true) {
            title
            ...PermissionDetailView_ResolvedResourcePermissionGroup
          }
          expiresAt
        }
      }
    }
  }
`);

type ProjectAccessTokenDetailViewSheetProps = {
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  accessTokenId: string;
};

export function ProjectAccessTokenDetailViewSheet(props: ProjectAccessTokenDetailViewSheetProps) {
  const [query] = useQuery({
    query: ProjectAccessTokenDetailViewSheet_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      accessTokenId: props.accessTokenId,
    },
  });
  const accessToken = query.data?.organization?.project?.accessToken;

  return (
    <Sheet.Sheet open onOpenChange={props.onClose}>
      <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <Sheet.SheetHeader>
          <Sheet.SheetTitle>Access Token: {accessToken?.title}</Sheet.SheetTitle>
          <Sheet.SheetDescription>
            <div>{accessToken?.description}</div>
            <div>
              <span className="font-medium">Expires:</span>{' '}
              <TokenExpiration expiresAt={accessToken?.expiresAt ?? null} />
            </div>
          </Sheet.SheetDescription>
        </Sheet.SheetHeader>
        {query.data?.organization?.project?.accessToken?.resolvedResourcePermissionGroups.map(
          resolvedResourcePermissionGroup => (
            <PermissionDetailView
              resolvedResourcePermissionGroup={resolvedResourcePermissionGroup}
              key={resolvedResourcePermissionGroup.title}
            />
          ),
        )}
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

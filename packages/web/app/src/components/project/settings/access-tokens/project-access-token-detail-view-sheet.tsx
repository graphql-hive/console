import { useQuery } from 'urql';
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
            ...PermissionDetailView_ResolvedResourcePermissionGroup
          }
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

  return (
    <Sheet.Sheet open onOpenChange={props.onClose}>
      <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <Sheet.SheetHeader>
          <Sheet.SheetTitle>
            Access Token: {query.data?.organization?.project?.accessToken?.title}
          </Sheet.SheetTitle>
          <Sheet.SheetDescription>
            {query.data?.organization?.project?.accessToken?.description}
          </Sheet.SheetDescription>
        </Sheet.SheetHeader>
        {query.data?.organization?.project?.accessToken?.resolvedResourcePermissionGroups.map(
          resolvedResourcePermissionGroup => (
            <PermissionDetailView
              resolvedResourcePermissionGroup={resolvedResourcePermissionGroup}
            />
          ),
        )}
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

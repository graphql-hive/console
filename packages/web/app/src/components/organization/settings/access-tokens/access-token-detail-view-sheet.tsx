import { useQuery } from 'urql';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { PermissionDetailView } from './permission-detail-view';

const AccessTokenDetailViewSheet_OrganizationQuery = graphql(`
  query AccessTokenDetailViewSheet_OrganizationQuery(
    $organizationSlug: String!
    $organizationAccessTokenId: ID!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      accessToken(id: $organizationAccessTokenId) {
        id
        title
        description
        resolvedResourcePermissionGroups(includeAll: true) {
          ...PermissionDetailView_ResolvedResourcePermissionGroup
        }
      }
      availableOrganizationAccessTokenPermissionGroups {
        ...SelectedPermissionOverview_PermissionGroupFragment
      }
    }
  }
`);

type AccessTokenDetailViewSheetProps = {
  onClose: () => void;
  organizationSlug: string;
  accessTokenId: string;
};

export function AccessTokenDetailViewSheet(props: AccessTokenDetailViewSheetProps) {
  const [query] = useQuery({
    query: AccessTokenDetailViewSheet_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      organizationAccessTokenId: props.accessTokenId,
    },
  });

  return (
    <Sheet.Sheet open onOpenChange={props.onClose}>
      <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <Sheet.SheetHeader>
          <Sheet.SheetTitle>
            Access Token: {query.data?.organization?.accessToken?.title}
          </Sheet.SheetTitle>
          <Sheet.SheetDescription>
            {query.data?.organization?.accessToken?.description}
          </Sheet.SheetDescription>
        </Sheet.SheetHeader>
        {query.data?.organization?.accessToken?.resolvedResourcePermissionGroups.map(
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

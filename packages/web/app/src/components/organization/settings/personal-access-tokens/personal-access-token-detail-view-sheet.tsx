import { useQuery } from 'urql';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { PermissionDetailView } from './../access-tokens/permission-detail-view';

const PersonalAccessTokenDetailViewSheet_OrganizationQuery = graphql(`
  query PersonalAccessTokenDetailViewSheet_OrganizationQuery(
    $organizationSlug: String!
    $organizationAccessTokenId: ID!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      me {
        id
        accessToken(id: $organizationAccessTokenId) {
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

type PersonalAccessTokenDetailViewSheetProps = {
  onClose: () => void;
  organizationSlug: string;
  accessTokenId: string;
};

export function PersonalAccessTokenDetailViewSheet(props: PersonalAccessTokenDetailViewSheetProps) {
  const [query] = useQuery({
    query: PersonalAccessTokenDetailViewSheet_OrganizationQuery,
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
            Access Token: {query.data?.organization?.me?.accessToken?.title}
          </Sheet.SheetTitle>
          <Sheet.SheetDescription>
            {query.data?.organization?.me?.accessToken?.description}
          </Sheet.SheetDescription>
        </Sheet.SheetHeader>
        {query.data?.organization?.me?.accessToken?.resolvedResourcePermissionGroups.map(
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

import { useQuery } from 'urql';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { PermissionDetailView } from './permission-detail-view';
import { TokenExpiration } from './token-expiration';

const AccessTokenDetailViewSheet_OrganizationQuery = graphql(`
  query AccessTokenDetailViewSheet_OrganizationQuery(
    $organizationSlug: String!
    $accessTokenId: ID!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      accessToken: accessTokenById(id: $accessTokenId) {
        id
        title
        description
        expiresAt
        resolvedResourcePermissionGroups(includeAll: true) {
          title
          ...PermissionDetailView_ResolvedResourcePermissionGroup
        }
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
      accessTokenId: props.accessTokenId,
    },
  });

  const accessToken = query.data?.organization?.accessToken;

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
        {query.data?.organization?.accessToken?.resolvedResourcePermissionGroups.map(
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

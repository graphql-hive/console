import { useQuery } from 'urql';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { PermissionDetailView } from '../access-tokens/permission-detail-view';
import { TokenExpiration } from '../access-tokens/token-expiration';

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
          expiresAt
          resolvedResourcePermissionGroups(includeAll: true) {
            title
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

  const accessToken = query.data?.organization?.me?.accessToken;

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
        {accessToken?.resolvedResourcePermissionGroups.map(resolvedResourcePermissionGroup => (
          <PermissionDetailView
            resolvedResourcePermissionGroup={resolvedResourcePermissionGroup}
            key={resolvedResourcePermissionGroup.title}
          />
        ))}
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

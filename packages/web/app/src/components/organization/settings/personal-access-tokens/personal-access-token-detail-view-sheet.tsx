import { useQuery } from 'urql';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { graphql } from '@/gql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
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
  open: boolean;
  onClose: () => void;
  organizationSlug: string;
  /** Null while closed; the sheet keeps the last token through its exit transition. */
  accessTokenId: string | null;
};

export function PersonalAccessTokenDetailViewSheet(props: PersonalAccessTokenDetailViewSheetProps) {
  const accessTokenId = useKeepPreviousData(
    props.accessTokenId ?? undefined,
    props.accessTokenId === null,
  );
  const [query] = useQuery({
    query: PersonalAccessTokenDetailViewSheet_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      organizationAccessTokenId: accessTokenId ?? '',
    },
    pause: !accessTokenId,
  });

  const accessToken = query.data?.organization?.me?.accessToken;

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onClose}
      title={`Access Token: ${accessToken?.title ?? ''}`}
      description={
        <>
          {accessToken?.description}
          <br />
          <span className="font-medium">Expires:</span>{' '}
          <TokenExpiration expiresAt={accessToken?.expiresAt ?? null} />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {accessToken?.resolvedResourcePermissionGroups.map(resolvedResourcePermissionGroup => (
          <PermissionDetailView
            resolvedResourcePermissionGroup={resolvedResourcePermissionGroup}
            key={resolvedResourcePermissionGroup.title}
          />
        ))}
      </div>
    </Sheet>
  );
}

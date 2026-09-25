import { useQuery } from 'urql';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
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
  open: boolean;
  onClose: () => void;
  /** Null while closed; the sheet keeps the last token through its exit transition. */
  accessTokenId: string | null;
};

export function AccessTokenDetailViewSheet(props: AccessTokenDetailViewSheetProps) {
  const { organizationSlug } = useSlugs('organization');
  const accessTokenId = useKeepPreviousData(
    props.accessTokenId ?? undefined,
    props.accessTokenId === null,
  );
  const [query] = useQuery({
    query: AccessTokenDetailViewSheet_OrganizationQuery,
    variables: {
      organizationSlug,
      accessTokenId: accessTokenId ?? '',
    },
    pause: !accessTokenId,
  });

  const accessToken = query.data?.organization?.accessToken;

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

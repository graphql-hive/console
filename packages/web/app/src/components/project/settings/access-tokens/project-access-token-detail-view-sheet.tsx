import { useQuery } from 'urql';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { TokenExpiration } from '@/components/organization/settings/access-tokens/token-expiration';
import { graphql } from '@/gql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
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
  open: boolean;
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  /** Null while closed; the sheet keeps the last token through its exit transition. */
  accessTokenId: string | null;
};

export function ProjectAccessTokenDetailViewSheet(props: ProjectAccessTokenDetailViewSheetProps) {
  const accessTokenId = useKeepPreviousData(
    props.accessTokenId ?? undefined,
    props.accessTokenId === null,
  );
  const [query] = useQuery({
    query: ProjectAccessTokenDetailViewSheet_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      accessTokenId: accessTokenId ?? '',
    },
    pause: !accessTokenId,
  });
  const accessToken = query.data?.organization?.project?.accessToken;

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

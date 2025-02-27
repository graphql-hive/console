import { useQuery } from 'urql';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { SelectedPermissionOverview } from '../../members/selected-permission-overview';

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
        permissions
      }
      availableOrganizationPermissionGroups {
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
        {query.data?.organization?.accessToken && (
          <SelectedPermissionOverview
            activePermissionIds={query.data?.organization?.accessToken?.permissions ?? []}
            permissionsGroups={
              query.data?.organization?.availableOrganizationPermissionGroups ?? []
            }
            showOnlyAllowedPermissions={false}
            isExpanded
            // additionalGroupContent={group => (
            //   <div className="w-full space-y-1">
            //     {resolvedResources === null ? (
            //       <>Granted on all {permissionLevelToResourceName(group.level)}</>
            //     ) : (
            //       <>
            //         <p className="text-gray-400">
            //           Granted on {permissionLevelToResourceName(group.level)}:
            //         </p>
            //         <ul className="flex list-none flex-wrap gap-1">
            //           {resolvedResources[group.level].map(id => (
            //             <li key={id}>
            //               <Badge
            //                 className="px-3 py-1 font-mono text-xs text-gray-300"
            //                 variant="outline"
            //               >
            //                 {id}
            //               </Badge>
            //             </li>
            //           ))}
            //         </ul>
            //       </>
            //     )}
            //   </div>
            // )}
          />
        )}
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

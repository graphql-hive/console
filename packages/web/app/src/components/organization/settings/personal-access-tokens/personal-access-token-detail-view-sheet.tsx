import { useMemo } from 'react';
import { useQuery } from 'urql';
import { Badge } from '@/components/ui/badge';
import * as Sheet from '@/components/ui/sheet';
import { DocumentType, graphql } from '@/gql';
import { ResourceSelection } from '../../members/resource-selector';
import { SelectedPermissionOverview } from '../../members/selected-permission-overview';
import { toResourceSelection } from '../access-tokens/access-token-detail-view-sheet';
import { permissionLevelToResourceName, resolveResources } from '../access-tokens/shared-helpers';

const AccessTokenDetailViewSheet_AccessTokenFragment = graphql(`
  fragment AccessTokenDetailViewSheet_AccessTokenFragment on AccessToken {
    id
    title
    description
    permissions
    resources {
      mode
      projects {
        project {
          id
          slug
        }
        targets {
          mode
          targets {
            target {
              id
              slug
            }
            services {
              mode
              services
            }
            appDeployments {
              mode
              appDeployments
            }
          }
        }
      }
    }
  }
`);

const PersonalAccessTokenDetailViewSheet_OrganizationQuery = graphql(`
  query PersonalAccessTokenDetailViewSheet_OrganizationQuery(
    $organizationSlug: String!
    $personalAccessTokenId: ID!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      me {
        id
        personalAccessToken(id: $personalAccessTokenId) {
          id
          title
          description
          permissions
          resources {
            mode
            projects {
              project {
                id
                slug
              }
              targets {
                mode
                targets {
                  target {
                    id
                    slug
                  }
                  services {
                    mode
                    services
                  }
                  appDeployments {
                    mode
                    appDeployments
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

type PersonalAccessTokenDetailViewSheetProps = {
  onClose: () => void;
  organizationSlug: string;
  personalAccessTokenId: string;
};

export function PersonalAccessTokenDetailViewSheet(props: PersonalAccessTokenDetailViewSheetProps) {
  const [query] = useQuery({
    query: PersonalAccessTokenDetailViewSheet_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      personalAccessTokenId: props.personalAccessTokenId,
    },
  });

  const resolvedResources = useMemo(() => {
    if (!query.data?.organization?.me.personalAccessToken) {
      return null;
    }
    return resolveResources(
      props.organizationSlug,
      toResourceSelection(query.data.organization.me.personalAccessToken.resources),
    );
  }, [query.data?.organization?.me.personalAccessToken]);

  const me = query.data?.organization?.me;

  return (
    <Sheet.Sheet open onOpenChange={props.onClose}>
      <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <Sheet.SheetHeader>
          <Sheet.SheetTitle>Access Token: {me?.personalAccessToken?.title}</Sheet.SheetTitle>
          <Sheet.SheetDescription>{me?.personalAccessToken?.description}</Sheet.SheetDescription>
        </Sheet.SheetHeader>
        {me?.personalAccessToken && (
          <SelectedPermissionOverview
            activePermissionIds={me.personalAccessToken.permissions ?? []}
            isAllPermissionsGranted={me.personalAccessToken.permissions  === null}
            permissionsGroups={me.availablePersonalAccessTokenPermissionGroups ?? []}
            showOnlyAllowedPermissions={false}
            isExpanded
            additionalGroupContent={group => (
              <div className="w-full space-y-1">
                {resolvedResources === null ? (
                  <p className="text-gray-400">
                    Granted on all {permissionLevelToResourceName(group.level)}
                  </p>
                ) : (
                  <>
                    <p className="text-gray-400">
                      Granted on {permissionLevelToResourceName(group.level)}:
                    </p>
                    <ul className="flex list-none flex-wrap gap-1">
                      {resolvedResources[group.level].map(id => (
                        <li key={id}>
                          <Badge
                            className="px-3 py-1 font-mono text-xs text-gray-300"
                            variant="outline"
                          >
                            {id}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          />
        )}
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

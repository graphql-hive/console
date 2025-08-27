import { useMemo } from 'react';
import { useQuery } from 'urql';
import { Badge } from '@/components/ui/badge';
import * as Sheet from '@/components/ui/sheet';
import { DocumentType, graphql } from '@/gql';
import { ResourceSelection } from '../../members/resource-selector';
import { SelectedPermissionOverview } from '../../members/selected-permission-overview';
import { permissionLevelToResourceName, resolveResources } from './shared-helpers';

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

  const resolvedResources = useMemo(() => {
    if (!query.data?.organization?.accessToken) {
      return null;
    }
    return resolveResources(
      props.organizationSlug,
      toResourceSelection(query.data.organization.accessToken.resources),
    );
  }, [query.data?.organization?.accessToken]);

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
              query.data?.organization?.availableOrganizationAccessTokenPermissionGroups ?? []
            }
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

type Some<T> = Exclude<T, null | undefined>;

type AccessTokenResources = Some<
  Some<
    DocumentType<typeof AccessTokenDetailViewSheet_OrganizationQuery>['organization']
  >['accessToken']
>['resources'];

/**
 * Converts {ResourceAssignment} to {ResourceSelection}.
 */
function toResourceSelection(resources: AccessTokenResources): ResourceSelection {
  return {
    mode: resources.mode,
    projects:
      resources.projects?.map(project => ({
        projectId: project.project.id,
        projectSlug: project.project.slug,
        targets: {
          mode: project.targets.mode,
          targets:
            project.targets.targets?.map(target => ({
              targetId: target.target.id,
              targetSlug: target.target.slug,
              services: {
                mode: target.services.mode,
                services: target.services.services?.map(serviceName => ({ serviceName })) ?? [],
              },
              appDeployments: {
                mode: target.appDeployments.mode,
                appDeployments:
                  target.appDeployments.appDeployments?.map(appDeployment => ({ appDeployment })) ??
                  [],
              },
            })) ?? [],
        },
      })) ?? [],
  };
}

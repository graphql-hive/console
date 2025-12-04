import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import { BreadcrumbSeparator, EntitySelector, LoadingSkeleton } from './entity-selector';

const HierarchicalSelector_OrganizationConnectionFragment = graphql(`
  fragment HierarchicalSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
      projects {
        edges {
          node {
            id
            slug
            targets {
              edges {
                node {
                  id
                  slug
                }
              }
            }
          }
        }
      }
    }
  }
`);

interface HierarchicalSelectorProps {
  // Required
  currentOrganizationSlug: string;
  organizations: FragmentType<typeof HierarchicalSelector_OrganizationConnectionFragment> | null;

  // Optional - component detects and renders based on presence
  currentProjectSlug?: string;
  currentTargetSlug?: string;

  // Special case
  isOIDCUser?: boolean;
}

export function HierarchicalSelector(props: HierarchicalSelectorProps) {
  const router = useRouter();
  const organizations = useFragment(
    HierarchicalSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrg = organizations?.find(n => n.slug === props.currentOrganizationSlug);
  const projectEdges = currentOrg?.projects?.edges;
  const currentProject = projectEdges?.find(e => e.node.slug === props.currentProjectSlug)?.node;
  const targetEdges = currentProject?.targets?.edges;
  const currentTarget = targetEdges?.find(e => e.node.slug === props.currentTargetSlug)?.node;

  // Determine which level we're on to know what should be a select vs link
  const hasProject = !!props.currentProjectSlug;
  const hasTarget = !!props.currentTargetSlug;

  return (
    <>
      {/* Level 1: Organization */}
      {!organizations ? (
        <LoadingSkeleton />
      ) : hasProject || hasTarget || props.isOIDCUser ? (
        // Show as link when on project/target route, or when OIDC user
        <EntitySelector
          mode="link"
          linkTo="/$organizationSlug"
          linkParams={{ organizationSlug: props.currentOrganizationSlug }}
          currentSlug={props.currentOrganizationSlug}
          currentItem={currentOrg}
          items={organizations}
          onNavigate={() => {}}
          dataCyPrefix="organization"
        />
      ) : (
        // Show as select only when on organization route and not OIDC
        <EntitySelector
          mode="select"
          currentSlug={props.currentOrganizationSlug}
          currentItem={currentOrg}
          items={organizations}
          onNavigate={slug => {
            void router.navigate({ to: '/$organizationSlug', params: { organizationSlug: slug } });
          }}
          dataCyPrefix="organization"
        />
      )}

      {/* Level 2: Project (only if projectSlug provided) */}
      {props.currentProjectSlug && (
        <>
          <BreadcrumbSeparator />
          {!currentOrg ? (
            <LoadingSkeleton />
          ) : projectEdges?.length && currentProject ? (
            <EntitySelector
              mode={hasTarget ? 'link' : 'select'}
              linkTo={hasTarget ? '/$organizationSlug/$projectSlug' : undefined}
              linkParams={
                hasTarget
                  ? {
                      organizationSlug: props.currentOrganizationSlug,
                      projectSlug: props.currentProjectSlug,
                    }
                  : undefined
              }
              currentSlug={props.currentProjectSlug}
              currentItem={currentProject}
              items={projectEdges.map(e => e.node)}
              onNavigate={slug => {
                void router.navigate({
                  to: '/$organizationSlug/$projectSlug',
                  params: {
                    organizationSlug: props.currentOrganizationSlug,
                    projectSlug: slug,
                  },
                });
              }}
              dataCyPrefix="project"
            />
          ) : (
            <LoadingSkeleton />
          )}
        </>
      )}

      {/* Level 3: Target (only if targetSlug provided) */}
      {props.currentTargetSlug && (
        <>
          <BreadcrumbSeparator />
          {!currentProject ? (
            <LoadingSkeleton />
          ) : targetEdges?.length && currentTarget ? (
            <EntitySelector
              mode="select"
              currentSlug={props.currentTargetSlug}
              currentItem={currentTarget}
              items={targetEdges.map(e => e.node)}
              onNavigate={slug => {
                void router.navigate({ params: { targetSlug: slug } });
              }}
              dataCyPrefix="target"
            />
          ) : (
            <LoadingSkeleton />
          )}
        </>
      )}
    </>
  );
}

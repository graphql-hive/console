import { useMemo, useState } from 'react';
import { produce } from 'immer';
import { ChevronRightIcon, XIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { ArrowDownIcon } from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/v2';
import { graphql, useFragment, type FragmentType } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { cn } from '@/lib/utils';

const ResourceSelector_OrganizationFragment = graphql(`
  fragment ResourceSelector_OrganizationFragment on Organization {
    id
    slug
    projects {
      edges {
        node {
          id
          slug
          type
        }
      }
    }
    isAppDeploymentsEnabled
  }
`);

const ResourceSelector_OrganizationProjectTargestQuery = graphql(`
  query ResourceSelector_OrganizationProjectTargestQuery(
    $organizationSlug: String!
    $projectSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        type
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
`);

const ResourceSelector_OrganizationProjectTargetQuery = graphql(`
  query ResourceSelector_OrganizationProjectTargetQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        type
        targets {
          edges {
            node {
              id
              slug
            }
          }
        }
        target: targetBySlug(targetSlug: $targetSlug) {
          id
          latestValidSchemaVersion {
            id
            schemas {
              edges {
                node {
                  ... on CompositeSchema {
                    id
                    service
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

/**
 * This is the `GraphQLSchema.ResourceAssignmentInput` type, but with the slug values for projects and targets included.
 */
export type ResourceSelection = Omit<GraphQLSchema.ResourceAssignmentInput, 'projects'> & {
  projects: Array<
    Omit<GraphQLSchema.ProjectResourceAssignmentInput, 'targets'> & {
      projectSlug: string;
      targets: Omit<GraphQLSchema.ProjectTargetsResourceAssignmentInput, 'targets'> & {
        targets: Array<
          GraphQLSchema.TargetResourceAssignmentInput & {
            targetSlug: string;
          }
        >;
      };
    }
  >;
};

/**
 * Converts `ResourceSelection` to `GraphQLSchema.ResourceAssignmentInput` for sending to the GraphQL API.
 * `ResourceSelection` contains fields such as `projectSlug` and `targetSlug`, which are not within the `GraphQLSchema.ResourceAssignmentInput`
 * type, but TypeScript does not catch sending these properties to the API...
 */
export function resourceSlectionToGraphQLSchemaResourceAssignmentInput(
  input: ResourceSelection,
): GraphQLSchema.ResourceAssignmentInput {
  return {
    mode: input.mode,
    projects: input.projects.map(project => ({
      projectId: project.projectId,
      targets: {
        mode: project.targets.mode,
        targets: project.targets.targets.map(target => ({
          targetId: target.targetId,
          services: target.services,
          appDeployments: target.appDeployments,
        })),
      },
    })),
  };
}

const enum ServicesAppsState {
  service,
  apps,
}

export function ResourceSelector(props: {
  organization: FragmentType<typeof ResourceSelector_OrganizationFragment>;
  selection: ResourceSelection;
  onSelectionChange: (selection: ResourceSelection) => void;
}) {
  const organization = useFragment(ResourceSelector_OrganizationFragment, props.organization);
  const [breadcrumb, setBreadcrumb] = useState(
    null as
      | null
      | { projectId: string; targetId?: undefined }
      | { projectId: string; targetId: string },
  );
  // whether we show the service or apps in the last tab
  const [serviceAppsState, setServiceAppsState] = useState(ServicesAppsState.service);

  const toggleServiceAppsState = () => {
    const state =
      serviceAppsState === ServicesAppsState.apps
        ? ServicesAppsState.service
        : ServicesAppsState.apps;
    setServiceAppsState(state);
  };

  const projectState = useMemo(() => {
    if (props.selection.mode === GraphQLSchema.ResourceAssignmentModeType.All) {
      return null;
    }

    type SelectedItem = {
      project: (typeof organization.projects.edges)[number]['node'];
      projectSelection: GraphQLSchema.ProjectResourceAssignmentInput;
    };

    type NotSelectedItem = (typeof organization.projects.edges)[number]['node'];

    const selectedProjects: Array<SelectedItem> = [];
    const notSelectedProjects: Array<NotSelectedItem> = [];

    let activeProject: null | SelectedItem = null;

    for (const edge of organization.projects.edges) {
      const projectSelection = props.selection.projects?.find(
        item => item.projectId === edge.node.id,
      );

      if (projectSelection) {
        selectedProjects.push({ project: edge.node, projectSelection });

        if (breadcrumb?.projectId === edge.node.id) {
          activeProject = { project: edge.node, projectSelection };
        }

        continue;
      }

      notSelectedProjects.push(edge.node);
    }

    return {
      selected: selectedProjects,
      notSelected: notSelectedProjects,
      activeProject,
      addProject(item: (typeof organization.projects.edges)[number]['node']) {
        props.onSelectionChange(
          produce(props.selection, state => {
            state.projects?.push({
              projectId: item.id,
              projectSlug: item.slug,
              targets: {
                mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
                targets: [],
              },
            });
            setBreadcrumb({ projectId: item.id });
          }),
        );
      },
      removeProject(item: (typeof organization.projects.edges)[number]['node']) {
        props.onSelectionChange(
          produce(props.selection, state => {
            state.projects = state.projects?.filter(project => project.projectId !== item.id);
          }),
        );
        setBreadcrumb(breadcrumb => {
          if (breadcrumb?.projectId === item.id) {
            return null;
          }
          return breadcrumb;
        });
      },
    };
  }, [organization.projects.edges, props.selection, breadcrumb?.projectId]);

  const [organizationProjectTargets] = useQuery({
    query: ResourceSelector_OrganizationProjectTargestQuery,
    pause: !projectState?.activeProject,
    variables: {
      organizationSlug: organization.slug,
      projectSlug: projectState?.activeProject?.project.slug ?? '',
    },
  });

  const targetState = useMemo(() => {
    if (
      !organizationProjectTargets?.data?.organization?.project?.targets?.edges ||
      !projectState?.activeProject
    ) {
      return null;
    }

    const projectId = projectState.activeProject.project.id;
    const projectType = projectState.activeProject.project.type;

    if (
      projectState.activeProject.projectSelection.targets.mode ===
      GraphQLSchema.ResourceAssignmentModeType.All
    ) {
      return {
        selection: '*',
        setGranular() {
          props.onSelectionChange(
            produce(props.selection, state => {
              const project = state.projects?.find(project => project.projectId === projectId);
              if (!project) return;
              project.targets.mode = GraphQLSchema.ResourceAssignmentModeType.Granular;
            }),
          );
        },
      } as const;
    }

    type SelectedItem = {
      target: (typeof organizationProjectTargets.data.organization.project.targets.edges)[number]['node'];
      targetSelection: Exclude<
        typeof projectState.activeProject.projectSelection.targets.targets,
        null | undefined
      >[number];
    };

    type NotSelectedItem =
      (typeof organizationProjectTargets.data.organization.project.targets.edges)[number]['node'];

    const selected: Array<SelectedItem> = [];
    const notSelected: Array<NotSelectedItem> = [];

    let activeTarget: null | {
      targetSelection: Exclude<
        typeof projectState.activeProject.projectSelection.targets.targets,
        null | undefined
      >[number];
      target: (typeof organizationProjectTargets.data.organization.project.targets.edges)[number]['node'];
    } = null;

    for (const edge of organizationProjectTargets.data.organization.project.targets.edges) {
      const targetSelection = projectState.activeProject.projectSelection.targets.targets?.find(
        item => item.targetId === edge.node.id,
      );

      if (targetSelection) {
        selected.push({ target: edge.node, targetSelection });

        if (breadcrumb?.targetId === edge.node.id) {
          activeTarget = {
            targetSelection,
            target: edge.node,
          };
        }
        continue;
      }

      notSelected.push(edge.node);
    }

    return {
      selection: {
        selected,
        notSelected,
      },
      activeTarget,
      activeProject: projectState.activeProject,
      addTarget(
        item: (typeof organizationProjectTargets.data.organization.project.targets.edges)[number]['node'],
      ) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects.find(project => project.projectId === projectId);
            if (!project) return;
            project.targets.targets.push({
              targetId: item.id,
              targetSlug: item.slug,
              appDeployments: {
                mode: GraphQLSchema.ResourceAssignmentModeType.All,
                appDeployments: [],
              },
              services: {
                mode:
                  // for single projects we choose "All" by default as there is no granular selection available
                  projectType === GraphQLSchema.ProjectType.Single
                    ? GraphQLSchema.ResourceAssignmentModeType.All
                    : GraphQLSchema.ResourceAssignmentModeType.Granular,
                services: [],
              },
            });
            setBreadcrumb({ projectId: project.projectId, targetId: item.id });
          }),
        );
      },
      removeTarget(
        item: (typeof organizationProjectTargets.data.organization.project.targets.edges)[number]['node'],
      ) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            project.targets.targets = project.targets.targets?.filter(
              target => target.targetId !== item.id,
            );
          }),
        );
        setBreadcrumb(breadcrumb => {
          if (breadcrumb?.targetId === item.id) {
            return {
              ...breadcrumb,
              targetId: undefined,
            };
          }
          return breadcrumb;
        });
      },
      setAll() {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            project.targets.mode = GraphQLSchema.ResourceAssignmentModeType.All;
          }),
        );
        setBreadcrumb({ projectId });
      },
    };
  }, [
    projectState?.activeProject,
    organizationProjectTargets?.data?.organization?.project?.targets?.edges,
    breadcrumb?.targetId,
  ]);

  const [organizationProjectTarget] = useQuery({
    query: ResourceSelector_OrganizationProjectTargetQuery,
    pause: !targetState?.activeTarget || !projectState?.activeProject,
    variables: {
      organizationSlug: organization.slug,
      projectSlug: projectState?.activeProject?.project.slug ?? '',
      targetSlug: targetState?.activeTarget?.target?.slug ?? '',
    },
  });

  const serviceState = useMemo(() => {
    if (
      !projectState?.activeProject ||
      !targetState?.activeTarget ||
      !breadcrumb?.targetId ||
      !organizationProjectTarget.data?.organization?.project
    ) {
      return null;
    }

    if (
      organizationProjectTarget.data.organization.project.type === GraphQLSchema.ProjectType.Single
    ) {
      return 'none' as const;
    }

    const projectId = projectState.activeProject.projectSelection.projectId;
    const targetId = targetState.activeTarget.targetSelection.targetId;

    if (
      targetState.activeTarget.targetSelection.services.mode ===
      GraphQLSchema.ResourceAssignmentModeType.All
    ) {
      return {
        selection: '*' as const,
        setGranular() {
          props.onSelectionChange(
            produce(props.selection, state => {
              const project = state.projects?.find(project => project.projectId === projectId);
              if (!project) return;
              const target = project.targets.targets?.find(target => target.targetId === targetId);
              if (!target) return;
              target.services.mode = GraphQLSchema.ResourceAssignmentModeType.Granular;
            }),
          );
        },
      };
    }

    const selectedServices: GraphQLSchema.ServiceResourceAssignmentInput[] = [
      ...(targetState.activeTarget.targetSelection.services.services ?? []),
    ];
    const notSelectedServices: Array<string> = [];

    if (
      organizationProjectTarget.data.organization.project.target?.latestValidSchemaVersion?.schemas
    ) {
      for (const edge of organizationProjectTarget.data.organization.project.target
        .latestValidSchemaVersion.schemas.edges) {
        const schema = edge.node;
        if (
          schema.__typename === 'CompositeSchema' &&
          schema.service &&
          !selectedServices.find(service => service.serviceName === schema.service)
        ) {
          notSelectedServices.push(schema.service);
        }
      }
    }

    return {
      selection: {
        selected: selectedServices,
        notSelected: notSelectedServices,
      },
      setAll() {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            const target = project.targets.targets?.find(target => target.targetId === targetId);

            if (!target) return;
            target.services.mode = GraphQLSchema.ResourceAssignmentModeType.All;
          }),
        );
      },
      addService(serviceName: string) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            const target = project.targets.targets?.find(target => target.targetId === targetId);
            if (
              !target ||
              target.services.services?.find(service => service.serviceName === serviceName)
            ) {
              return;
            }

            target.services.services?.push({
              serviceName,
            });
          }),
        );
      },
      removeService(serviceName: string) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            const target = project.targets.targets?.find(target => target.targetId === targetId);
            if (!target) {
              return;
            }
            target.services.services = target.services.services?.filter(
              service => service.serviceName !== serviceName,
            );
          }),
        );
      },
    };
  }, [targetState?.activeTarget, breadcrumb, projectState?.activeProject, props.selection]);

  const appsState = useMemo(() => {
    if (
      !projectState?.activeProject ||
      !targetState?.activeTarget ||
      !breadcrumb?.targetId ||
      !organization.isAppDeploymentsEnabled
    ) {
      return null;
    }

    const projectId = projectState.activeProject.projectSelection.projectId;
    const targetId = targetState.activeTarget.targetSelection.targetId;

    if (
      targetState.activeTarget.targetSelection.appDeployments.mode ===
      GraphQLSchema.ResourceAssignmentModeType.All
    ) {
      return {
        selection: '*' as const,
        setGranular() {
          props.onSelectionChange(
            produce(props.selection, state => {
              const project = state.projects?.find(project => project.projectId === projectId);
              if (!project) return;
              const target = project.targets.targets?.find(target => target.targetId === targetId);
              if (!target) return;
              target.appDeployments.mode = GraphQLSchema.ResourceAssignmentModeType.Granular;
            }),
          );
        },
      };
    }

    const selectedApps: GraphQLSchema.AppDeploymentResourceAssignmentInput[] = [
      ...(targetState.activeTarget.targetSelection.appDeployments.appDeployments ?? []),
    ];
    // TODO: populate this with service state
    const notSelectedApps: Array<string> = [];

    return {
      selection: {
        selected: selectedApps,
        notSelected: notSelectedApps,
      },
      setAll() {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            const target = project.targets.targets?.find(target => target.targetId === targetId);

            if (!target) return;
            target.appDeployments.mode = GraphQLSchema.ResourceAssignmentModeType.All;
          }),
        );
      },
      addApp(appName: string) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            const target = project.targets.targets?.find(target => target.targetId === targetId);
            if (
              !target ||
              target.appDeployments.appDeployments?.find(
                appDeployment => appDeployment.appDeployment === appName,
              )
            ) {
              return;
            }

            target.appDeployments.appDeployments?.push({
              appDeployment: appName,
            });
          }),
        );
      },
      removeApp(appName: string) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            const target = project.targets.targets?.find(target => target.targetId === targetId);
            if (!target) {
              return;
            }
            target.appDeployments.appDeployments = target.appDeployments.appDeployments?.filter(
              appDeployment => appDeployment.appDeployment !== appName,
            );
          }),
        );
      },
    };
  }, [
    projectState?.activeProject,
    targetState?.activeTarget,
    breadcrumb?.targetId,
    props.selection,
    props.onSelectionChange,
  ]);

  return (
    <Tabs
      defaultValue="granular"
      value={
        props.selection.mode === GraphQLSchema.ResourceAssignmentModeType.All ? 'full' : 'granular'
      }
    >
      <TabsList variant="content" className="mt-1">
        <TabsTrigger
          variant="content"
          value="full"
          onClick={() => {
            props.onSelectionChange({
              ...props.selection,
              mode: GraphQLSchema.ResourceAssignmentModeType.All,
            });
            setBreadcrumb(null);
          }}
        >
          Full Access
        </TabsTrigger>
        <TabsTrigger
          variant="content"
          value="granular"
          onClick={() => {
            props.onSelectionChange({
              ...props.selection,
              mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
            });
          }}
        >
          Granular Access
        </TabsTrigger>
      </TabsList>
      <TabsContent value="full" variant="content">
        <p className="text-sm">
          The permissions are granted on all projects, targets and services within the organization.
        </p>
      </TabsContent>
      <TabsContent value="granular" variant="content">
        {projectState && (
          <>
            <p className="mb-4 text-sm">The permissions are granted on the specified resources.</p>
            <div>
              <div className="flex text-sm">
                <div className="flex-1 rounded-tl-sm border-l border-t border-transparent border-l-inherit border-t-inherit px-2 py-1 font-bold">
                  Projects
                </div>
                <div className="flex flex-1 items-baseline border-l border-t border-transparent border-l-inherit border-t-inherit px-2 py-1">
                  <div className="font-bold">Targets</div>
                  {targetState && (
                    <div className="ml-auto flex items-center text-xs">
                      <span className="mr-1">All</span>
                      <Checkbox
                        className="size-4"
                        title="All"
                        checked={targetState.selection === '*'}
                        onClick={() => {
                          const isChecked = targetState.selection === '*';
                          if (isChecked) {
                            targetState.setGranular();
                          } else {
                            targetState.setAll();
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 items-baseline rounded-tr-sm border-x border-t border-transparent border-x-inherit border-t-inherit px-2 py-1">
                  <div className="flex grow items-center">
                    <span className="font-bold">
                      {organization.isAppDeploymentsEnabled ? (
                        <>
                          <button className="flex items-center" onClick={toggleServiceAppsState}>
                            <ArrowDownIcon
                              className={cn(
                                'size-4',
                                serviceAppsState !== ServicesAppsState.service && '-rotate-90',
                              )}
                            />
                            Services
                            <span className="ml-1 text-xs font-normal">
                              {serviceAppsState === ServicesAppsState.apps &&
                              serviceState &&
                              serviceState !== 'none' &&
                              serviceState.selection !== '*'
                                ? `(${serviceState.selection.selected.length} selected)`
                                : ''}
                            </span>
                          </button>
                        </>
                      ) : (
                        <>Services</>
                      )}
                    </span>
                    {/** Service All / Granular Toggle */}
                    {serviceState && serviceState !== 'none' && (
                      <div className="ml-auto flex items-center text-xs">
                        <span className="mr-1">All</span>
                        <Checkbox
                          className="size-4"
                          title="All"
                          checked={serviceState.selection === '*'}
                          onClick={() => {
                            const isChecked = serviceState.selection === '*';
                            if (isChecked) {
                              serviceState.setGranular();
                            } else {
                              serviceState.setAll();
                            }
                            // expand services area on toggle
                            setServiceAppsState(ServicesAppsState.service);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-0 flex min-h-[250px] flex-wrap rounded-sm">
                {/** Projects Content */}
                <div className="flex flex-1 flex-col border pt-2">
                  <div className="text-muted-foreground mb-1 px-2 text-xs uppercase">
                    access granted
                  </div>
                  {projectState.selected.length ? (
                    projectState.selected.map(selection => (
                      <RowItem
                        key={selection.project.id}
                        title={
                          selection.project.slug +
                          (selection.projectSelection.targets.mode ===
                          GraphQLSchema.ResourceAssignmentModeType.All
                            ? ' (all targets, all services)'
                            : ` (${selection.projectSelection.targets.targets?.length ?? 0} target${selection.projectSelection.targets.targets?.length === 1 ? '' : 's'})`)
                        }
                        isActive={projectState.activeProject?.project.id === selection.project.id}
                        onClick={() => {
                          setBreadcrumb({ projectId: selection.project.id });
                        }}
                        onDelete={() => projectState.removeProject(selection.project)}
                      />
                    ))
                  ) : (
                    <div className="px-2 text-xs">None selected</div>
                  )}
                  <div className="text-muted-foreground mb-1 mt-3 px-2 text-xs uppercase">
                    not selected
                  </div>
                  {projectState.notSelected.length ? (
                    projectState.notSelected.map(project => (
                      <RowItem
                        key={project.id}
                        title={project.slug}
                        isActive={breadcrumb?.projectId === project.id}
                        onClick={() => projectState.addProject(project)}
                      />
                    ))
                  ) : (
                    <div className="px-2 text-xs">All selected</div>
                  )}
                </div>

                {/** Targets Content */}
                <div className="flex flex-1 flex-col border-y border-r pt-2">
                  {targetState === null ? (
                    <div className="text-muted-foreground px-2 text-sm">
                      Select a project for adjusting the target access.
                    </div>
                  ) : (
                    <>
                      {targetState.selection === '*' ? (
                        <div className="text-muted-foreground px-2 text-xs">
                          Access to all targets of project granted.
                        </div>
                      ) : (
                        <>
                          <div className="text-muted-foreground mb-1 px-2 text-xs uppercase">
                            access granted
                          </div>
                          {targetState.selection.selected.length ? (
                            targetState.selection.selected.map(selection => (
                              <RowItem
                                key={selection.target.id}
                                title={
                                  selection.target.slug +
                                  (targetState.activeProject.project.type ===
                                  GraphQLSchema.ProjectType.Single
                                    ? ' (full access)'
                                    : selection.targetSelection.services.mode ===
                                        GraphQLSchema.ResourceAssignmentModeType.All
                                      ? ' (all services)'
                                      : ` (${selection.targetSelection.services.services?.length ?? 0} service${selection.targetSelection.services?.services?.length === 1 ? '' : 's'})`)
                                }
                                isActive={
                                  targetState.activeTarget?.target.id === selection.target.id
                                }
                                onClick={() => {
                                  setBreadcrumb({
                                    projectId: targetState.activeProject.project.id,
                                    targetId: selection.target.id,
                                  });
                                }}
                                onDelete={() => {
                                  targetState.removeTarget(selection.target);
                                }}
                              />
                            ))
                          ) : (
                            <div className="px-2 text-xs">None selected</div>
                          )}
                          <div className="text-muted-foreground mb-1 mt-3 px-2 text-xs uppercase">
                            Not selected
                          </div>
                          {targetState.selection.notSelected.length ? (
                            targetState.selection.notSelected.map(target => (
                              <RowItem
                                key={target.id}
                                title={target.slug}
                                isActive={
                                  false /* state.breadcrumb?.target?.targetId === target.id */
                                }
                                onClick={() => targetState.addTarget(target)}
                              />
                            ))
                          ) : (
                            <div className="px-2 text-xs">All selected</div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-1 flex-col border-y border-r">
                  {/** Services Content */}
                  {serviceAppsState === ServicesAppsState.service && (
                    <div className="py-2">
                      {projectState.activeProject?.projectSelection.targets.mode ===
                      GraphQLSchema.ResourceAssignmentModeType.All ? (
                        <div className="text-muted-foreground px-2 text-xs">
                          Access to all services of projects targets granted.
                        </div>
                      ) : serviceState === null ? (
                        <div className="text-muted-foreground px-2 text-xs">
                          Select a target for adjusting the service access.
                        </div>
                      ) : (
                        <>
                          {serviceState === 'none' ? (
                            <div className="text-muted-foreground px-2 text-xs">
                              Project is monolithic and has no services.
                            </div>
                          ) : serviceState.selection === '*' ? (
                            <div className="text-muted-foreground px-2 text-xs">
                              Access to all services in target granted.
                            </div>
                          ) : (
                            <>
                              <div className="text-muted-foreground mb-1 px-2 text-xs uppercase">
                                access granted
                              </div>
                              {serviceState.selection.selected.length ? (
                                serviceState.selection.selected.map(service => (
                                  <RowItem
                                    key={service.serviceName}
                                    title={service.serviceName}
                                    isActive={false}
                                    onDelete={() => serviceState.removeService(service.serviceName)}
                                  />
                                ))
                              ) : (
                                <div className="px-2 text-xs">None</div>
                              )}
                              <div className="text-muted-foreground mb-1 mt-3 px-2 text-xs uppercase">
                                Not selected
                              </div>
                              {serviceState.selection.notSelected.map(serviceName => (
                                <RowItem
                                  key={serviceName}
                                  title={serviceName}
                                  isActive={false}
                                  onClick={() => serviceState.addService(serviceName)}
                                />
                              ))}
                              <input
                                placeholder="Add service by name"
                                className="mx-2 mt-1 max-w-[70%] border-b text-sm"
                                name="serviceName"
                                onKeyPress={ev => {
                                  if (ev.key !== 'Enter') {
                                    return;
                                  }
                                  ev.preventDefault();
                                  const input: HTMLInputElement = ev.currentTarget;
                                  const serviceName = input.value.trim().toLowerCase();

                                  if (!serviceName) {
                                    return;
                                  }

                                  serviceState.addService(serviceName);
                                  input.value = '';
                                }}
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/** Apps Content */}
                  {organization.isAppDeploymentsEnabled ? (
                    <div
                      className={cn(
                        'flex items-baseline border-b border-transparent border-y-inherit px-2 py-1',
                        serviceAppsState !== ServicesAppsState.apps && 'border-t',
                      )}
                    >
                      <div className="flex grow items-center">
                        <button
                          className="flex items-center text-sm font-bold"
                          onClick={toggleServiceAppsState}
                        >
                          <ArrowDownIcon
                            className={cn(
                              'size-4',
                              serviceAppsState !== ServicesAppsState.apps && '-rotate-90',
                            )}
                          />
                          Apps
                          <span className="ml-1 text-xs font-normal">
                            {serviceAppsState === ServicesAppsState.service &&
                            typeof appsState?.selection === 'object'
                              ? `(${appsState.selection.selected.length} selected)`
                              : ''}
                          </span>
                        </button>
                        {/** Apps All / Granular Toggle */}
                        {appsState && (
                          <div className="ml-auto flex items-center text-xs">
                            <span className="mr-1">All</span>
                            <Checkbox
                              className="size-4"
                              title="All"
                              checked={appsState.selection === '*'}
                              onClick={() => {
                                const isChecked = appsState.selection === '*';
                                if (isChecked) {
                                  appsState.setGranular();
                                } else {
                                  appsState.setAll();
                                }
                                // expand apps area on toggle
                                setServiceAppsState(ServicesAppsState.apps);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {serviceAppsState === ServicesAppsState.apps && (
                    <div className="py-2">
                      {projectState.activeProject?.projectSelection.targets.mode ===
                      GraphQLSchema.ResourceAssignmentModeType.All ? (
                        <div className="text-muted-foreground px-2 text-xs">
                          Access to all apps of projects targets granted.
                        </div>
                      ) : appsState === null ? (
                        <div className="text-muted-foreground px-2 text-xs">
                          Select a target for adjusting the apps access.
                        </div>
                      ) : (
                        <>
                          {appsState.selection === '*' ? (
                            <div className="text-muted-foreground px-2 text-xs">
                              Access to all apps in target granted.
                            </div>
                          ) : (
                            <>
                              <div className="text-muted-foreground mb-1 px-2 text-xs uppercase">
                                access granted
                              </div>
                              {appsState.selection.selected.length ? (
                                appsState.selection.selected.map(app => (
                                  <RowItem
                                    key={app.appDeployment}
                                    title={app.appDeployment}
                                    isActive={false}
                                    onDelete={() => appsState.removeApp(app.appDeployment)}
                                  />
                                ))
                              ) : (
                                <div className="px-2 text-xs">None</div>
                              )}
                              <div className="text-muted-foreground mb-1 mt-3 px-2 text-xs uppercase">
                                Not selected
                              </div>
                              {appsState.selection.notSelected.map(serviceName => (
                                <RowItem
                                  key={serviceName}
                                  title={serviceName}
                                  isActive={false}
                                  onClick={() => appsState.addApp(serviceName)}
                                />
                              ))}
                              <input
                                placeholder="Add app by name"
                                className="mx-2 mt-1 max-w-[70%] border-b text-sm"
                                name="appName"
                                onKeyPress={ev => {
                                  if (ev.key !== 'Enter') {
                                    return;
                                  }
                                  ev.preventDefault();
                                  const input: HTMLInputElement = ev.currentTarget;
                                  const appName = input.value.trim().toLowerCase();

                                  if (!appName) {
                                    return;
                                  }

                                  appsState.addApp(appName);
                                  input.value = '';
                                }}
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex h-5 items-center text-sm">
              {projectState.activeProject && (
                <>
                  <button
                    onClick={() =>
                      projectState.activeProject &&
                      setBreadcrumb({ projectId: projectState.activeProject.project.id })
                    }
                  >
                    {projectState.activeProject.project.slug}
                  </button>{' '}
                  {targetState?.activeTarget && (
                    <>
                      <ChevronRightIcon size="14" /> {targetState.activeTarget.target.slug}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function RowItem(props: {
  title: string;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center space-x-1 px-2 py-1 data-[active=true]:cursor-default data-[active=true]:bg-gray-200 data-[active=true]:text-black"
      data-active={props.isActive}
    >
      <span className="grow text-sm" onClick={props.onClick}>
        {props.title} {props.isActive && <ChevronRightIcon size={12} className="inline" />}
      </span>

      {props.onDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  props.onDelete?.();
                }}
              >
                <XIcon
                  size={12}
                  data-active={props.isActive}
                  className="text-muted-foreground data-[active=true]:text-secondary"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

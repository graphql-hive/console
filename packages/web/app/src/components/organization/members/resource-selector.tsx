import { MouseEvent, useMemo, useState } from 'react';
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
  }
`);

const ResourceSelector_OrganizationQuery = graphql(`
  query ResourceSelector_OrganizationQuery(
    $organizationId: ID!
    $intent: ResourceSelectorIntentType!
  ) {
    organization(reference: { byId: $organizationId }) {
      id
      projects: projectsForResourceSelector(intent: $intent) {
        projectId
        slug
        type
      }
      isAppDeploymentsEnabled
    }
  }
`);

const ResourceSelector_OrganizationProjectTargestQuery = graphql(`
  query ResourceSelector_OrganizationProjectTargestQuery(
    $organizationId: ID!
    $projectId: ID!
    $intent: ResourceSelectorIntentType!
  ) {
    organization(reference: { byId: $organizationId }) {
      id
      project: projectForResourceSelector(projectId: $projectId, intent: $intent) {
        projectId
        slug
        type
        targets {
          targetId
          slug
        }
      }
    }
  }
`);

const ResourceSelector_OrganizationProjectTargetQuery = graphql(`
  query ResourceSelector_OrganizationProjectTargetQuery(
    $organizationId: ID!
    $projectId: ID!
    $targetId: ID!
    $intent: ResourceSelectorIntentType!
  ) {
    organization(reference: { byId: $organizationId }) {
      id
      project: projectForResourceSelector(projectId: $projectId, intent: $intent) {
        projectId
        slug
        type
        target(targetId: $targetId) {
          targetId
          slug
          services
          appDeployments
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
  /**
   * Scope the resource selector to a specific project.
   * If this property is provided, please make sure that the `selection` property contains the project.
   * */
  forProjectId?: string;
  intent?: GraphQLSchema.ResourceSelectorIntentType;
}) {
  const organizationId = useFragment(ResourceSelector_OrganizationFragment, props.organization).id;
  const intent = props.intent ?? GraphQLSchema.ResourceSelectorIntentType.Admin;
  const [organizationQuery] = useQuery({
    query: ResourceSelector_OrganizationQuery,
    variables: {
      intent,
      organizationId,
    },
  });

  const [breadcrumb, setBreadcrumb] = useState<
    null | { projectId: string; targetId?: undefined } | { projectId: string; targetId: string }
  >(props.forProjectId ? { projectId: props.forProjectId } : null);
  // whether we show the service or apps in the last tab
  const [serviceAppsState, setServiceAppsState] = useState(ServicesAppsState.service);

  const toggleServiceAppsState = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const state =
      serviceAppsState === ServicesAppsState.apps
        ? ServicesAppsState.service
        : ServicesAppsState.apps;
    setServiceAppsState(state);
  };

  const projectState = useMemo(() => {
    if (organizationQuery.data?.organization?.projects == null) {
      return null;
    }

    if (props.selection.mode === GraphQLSchema.ResourceAssignmentModeType.All) {
      return null;
    }

    const organization = organizationQuery.data.organization;

    type SelectedItem = {
      project: (typeof organization.projects)[number];
      projectSelection: GraphQLSchema.ProjectResourceAssignmentInput;
    };

    type NotSelectedItem = (typeof organization.projects)[number];

    const selectedProjects: Array<SelectedItem> = [];
    const notSelectedProjects: Array<NotSelectedItem> = [];

    let activeProject: null | SelectedItem = null;

    for (const project of organization.projects) {
      const projectSelection = props.selection.projects?.find(
        item => item.projectId === project.projectId,
      );

      if (projectSelection) {
        selectedProjects.push({ project, projectSelection });

        if (breadcrumb?.projectId === project.projectId) {
          activeProject = { project, projectSelection };
        }

        continue;
      }

      notSelectedProjects.push(project);
    }

    return {
      selected: selectedProjects,
      notSelected: notSelectedProjects,
      activeProject,
      addProject(item: (typeof organization.projects)[number]) {
        props.onSelectionChange(
          produce(props.selection, state => {
            state.projects?.push({
              projectId: item.projectId,
              projectSlug: item.slug,
              targets: {
                mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
                targets: [],
              },
            });
            setBreadcrumb({ projectId: item.projectId });
          }),
        );
      },
      removeProject(item: (typeof organization.projects)[number]) {
        props.onSelectionChange(
          produce(props.selection, state => {
            state.projects = state.projects?.filter(
              project => project.projectId !== item.projectId,
            );
          }),
        );
        setBreadcrumb(breadcrumb => {
          if (breadcrumb?.projectId === item.projectId) {
            return null;
          }
          return breadcrumb;
        });
      },
    };
  }, [organizationQuery.data?.organization?.projects, props.selection, breadcrumb?.projectId]);

  const [organizationProjectTargets] = useQuery({
    query: ResourceSelector_OrganizationProjectTargestQuery,
    pause: !projectState?.activeProject,
    variables: {
      organizationId,
      projectId: projectState?.activeProject?.project.projectId ?? '',
      intent,
    },
  });

  const targetState = useMemo(() => {
    if (
      !organizationProjectTargets?.data?.organization?.project?.targets ||
      !projectState?.activeProject
    ) {
      return null;
    }

    const projectId = projectState.activeProject.project.projectId;
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
      target: (typeof organizationProjectTargets.data.organization.project.targets)[number];
      targetSelection: Exclude<
        typeof projectState.activeProject.projectSelection.targets.targets,
        null | undefined
      >[number];
    };

    type NotSelectedItem =
      (typeof organizationProjectTargets.data.organization.project.targets)[number];

    const selected: Array<SelectedItem> = [];
    const notSelected: Array<NotSelectedItem> = [];

    let activeTarget: null | {
      targetSelection: Exclude<
        typeof projectState.activeProject.projectSelection.targets.targets,
        null | undefined
      >[number];
      target: (typeof organizationProjectTargets.data.organization.project.targets)[number];
    } = null;

    for (const target of organizationProjectTargets.data.organization.project.targets) {
      const targetSelection = projectState.activeProject.projectSelection.targets.targets?.find(
        item => item.targetId === target.targetId,
      );

      if (targetSelection) {
        selected.push({ target, targetSelection });

        if (breadcrumb?.targetId === target.targetId) {
          activeTarget = {
            targetSelection,
            target,
          };
        }
        continue;
      }

      notSelected.push(target);
    }

    return {
      selection: {
        selected,
        notSelected,
      },
      activeTarget,
      activeProject: projectState.activeProject,
      addTarget(
        item: (typeof organizationProjectTargets.data.organization.project.targets)[number],
      ) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects.find(project => project.projectId === projectId);
            if (!project) return;
            project.targets.targets.push({
              targetId: item.targetId,
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
            setBreadcrumb({ projectId: project.projectId, targetId: item.targetId });
          }),
        );
      },
      removeTarget(
        item: (typeof organizationProjectTargets.data.organization.project.targets)[number],
      ) {
        props.onSelectionChange(
          produce(props.selection, state => {
            const project = state.projects?.find(project => project.projectId === projectId);
            if (!project) return;
            project.targets.targets = project.targets.targets?.filter(
              target => target.targetId !== item.targetId,
            );
          }),
        );
        setBreadcrumb(breadcrumb => {
          if (breadcrumb?.targetId === item.targetId) {
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
    organizationProjectTargets?.data?.organization?.project?.targets,
    breadcrumb?.targetId,
  ]);

  const [organizationProjectTarget] = useQuery({
    query: ResourceSelector_OrganizationProjectTargetQuery,
    pause: !targetState?.activeTarget || !projectState?.activeProject,
    variables: {
      organizationId,
      projectId: projectState?.activeProject?.project.projectId ?? '',
      targetId: targetState?.activeTarget?.target?.targetId ?? '',
      intent,
    },
  });

  const serviceState = useMemo(() => {
    if (
      !projectState?.activeProject ||
      !targetState?.activeTarget ||
      !breadcrumb?.targetId ||
      !organizationProjectTarget.data?.organization?.project?.target
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

    if (organizationProjectTarget.data.organization.project.target?.services) {
      for (const serviceName of organizationProjectTarget.data.organization.project.target
        .services) {
        if (!selectedServices.find(service => service.serviceName === serviceName)) {
          notSelectedServices.push(serviceName);
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
  }, [
    targetState?.activeTarget,
    breadcrumb,
    projectState?.activeProject,
    props.selection,
    organizationProjectTarget.data?.organization?.project?.target,
  ]);

  const appsState = useMemo(() => {
    if (
      !projectState?.activeProject ||
      !targetState?.activeTarget ||
      !breadcrumb?.targetId ||
      !organizationQuery.data?.organization?.isAppDeploymentsEnabled ||
      !organizationProjectTarget.data?.organization?.project?.target
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

    const notSelectedApps: Array<string> = [];

    if (organizationProjectTarget.data.organization.project.target?.appDeployments != null) {
      for (const appName of organizationProjectTarget.data.organization.project.target
        .appDeployments) {
        if (!notSelectedApps.find(app => app === appName)) {
          notSelectedApps.push(appName);
        }
      }
    }

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
    organizationProjectTarget.data?.organization?.project?.target,
  ]);

  const forIdProject = useMemo(() => {
    if (!props.forProjectId) {
      return null;
    }

    const project = props.selection.projects.find(
      project => project.projectId === props.forProjectId,
    );

    if (!project) {
      // Something is wrong
      return null;
    }

    return project;
  }, [props.forProjectId, props.selection.projects]);

  const showProjectsTab = !props.forProjectId;

  return (
    <Tabs
      defaultValue="granular"
      value={
        props.selection.mode === GraphQLSchema.ResourceAssignmentModeType.All ||
        (forIdProject && forIdProject.targets.mode === GraphQLSchema.ResourceAssignmentModeType.All)
          ? 'full'
          : 'granular'
      }
    >
      <TabsList variant="content" className="mt-1">
        <TabsTrigger
          variant="content"
          value="full"
          onClick={() => {
            if (!forIdProject) {
              props.onSelectionChange({
                ...props.selection,
                mode: GraphQLSchema.ResourceAssignmentModeType.All,
              });
              setBreadcrumb(null);
              return;
            }

            props.onSelectionChange({
              ...props.selection,
              mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
              projects: [
                {
                  ...forIdProject,
                  targets: {
                    ...forIdProject.targets,
                    mode: GraphQLSchema.ResourceAssignmentModeType.All,
                  },
                },
              ],
            });
            setBreadcrumb({ projectId: forIdProject.projectId });
          }}
        >
          Full Access
        </TabsTrigger>
        <TabsTrigger
          variant="content"
          value="granular"
          onClick={() => {
            if (!forIdProject) {
              props.onSelectionChange({
                ...props.selection,
                mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
              });
              return;
            }
            props.onSelectionChange({
              ...props.selection,
              mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
              projects: [
                {
                  ...forIdProject,
                  targets: {
                    ...forIdProject.targets,
                    mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
                  },
                },
              ],
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
                {showProjectsTab && (
                  <div className="flex-1 rounded-tl-sm border-l border-t border-transparent border-l-inherit border-t-inherit px-2 py-1 font-bold">
                    Projects
                  </div>
                )}
                <div className="flex flex-1 items-baseline border-l border-t border-transparent border-l-inherit border-t-inherit px-2 py-1">
                  <div className="font-bold">Targets</div>
                  {targetState && showProjectsTab && (
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
                      {organizationQuery.data?.organization?.isAppDeploymentsEnabled ? (
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
              <div className="mt-0 flex h-64 flex-wrap rounded-sm">
                {/** Projects Content */}
                {showProjectsTab && (
                  <div className="flex h-full flex-1 flex-col overflow-auto border pt-2">
                    <div className="text-neutral-10 mb-1 px-2 text-xs uppercase">
                      access granted
                    </div>
                    {projectState.selected.length ? (
                      projectState.selected.map(selection => (
                        <RowItem
                          key={selection.project.projectId}
                          title={
                            selection.project.slug +
                            (selection.projectSelection.targets.mode ===
                            GraphQLSchema.ResourceAssignmentModeType.All
                              ? ' (all targets, all services)'
                              : ` (${selection.projectSelection.targets.targets?.length ?? 0} target${selection.projectSelection.targets.targets?.length === 1 ? '' : 's'})`)
                          }
                          isActive={
                            projectState.activeProject?.project.projectId ===
                            selection.project.projectId
                          }
                          onClick={() => {
                            setBreadcrumb({ projectId: selection.project.projectId });
                          }}
                          onDelete={() => projectState.removeProject(selection.project)}
                        />
                      ))
                    ) : (
                      <div className="px-2 text-xs">None selected</div>
                    )}
                    <div className="text-neutral-10 mb-1 mt-3 px-2 text-xs uppercase">
                      not selected
                    </div>
                    {projectState.notSelected.length ? (
                      projectState.notSelected.map(project => (
                        <RowItem
                          key={project.projectId}
                          title={project.slug}
                          isActive={breadcrumb?.projectId === project.projectId}
                          onClick={() => projectState.addProject(project)}
                        />
                      ))
                    ) : (
                      <div className="px-2 text-xs">All selected</div>
                    )}
                  </div>
                )}

                {/** Targets Content */}
                <div
                  className={cn(
                    'flex h-full flex-1 flex-col overflow-auto border-y border-r pt-2',
                    !showProjectsTab && 'border-l',
                  )}
                >
                  {targetState === null ? (
                    <div className="text-neutral-10 px-2 text-sm">
                      Select a project for adjusting the target access.
                    </div>
                  ) : (
                    <>
                      {targetState.selection === '*' ? (
                        <div className="text-neutral-10 px-2 text-xs">
                          Access to all targets of project granted.
                        </div>
                      ) : (
                        <>
                          <div className="text-neutral-10 mb-1 px-2 text-xs uppercase">
                            access granted
                          </div>
                          {targetState.selection.selected.length ? (
                            targetState.selection.selected.map(selection => (
                              <RowItem
                                key={selection.target.targetId}
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
                                  targetState.activeTarget?.target.targetId ===
                                  selection.target.targetId
                                }
                                onClick={() => {
                                  setBreadcrumb({
                                    projectId: targetState.activeProject.project.projectId,
                                    targetId: selection.target.targetId,
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
                          <div className="text-neutral-10 mb-1 mt-3 px-2 text-xs uppercase">
                            Not selected
                          </div>
                          {targetState.selection.notSelected.length ? (
                            targetState.selection.notSelected.map(target => (
                              <RowItem
                                key={target.targetId}
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

                <div className="flex h-full flex-1 flex-col overflow-auto border-y border-r">
                  {/** Services Content */}
                  {serviceAppsState === ServicesAppsState.service && (
                    <div className="py-2">
                      {projectState.activeProject?.projectSelection.targets.mode ===
                      GraphQLSchema.ResourceAssignmentModeType.All ? (
                        <div className="text-neutral-10 px-2 text-xs">
                          Access to all services of projects targets granted.
                        </div>
                      ) : serviceState === null ? (
                        <div className="text-neutral-10 px-2 text-xs">
                          Select a target for adjusting the service access.
                        </div>
                      ) : (
                        <>
                          {serviceState === 'none' ? (
                            <div className="text-neutral-10 px-2 text-xs">
                              Project is monolithic and has no services.
                            </div>
                          ) : serviceState.selection === '*' ? (
                            <div className="text-neutral-10 px-2 text-xs">
                              Access to all services in target granted.
                            </div>
                          ) : (
                            <>
                              <div className="text-neutral-10 mb-1 px-2 text-xs uppercase">
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
                              <div className="text-neutral-10 mb-1 mt-3 px-2 text-xs uppercase">
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
                  {organizationQuery.data?.organization?.isAppDeploymentsEnabled ? (
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
                        <div className="text-neutral-10 px-2 text-xs">
                          Access to all apps of projects targets granted.
                        </div>
                      ) : appsState === null ? (
                        <div className="text-neutral-10 px-2 text-xs">
                          Select a target for adjusting the apps access.
                        </div>
                      ) : (
                        <>
                          {appsState.selection === '*' ? (
                            <div className="text-neutral-10 px-2 text-xs">
                              Access to all apps in target granted.
                            </div>
                          ) : (
                            <>
                              <div className="text-neutral-10 mb-1 px-2 text-xs uppercase">
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
                              <div className="text-neutral-10 mb-1 mt-3 px-2 text-xs uppercase">
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
                      setBreadcrumb({ projectId: projectState.activeProject.project.projectId })
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
      className="data-[active=true]:bg-neutral-10 data-[active=true]:text-neutral-1 flex cursor-pointer items-center space-x-1 px-2 py-1 data-[active=true]:cursor-default"
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
                  className="text-neutral-10 data-[active=true]:text-neutral-2"
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

const createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment = graphql(`
  fragment createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment on ResourceAssignment {
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
`);

export function createResourceSelectionFromResourceAssignment(
  data: FragmentType<
    typeof createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment
  >,
): ResourceSelection {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const resourceAssignment = useFragment(
    createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment,
    data,
  );
  return {
    mode: resourceAssignment.mode ?? GraphQLSchema.ResourceAssignmentModeType.All,
    projects: (resourceAssignment.projects ?? []).map(record => ({
      projectId: record.project.id,
      projectSlug: record.project.slug,
      targets: {
        mode: record.targets.mode,
        targets: (record.targets.targets ?? []).map(target => ({
          targetId: target.target.id,
          targetSlug: target.target.slug,
          services: {
            mode: target.services.mode,
            services: target.services.services?.map(
              (service): GraphQLSchema.ServiceResourceAssignmentInput => ({
                serviceName: service,
              }),
            ),
          },
          appDeployments: {
            mode: target.appDeployments.mode,
            appDeployments: target.appDeployments.appDeployments?.map(
              (appDeploymentName): GraphQLSchema.AppDeploymentResourceAssignmentInput => ({
                appDeployment: appDeploymentName,
              }),
            ),
          },
        })),
      },
    })),
  };
}

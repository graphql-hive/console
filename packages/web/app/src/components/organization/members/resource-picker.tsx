import { useMemo, useState } from 'react';
import { produce } from 'immer';
import { ChevronRightIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';

export type ResourceSelection = {
  projects:
    | '*'
    | Array<{
        id: string;
        slug: string;
        targets:
          | '*'
          | Array<{
              id: string;
              slug: string;
              appDeployments: '*' | Array<string>;
              services: '*' | Array<string>;
            }>;
      }>;
};

const ResourcePicker_OrganizationFragment = graphql(`
  fragment ResourcePicker_OrganizationFragment on Organization {
    id
    slug
    projects {
      nodes {
        id
        slug
        type
      }
    }
  }
`);

const ResourcePicker_OrganizationProjectTargetsQuery = graphql(`
  query ResourcePicker_OrganizationProjectTargetsQuery(
    $organizationSlug: String!
    $projectSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        type
        targets {
          nodes {
            id
            slug
          }
        }
      }
    }
  }
`);

const ResourcePicker_OrganizationProjectTargetQuery = graphql(`
  query ResourcePicker_OrganizationProjectTargetQuery(
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
          nodes {
            id
            slug
          }
        }
        target: targetBySlug(targetSlug: $targetSlug) {
          id
          latestValidSchemaVersion {
            id
            schemas {
              nodes {
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
`);

export function ResourcePicker(props: {
  initialSelection?: ResourceSelection;
  organization: FragmentType<typeof ResourcePicker_OrganizationFragment>;
}) {
  const organization = useFragment(ResourcePicker_OrganizationFragment, props.organization);
  const [breadcrumb, setBreadcrumb] = useState(
    null as
      | null
      | { projectId: string; targetId?: undefined }
      | { projectId: string; targetId: string; mode: 'service' | 'appDeployment' },
  );
  const [selection, setSelection] = useState<ResourceSelection>(
    props.initialSelection ?? { projects: '*' },
  );

  const projectState = useMemo(() => {
    if (selection.projects === '*') {
      return null;
    }

    type SelectedItem = {
      project: (typeof organization.projects.nodes)[number];
      projectSelection: (typeof selection.projects)[number];
    };

    type NotSelectedItem = (typeof organization.projects.nodes)[number];

    const selectedProjects: Array<SelectedItem> = [];
    const notSelectedProjects: Array<NotSelectedItem> = [];

    let activeProject: null | {
      project: (typeof organization.projects.nodes)[number];
      projectSelection: (typeof selection.projects)[number];
    } = null;

    for (const project of organization.projects.nodes) {
      const projectSelection = selection.projects.find(item => item.id === project.id);

      if (projectSelection) {
        selectedProjects.push({ project, projectSelection });

        if (project.id === projectSelection.id) {
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
      addSelection(item: (typeof organization.projects.nodes)[number]) {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') {
              return;
            }

            state.projects.push({
              id: item.id,
              slug: item.slug,
              targets: '*',
            });
          }),
        );
      },
    };
  }, [organization.projects.nodes, selection]);

  const [organizationProjectTargets] = useQuery({
    query: ResourcePicker_OrganizationProjectTargetsQuery,
    pause: !projectState?.activeProject,
    variables: {
      organizationSlug: organization.slug,
      projectSlug: projectState?.activeProject?.project.slug ?? '',
    },
  });

  const targetState = useMemo(() => {
    if (
      !organizationProjectTargets?.data?.organization?.project?.targets?.nodes ||
      !projectState?.activeProject
    ) {
      return null;
    }

    const projectId = projectState.activeProject.project.id;

    if (projectState.activeProject.projectSelection.targets === '*') {
      return {
        selection: '*',
        setGranular() {
          setSelection(state =>
            produce(state, state => {
              if (state.projects === '*') return;

              const project = state.projects.find(project => project.id === projectId);
              if (!project) return;

              project.targets = [];
            }),
          );
        },
      } as const;
    }

    type SelectedItem = {
      target: (typeof organizationProjectTargets.data.organization.project.targets.nodes)[number];
      targetSelection: (typeof projectState.activeProject.projectSelection.targets)[number];
    };

    type NotSelectedItem =
      (typeof organizationProjectTargets.data.organization.project.targets.nodes)[number];

    const selected: Array<SelectedItem> = [];
    const notSelected: Array<NotSelectedItem> = [];

    let activeTarget: null | {
      targetSelection: (typeof projectState.activeProject.projectSelection.targets)[number];
      target: (typeof organizationProjectTargets.data.organization.project.targets.nodes)[number];
    } = null;

    for (const target of organizationProjectTargets.data.organization.project.targets.nodes) {
      const targetSelection = projectState.activeProject.projectSelection.targets.find(
        item => item.id === target.id,
      );

      if (targetSelection) {
        selected.push({ target, targetSelection });

        if (breadcrumb?.targetId === target.id) {
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
      addSelection(
        item: (typeof organizationProjectTargets.data.organization.project.targets.nodes)[number],
      ) {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project) return;
            if (project.targets === '*') return;
            project.targets.push({
              id: item.id,
              slug: item.slug,
              appDeployments: '*',
              services: '*',
            });
          }),
        );
      },
      removeSelection(
        item: (typeof organizationProjectTargets.data.organization.project.targets.nodes)[number],
      ) {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project) return;
            if (project.targets === '*') return;
            project.targets = project.targets.filter(target => target.id === item.id);
          }),
        );
      },
      setAll() {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project) return;
            project.targets = '*';
          }),
        );
        setBreadcrumb({ projectId });
      },
    };
  }, [
    projectState?.activeProject,
    organizationProjectTargets?.data?.organization?.project?.targets?.nodes,
    breadcrumb?.targetId,
  ]);

  const [organizationProjectTarget] = useQuery({
    query: ResourcePicker_OrganizationProjectTargetQuery,
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
      breadcrumb.mode !== 'service' ||
      !organizationProjectTarget.data?.organization?.project?.type ||
      // we can not assign services for a monolithic schema
      organizationProjectTarget.data.organization.project.type === ProjectType.Single
    ) {
      return null;
    }

    const projectId = projectState.activeProject.projectSelection.id;
    const targetId = targetState.activeTarget.targetSelection.id;

    if (targetState.activeTarget.targetSelection.services === '*') {
      return {
        selection: '*' as const,
        setGranular() {
          setSelection(state =>
            produce(state, state => {
              if (state.projects === '*') return;
              const project = state.projects.find(project => project.id === projectId);
              if (!project || project.targets === '*') return;
              const target = project.targets.find(target => target.id === targetId);
              if (!target) return;
              target.services = [];
            }),
          );
        },
      };
    }

    const selectedServices: Array<string> = [...targetState.activeTarget.targetSelection.services];
    const notSelectedServices: Array<string> = [];

    if (
      organizationProjectTarget.data.organization.project.target?.latestValidSchemaVersion?.schemas
    ) {
      for (const schema of organizationProjectTarget.data.organization.project.target
        .latestValidSchemaVersion.schemas.nodes) {
        if (
          schema.__typename === 'CompositeSchema' &&
          schema.service &&
          !selectedServices.find(serviceName => serviceName === schema.service)
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
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project || project.targets === '*') return;
            const target = project.targets.find(target => target.id === targetId);
            if (!target) return;
            target.services = '*';
          }),
        );
      },
      addService(serviceName: string) {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project || project.targets === '*') return;
            const target = project.targets.find(target => target.id === targetId);
            if (
              !target ||
              target.services === '*' ||
              target.services.find(service => service === serviceName)
            ) {
              return;
            }

            target.services.push(serviceName);
          }),
        );
      },
    };
  }, [targetState?.activeTarget, breadcrumb, projectState?.activeProject]);

  const appDeploymentState = useMemo(() => {
    if (
      !projectState?.activeProject ||
      !targetState?.activeTarget ||
      !breadcrumb?.targetId ||
      breadcrumb.mode !== 'appDeployment'
    ) {
      return null;
    }

    const projectId = projectState.activeProject.projectSelection.id;
    const targetId = targetState.activeTarget.targetSelection.id;

    if (targetState.activeTarget.targetSelection.appDeployments === '*') {
      return {
        selection: '*' as const,
        setGranular() {
          setSelection(state =>
            produce(state, state => {
              if (state.projects === '*') return;
              const project = state.projects.find(project => project.id === projectId);
              if (!project || project.targets === '*') return;
              const target = project.targets.find(target => target.id === targetId);
              if (!target) return;
              target.appDeployments = [];
            }),
          );
        },
      };
    }

    const selected: Array<string> = [...targetState.activeTarget.targetSelection.appDeployments];
    const notSelected: Array<string> = [];

    return {
      selection: {
        selected,
        notSelected,
      },
      setAll() {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project || project.targets === '*') return;
            const target = project.targets.find(target => target.id === targetId);
            if (!target) return;
            target.appDeployments = '*';
          }),
        );
      },
      addAppDeployment(appDeploymentName: string) {
        setSelection(state =>
          produce(state, state => {
            if (state.projects === '*') return;
            const project = state.projects.find(project => project.id === projectId);
            if (!project || project.targets === '*') return;
            const target = project.targets.find(target => target.id === targetId);
            if (
              !target ||
              target.appDeployments === '*' ||
              target.appDeployments.find(appDeployment => appDeployment === appDeploymentName)
            ) {
              return;
            }

            target.appDeployments.push(appDeploymentName);
          }),
        );
      },
    };
  }, [targetState?.activeTarget, breadcrumb, projectState?.activeProject]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Select access</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="granular" value={selection.projects === '*' ? 'full' : 'granular'}>
        <TabsList variant="content" className="grid w-full grid-cols-2">
          <TabsTrigger
            variant="content"
            value="full"
            onClick={() => {
              setSelection({ projects: '*' });
              setBreadcrumb(null);
            }}
          >
            Full Access
          </TabsTrigger>
          <TabsTrigger
            variant="content"
            value="granular"
            onClick={() => {
              setSelection({ projects: [] });
            }}
          >
            Granular Access
          </TabsTrigger>
        </TabsList>
        <TabsContent value="full" variant="content">
          <p className="text-sm">
            This mode grants permissions specified by the user role on all resources within the
            organization.
          </p>
        </TabsContent>
        <TabsContent value="granular" variant="content">
          {projectState && (
            <>
              <p className="text-muted-foreground mb-4 text-sm">
                The permissions granted by the assigned user role are applied for the specified
                resources.
              </p>
              <div className="flex text-sm">
                <div className="flex-1 border-x border-transparent px-2 pb-1">Projects</div>
                {targetState ? (
                  <div className="flex-1 border-transparent px-2 pb-1">Targets</div>
                ) : (
                  <div className="flex-1" />
                )}
                {serviceState || appDeploymentState ? (
                  <div className="flex-1 border-x border-transparent px-2 pb-1">
                    <button
                      className={cn(
                        serviceState && 'text-yellow-500',
                        projectState.activeProject?.project.type === ProjectType.Single &&
                          'text-gray-600',
                      )}
                      disabled={projectState.activeProject?.project.type === ProjectType.Single}
                      onClick={() => {
                        setBreadcrumb(breadcrumb => {
                          if (!breadcrumb?.targetId) {
                            return breadcrumb;
                          }

                          return {
                            ...breadcrumb,
                            mode: 'service',
                          };
                        });
                      }}
                    >
                      Services
                    </button>{' '}
                    /{' '}
                    <button
                      className={cn(appDeploymentState && 'text-yellow-500')}
                      onClick={() => {
                        setBreadcrumb(breadcrumb => {
                          if (!breadcrumb?.targetId) {
                            return breadcrumb;
                          }

                          return {
                            ...breadcrumb,
                            mode: 'appDeployment',
                          };
                        });
                      }}
                    >
                      App Deployments
                    </button>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <div className="flex min-h-[250px] flex-wrap rounded-sm">
                <div className="flex flex-1 flex-col border pt-3">
                  <div className="mb-1 px-2 text-xs uppercase text-gray-500">access granted</div>
                  {projectState.selected.length ? (
                    projectState.selected.map(selection => (
                      <Row
                        key={selection.project.id}
                        title={
                          selection.project.slug +
                          (selection.projectSelection.targets === '*'
                            ? ' (all targets)'
                            : ` (${selection.projectSelection.targets.length} target${selection.projectSelection.targets.length === 1 ? '' : 's'})`)
                        }
                        isActive={projectState.activeProject?.project.id === selection.project.id}
                        onClick={() => {
                          setBreadcrumb({ projectId: selection.project.id });
                        }}
                      />
                    ))
                  ) : (
                    <div className="px-2 text-xs">None</div>
                  )}
                  <div className="mb-1 mt-3 px-2 text-xs uppercase text-gray-500">Unselected</div>
                  {projectState.notSelected.length ? (
                    projectState.notSelected.map(project => (
                      <Row
                        key={project.id}
                        title={project.slug}
                        isActive={breadcrumb?.projectId === project.id}
                        onClick={() =>
                          setSelection(state =>
                            produce(state, state => {
                              if (state.projects === '*') {
                                return;
                              }

                              state.projects.push({
                                id: project.id,
                                slug: project.slug,
                                targets: '*',
                              });
                            }),
                          )
                        }
                      />
                    ))
                  ) : (
                    <div className="px-2 text-xs">None</div>
                  )}
                </div>
                {targetState ? (
                  <div className="flex flex-1 flex-col border-y border-r pt-3">
                    {targetState.selection === '*' ? (
                      <div className="px-2 text-sm text-gray-500">
                        Access to all targets of project granted.
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 px-2 text-xs uppercase text-gray-500">
                          access granted
                        </div>
                        {targetState.selection.selected.length ? (
                          targetState.selection.selected.map(selection => (
                            <Row
                              title={
                                selection.target.slug +
                                (selection.targetSelection.services === '*'
                                  ? ' (all services)'
                                  : ` (${selection.targetSelection.services.length} target${selection.targetSelection.services.length === 1 ? '' : 's'})`)
                              }
                              isActive={targetState.activeTarget?.target.id === selection.target.id}
                              onClick={() => {
                                const project = projectState.activeProject?.project;
                                if (!project) return;
                                setBreadcrumb({
                                  projectId: project.id,
                                  targetId: selection.target.id,
                                  mode:
                                    project.type === ProjectType.Single
                                      ? 'appDeployment'
                                      : 'service',
                                });
                              }}
                            />
                          ))
                        ) : (
                          <div className="px-2 text-xs">None</div>
                        )}
                        <div className="mb-1 mt-3 px-2 text-xs uppercase text-gray-500">
                          Unselected
                        </div>
                        {targetState.selection.notSelected.length ? (
                          targetState.selection.notSelected.map(target => (
                            <Row
                              title={target.slug}
                              isActive={
                                false /* state.breadcrumb?.target?.targetId === target.id */
                              }
                              onClick={() => targetState.addSelection(target)}
                            />
                          ))
                        ) : (
                          <div className="px-2 text-xs">None</div>
                        )}
                      </>
                    )}

                    <div className="mb-0 mt-auto border-t p-1 text-right text-xs">
                      Mode{' '}
                      <button
                        className={cn('mr-1', targetState.selection !== '*' && 'text-orange-500')}
                        onClick={targetState.setGranular}
                      >
                        Granular
                      </button>
                      <button
                        className={cn(targetState.selection === '*' && 'text-orange-500')}
                        onClick={targetState.setAll}
                      >
                        All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col pt-3" />
                )}
                {serviceState ? (
                  <div className="flex flex-1 flex-col border-y border-r pt-3">
                    {serviceState.selection === '*' ? (
                      <div className="px-2 text-sm text-gray-500">
                        Access to all services in target granted.
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 px-2 text-xs uppercase text-gray-500">
                          access granted
                        </div>
                        {serviceState.selection.selected.length ? (
                          serviceState.selection.selected.map(serviceName => (
                            <Row title={serviceName} isActive={false} />
                          ))
                        ) : (
                          <div className="px-2 text-xs">None</div>
                        )}
                        <div className="mb-1 mt-3 px-2 text-xs uppercase text-gray-500">
                          Unselected
                        </div>
                        {serviceState.selection.notSelected.map(serviceName => (
                          <Row
                            title={serviceName}
                            isActive={false}
                            // onClick={() => serviceState.selectService(service.id)}
                          />
                        ))}
                        <input
                          placeholder="Add service by name"
                          className="mx-2 mt-1 max-w-[70%] border-b text-sm"
                        />
                      </>
                    )}
                    <div className="mb-0 mt-auto border-t p-1 text-right text-xs">
                      Mode{' '}
                      <button
                        className={cn('mr-1', serviceState.selection !== '*' && 'text-orange-500')}
                        onClick={serviceState.setGranular}
                      >
                        Granular
                      </button>
                      <button
                        className={cn('mr-1', serviceState.selection === '*' && 'text-orange-500')}
                        onClick={serviceState.setAll}
                      >
                        All
                      </button>
                    </div>
                  </div>
                ) : appDeploymentState ? (
                  <div className="flex flex-1 flex-col border-y border-r pt-3">
                    {appDeploymentState.selection === '*' ? (
                      <div className="px-2 text-sm text-gray-500">
                        Access to all app deployments in target granted.
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 px-2 text-xs uppercase text-gray-500">
                          access granted
                        </div>
                        {appDeploymentState.selection.selected.length ? (
                          appDeploymentState.selection.selected.map(appDeploymentName => (
                            <Row title={appDeploymentName} isActive={false} />
                          ))
                        ) : (
                          <div className="px-2 text-xs">None</div>
                        )}
                        <div className="mb-1 mt-3 px-2 text-xs uppercase text-gray-500">
                          Unselected
                        </div>
                        {appDeploymentState.selection.notSelected.map(appDeploymentName => (
                          <Row title={appDeploymentName} isActive={false} />
                        ))}
                        <form
                          onSubmit={ev => {
                            ev.preventDefault();
                            const input: HTMLInputElement = ev.currentTarget.appDeploymentName;
                            const appDeploymentName = input.value.trim().toLowerCase();
                            if (!appDeploymentName) {
                              return;
                            }

                            input.value = '';
                            appDeploymentState.addAppDeployment(appDeploymentName);
                          }}
                        >
                          <input
                            placeholder="Add service by name"
                            className="mx-2 mt-1 max-w-[70%] border-b text-sm"
                            name="appDeploymentName"
                          />
                        </form>
                      </>
                    )}
                    <div className="mb-0 mt-auto border-t p-1 text-right text-xs">
                      Mode{' '}
                      <button
                        className={cn(
                          'mr-1',
                          appDeploymentState.selection !== '*' && 'text-orange-500',
                        )}
                        onClick={appDeploymentState.setGranular}
                      >
                        Granular
                      </button>
                      <button
                        className={cn(
                          'mr-1',
                          appDeploymentState.selection === '*' && 'text-orange-500',
                        )}
                        onClick={appDeploymentState.setAll}
                      >
                        All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col pt-3" />
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button>Confirm</Button>
      </DialogFooter>
    </>
  );
}

function Row(props: { title: string; isActive?: boolean; onClick?: () => void }) {
  return (
    <button
      className="flex cursor-pointer items-center space-x-1 px-2 py-1 data-[active=true]:cursor-default data-[active=true]:bg-white data-[active=true]:text-black"
      data-active={props.isActive}
      onClick={props.onClick}
    >
      <span className="text-sm">{props.title}</span>
      {props.isActive && <ChevronRightIcon size={12} />}
    </button>
  );
}

import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Circle, Settings, TriangleAlertIcon, WandSparkles, XIcon } from 'lucide-react';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { DiffEditor } from '@/components/ui/diff-editor';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { Select } from '@/components/ui/primitives/floating/select/select';
import { Input } from '@/components/ui/primitives/input/input';
import { Tabs } from '@/components/ui/primitives/tabs/tabs';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import * as shared from '@/styles/shared.css';
import { prettier, schemaTitle } from './util';
import { editorStyles } from './editor.css';

export type Service =
  | {
      __typename: 'CompositeSchema';
      id: string;
      source: string;
      service?: string | null;
      url?: string | null;
    }
  | {
      __typename: 'SingleSchema';
      id: string;
      source: string;
    };

export type ServiceTab =
  | {
      readonly __typename: 'CompositeSchema';
      readonly id: string;
      source: string;
      service?: string | null;
      url?: string | null;
      // indicates that the schema is brand new and never been published.
      // this sets some unique conditions like allowing editing the service name.
      unpublished?: true;
    }
  | {
      readonly __typename: 'SingleSchema';
      readonly id: string;
      source: string;
    };

const Proposals_SelectFragment = graphql(`
  fragment Proposals_SelectFragment on Target {
    id
    slug
    latestValidSchemaVersion {
      id
      schemas {
        edges {
          cursor
          node {
            __typename
            ... on CompositeSchema {
              id
              source
              service
              url
            }
            ... on SingleSchema {
              id
              source
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

const Proposals_TargetProjectTypeFragment = graphql(`
  fragment Proposals_TargetProjectTypeFragment on Target {
    id
    project {
      id
      type
    }
  }
`);

export type Proposals_TargetProjectTypeFragmentType = FragmentType<
  typeof Proposals_TargetProjectTypeFragment
>;
export type Proposals_SelectFragmentType = FragmentType<typeof Proposals_SelectFragment>;

export function ProposalEditor(props: {
  projectTypeFragment: Proposals_TargetProjectTypeFragmentType | undefined;
  selectFragment: Proposals_SelectFragmentType | undefined;
  changedServices: Array<ServiceTab>;
  setChangedServices: (s: Array<ServiceTab>) => void;
  existingServices: Array<Service>;
  error?: false | ReactElement;
}) {
  const { changedServices, setChangedServices } = props;
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    if (changedServices.length - 1 < activeTab) {
      setActiveTab(Math.max(changedServices.length - 1, 0));
    }
  }, [changedServices, activeTab]);

  // Clamped for the render in which the parent shortens the list, before the effect syncs the state.
  const activeIndex = Math.min(activeTab, Math.max(changedServices.length - 1, 0));
  const activeService = changedServices[activeIndex] as ServiceTab | undefined;

  const onAddNewService = useCallback(
    (
      schema:
        | { type: ProjectType.Single }
        | {
            type: ProjectType.Federation | ProjectType.Stitching;
            serviceName: string;
            serviceUrl: string;
          },
    ) => {
      if (schema.type === ProjectType.Single) {
        if (changedServices.length === 0) {
          setChangedServices([{ __typename: 'SingleSchema', id: '', source: '' }]);
          setActiveTab(0);
        }
        return;
      }
      const hasConflictingName = props.existingServices.some(
        s => s.__typename === 'CompositeSchema' && s.service === schema.serviceName,
      );
      if (hasConflictingName) {
        // @todo show error and ask for rename
        return;
      }
      const newService: ServiceTab = {
        __typename: 'CompositeSchema',
        id: '',
        source: '',
        service: schema.serviceName,
        url: schema.serviceUrl,
        unpublished: true,
      };
      setChangedServices([...changedServices, newService]);
      setActiveTab(changedServices.length);
    },
    [changedServices],
  );

  const onAddService = useCallback(
    (serviceId: string) => {
      // check the tab list to be extra safe
      const existing = changedServices.findIndex(s => s.id === serviceId);
      if (existing >= 0) {
        setActiveTab(existing);
        return;
      }

      const addedService = props.existingServices.find(edge => edge.id === serviceId);
      if (addedService) {
        // clone the node so that we can modify the sdl and url without impacting the original
        setChangedServices([
          ...changedServices,
          { ...addedService, source: prettier(addedService.source) },
        ]);
        // select the new last element in the changedServices list
        setActiveTab(changedServices.length);
      }
    },
    [props.existingServices, changedServices],
  );

  const onRemoveTab = useCallback(
    (index: number) => {
      // @todo if changed, add confirmation, "Remove "___" from your proposal?"
      const tabs = changedServices.toSpliced(index, 1);
      setChangedServices(tabs);
      setActiveTab(Math.min(index, tabs.length - 1));
    },
    [changedServices],
  );

  const projectType = useFragment(Proposals_TargetProjectTypeFragment, props.projectTypeFragment);

  useEffect(() => {
    if (props.existingServices.length === 1 && changedServices.length === 0) {
      const oneAndOnlySchema = props.existingServices[0];
      onAddService(oneAndOnlySchema.id);
    } else if (
      projectType?.project.type &&
      props.existingServices.length === 0 &&
      changedServices.length === 0
    ) {
      onAddNewService({
        serviceName: 'new service',
        serviceUrl: '',
        type: projectType.project.type,
      });
    }
  }, [props.existingServices, onAddService, onAddNewService, projectType?.project.type]);

  const serviceTabIds = useMemo(() => {
    return changedServices.map(s => s.id);
  }, [changedServices]);

  const setActiveTabSource = useCallback(
    (source: string | undefined) => {
      changedServices[activeIndex] = { ...changedServices[activeIndex], source: source ?? '' };
      setChangedServices([...changedServices]);
    },
    [activeIndex, changedServices],
  );
  const setActiveTabUrl = useCallback(
    (url: string | undefined) => {
      if (changedServices[activeIndex].__typename === 'CompositeSchema') {
        changedServices[activeIndex] = { ...changedServices[activeIndex], url: url ?? '' };
        setChangedServices([...changedServices]);
      }
    },
    [activeIndex, changedServices],
  );
  const setActiveTabName = useCallback(
    (name: string) => {
      if (changedServices[activeIndex].__typename === 'CompositeSchema') {
        changedServices[activeIndex] = { ...changedServices[activeIndex], service: name };
        setChangedServices([...changedServices]);
      }
    },
    [activeIndex, changedServices],
  );
  /** A reference to the monaco editor so we can force set the value on prettify */
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);

  return (
    <div>
      <div className={editorStyles.tabs}>
        <ServiceSelect
          targetFragment={props.selectFragment ?? undefined}
          onSelect={onAddService}
          selected={serviceTabIds}
          onSelectNew={() => {
            const type = projectType?.project.type;
            if (type === ProjectType.Single) {
              onAddNewService({ type: ProjectType.Single });
            } else if (type) {
              onAddNewService({
                type,
                serviceName: 'new service',
                serviceUrl: '',
              });
            }
          }}
        />
      </div>
      {props.error}
      {activeService && (
        <div className={editorStyles.body}>
          <Tabs
            value={tabValue(activeService, activeIndex)}
            onValueChange={value =>
              setActiveTab(
                changedServices.findIndex((service, idx) => tabValue(service, idx) === value),
              )
            }
            items={changedServices.map((service, idx) => {
              const isActiveTab = idx === activeIndex;
              const isNewService = service.__typename === 'CompositeSchema' && service.unpublished;
              const hasNameConflict =
                isNewService &&
                props.existingServices.some(
                  s => s.__typename === 'CompositeSchema' && s.service === service.service,
                );
              const hasEmptyName = isNewService && !service.service?.trim();
              const nameError = hasNameConflict
                ? 'New service name cannot match an existing service name'
                : hasEmptyName
                  ? 'New service needs a name'
                  : undefined;
              const existing = props.existingServices.find(
                s =>
                  (s.__typename === 'CompositeSchema' &&
                    service.__typename === 'CompositeSchema' &&
                    s.service === service.service) ||
                  (s.__typename === 'SingleSchema' && service.__typename === 'SingleSchema'),
              );
              return {
                value: tabValue(service, idx),
                label: (
                  <>
                    {isNewService ? (
                      <Circle
                        className={editorStyles.changedDot}
                        fill="currentColor"
                        strokeWidth={0}
                      />
                    ) : null}
                    {service.__typename === 'SingleSchema' ? (
                      'single schema'
                    ) : hasEmptyName ? (
                      // The tab keeps its width and a name while the field is empty.
                      <span className={editorStyles.unnamed}>unnamed service</span>
                    ) : (
                      schemaTitle(service)
                    )}
                    {nameError ? <TriangleAlertIcon className={editorStyles.errorIcon} /> : null}
                    {service.__typename === 'CompositeSchema' ? (
                      <span className={editorStyles.close} onClick={() => onRemoveTab(idx)}>
                        <XIcon className={editorStyles.closeIcon({ hidden: !isActiveTab })} />
                      </span>
                    ) : null}
                  </>
                ),
                tooltip: nameError,
                content: (
                  <div className={editorStyles.pane}>
                    <div className={editorStyles.toolbar}>
                      <button
                        type="button"
                        className={editorStyles.toolbarButton}
                        title="Prettify schema"
                        onClick={() => {
                          const prettierSource = prettier(activeService?.source ?? '');
                          setActiveTabSource(prettierSource);
                          editor?.setValue(prettierSource);
                        }}
                      >
                        <WandSparkles className={editorStyles.toolbarIcon} />
                      </button>
                      {service.__typename === 'CompositeSchema' && (
                        <Popover
                          trigger={
                            <button
                              type="button"
                              className={editorStyles.toolbarButton}
                              aria-label="Edit schema settings"
                              title="Edit schema settings"
                            >
                              <Settings className={editorStyles.toolbarIcon} />
                            </button>
                          }
                          align="end"
                          width="sm"
                          title="Settings"
                          description="Additional service configuration"
                          content={
                            <div className={editorStyles.settings}>
                              {isNewService && (
                                <div>
                                  <div className={editorStyles.settingsLabel}>Service name</div>
                                  <Input
                                    onSurface="raised"
                                    value={service.service ?? ''}
                                    onChange={ev => setActiveTabName(ev.target.value)}
                                    invalid={nameError != null}
                                  />
                                  {nameError && (
                                    <p className={editorStyles.settingsError}>{nameError}</p>
                                  )}
                                </div>
                              )}
                              <div>
                                <div className={editorStyles.settingsLabel}>Service URL</div>
                                <Input
                                  onSurface="raised"
                                  value={service.url ?? ''}
                                  onChange={ev => setActiveTabUrl(ev.target.value)}
                                />
                              </div>
                              {/* The X on the tab sits inside the tab button, out of the keyboard's reach. */}
                              <div>
                                <Button
                                  variant="destructive"
                                  size="compact"
                                  onClick={() => onRemoveTab(idx)}
                                >
                                  Remove from proposal
                                </Button>
                              </div>
                            </div>
                          }
                        />
                      )}
                    </div>
                    <DiffEditor
                      before={existing?.source ?? ''}
                      after={service.source ?? ''}
                      editable
                      lineNumbers
                      onMount={setEditor}
                      onChange={setActiveTabSource}
                    />
                  </div>
                ),
              };
            })}
          />
        </div>
      )}
    </div>
  );
}

/** Identity for a service's tab: published services keep it across reorders, new ones sit by index. */
function tabValue(service: ServiceTab, idx: number) {
  return service.id ? `tab-${service.id}` : `new-${idx}`;
}

function ServiceSelect(props: {
  targetFragment: FragmentType<typeof Proposals_SelectFragment> | undefined;
  selected: string[];
  onSelect: (schemaId: string) => void;
  onSelectNew: () => void;
}) {
  const target = useFragment(Proposals_SelectFragment, props.targetFragment);
  const schemaEdges = target?.latestValidSchemaVersion?.schemas.edges;
  const selectableServices = useMemo(() => {
    return (
      schemaEdges
        ?.filter(s => !props.selected.includes(s.node.id))
        .map(edge => ({ value: `${edge.node.id}`, label: schemaTitle(edge.node) })) ?? []
    );
  }, [props.selected, schemaEdges]);

  if (props.targetFragment === undefined) {
    return null;
  }

  return schemaEdges && schemaEdges.length > 1 ? (
    <div className={editorStyles.serviceSelect}>
      <Select
        aria-label="Add a service"
        options={selectableServices}
        value=""
        onValueChange={props.onSelect}
        label="Select a service..."
        disabled={selectableServices.length === 0}
        width="md"
      />
      <Button variant="link" onClick={props.onSelectNew}>
        <span className={shared.nowrap}>
          + New<span className={editorStyles.serviceSelectLabel}>&nbsp;Service</span>
        </span>
      </Button>
    </div>
  ) : null;
}

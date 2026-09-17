import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { Select } from '@/components/base/floating/select/select';
import { Input } from '@/components/base/input/input';
import { Tabs } from '@/components/base/tabs/tabs';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, XIcon } from '@/components/ui/icon';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { DiffEditor } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { DotFilledIcon, GearIcon, MagicWandIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import { prettier, schemaTitle } from './util';

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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  projectTypeFragment: Proposals_TargetProjectTypeFragmentType | undefined;
  selectFragment: Proposals_SelectFragmentType | undefined;
  changedServices: Array<ServiceTab>;
  setChangedServices: (s: Array<ServiceTab>) => void;
  existingServices: Array<Service>;
  error?: false | ReactElement;
}) {
  const { changedServices, setChangedServices } = props;
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (changedServices.length - 1 < activeTab) {
      setActiveTab(Math.max(changedServices.length - 1, 0));
    }
  }, [changedServices, activeTab]);

  const activeService = changedServices[activeTab] as ServiceTab | undefined;

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
      changedServices[activeTab] = { ...changedServices[activeTab], source: source ?? '' };
      setChangedServices([...changedServices]);
    },
    [activeTab, changedServices],
  );
  const setActiveTabUrl = useCallback(
    (url: string | undefined) => {
      if (changedServices[activeTab].__typename === 'CompositeSchema') {
        changedServices[activeTab] = { ...changedServices[activeTab], url: url ?? '' };
        setChangedServices([...changedServices]);
      }
    },
    [activeTab, changedServices],
  );
  const setActiveTabName = useCallback(
    (name: string) => {
      if (changedServices[activeTab].__typename === 'CompositeSchema') {
        changedServices[activeTab] = { ...changedServices[activeTab], service: name };
        setChangedServices([...changedServices]);
      }
    },
    [activeTab, changedServices],
  );
  const onToggleTabSettings = (e: any) => {
    e?.preventDefault?.();
    setShowSettings(!showSettings);
  };
  /** A reference to the monaco editor so we can force set the value on prettify */
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);

  return (
    <div>
      <div className="flex grow border-b pb-4 pl-2">
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
      {(activeService || changedServices.length > 0) && (
        <div className="mt-4">
          <Tabs
            value={activeService ? tabValue(activeService, activeTab) : undefined}
            onValueChange={value =>
              setActiveTab(
                changedServices.findIndex((service, idx) => tabValue(service, idx) === value),
              )
            }
            items={changedServices.map((service, idx) => {
              const isActiveTab = idx === activeTab;
              const isNewService = service.__typename === 'CompositeSchema' && service.unpublished;
              const hasNameConflict =
                isNewService &&
                props.existingServices.some(
                  s => s.__typename === 'CompositeSchema' && s.service === service.service,
                );
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
                      <DotFilledIcon className="-ml-2 size-4 text-green-600" />
                    ) : null}
                    {service.__typename === 'SingleSchema' ? 'single schema' : schemaTitle(service)}
                    {hasNameConflict ? <AlertTriangleIcon className="size-4 text-red-600" /> : null}
                    {service.__typename === 'CompositeSchema' ? (
                      <span className="ml-2" onClick={() => onRemoveTab(idx)}>
                        <XIcon className={cn('size-4', !isActiveTab && 'hidden')} />
                      </span>
                    ) : null}
                  </>
                ),
                tooltip: hasNameConflict
                  ? 'New service name cannot match an existing service name'
                  : undefined,
                content: (
                  <div className="relative rounded-sm border">
                    <div className="flex items-center justify-end border-b px-2 py-1">
                      <Link
                        className="hover:text-accent ml-2 cursor-pointer p-1"
                        title="Prettify schema"
                        onClick={e => {
                          e.preventDefault();
                          const prettierSource = prettier(activeService?.source ?? '');
                          setActiveTabSource(prettierSource);
                          editor?.setValue(prettierSource);
                        }}
                      >
                        <MagicWandIcon className="size-4" />
                      </Link>
                      <Link
                        className={cn(
                          'hover:text-accent ml-2 cursor-pointer p-1',
                          showSettings && 'border-accent border-b-2',
                          projectType?.project.type === ProjectType.Single && 'hidden',
                        )}
                        title="Edit schema settings"
                        onClick={onToggleTabSettings}
                      >
                        <GearIcon />
                      </Link>
                    </div>
                    <DiffEditor
                      before={existing?.source ?? ''}
                      after={service.source ?? ''}
                      editable
                      lineNumbers
                      onMount={setEditor}
                      onChange={setActiveTabSource}
                    />
                    {showSettings && service.__typename === 'CompositeSchema' && (
                      <div className="bg-neutral-1 absolute right-0 top-0 z-10 h-full w-[20vw] min-w-[200px] max-w-full border p-4 pt-6 text-sm">
                        {!!service.service && (
                          <SubPageLayoutHeader
                            subPageTitle="Settings"
                            description={<p className="pb-4">Additional service configuration</p>}
                          />
                        )}
                        {isNewService && (
                          <>
                            <div className="my-2 font-semibold">Service name</div>
                            <Input
                              value={service.service ?? ''}
                              onChange={ev => setActiveTabName(ev.target.value)}
                              invalid={hasNameConflict}
                            />
                            {hasNameConflict && (
                              <p className="text-critical mt-1 text-xs">
                                New service name cannot match an existing service name
                              </p>
                            )}
                          </>
                        )}
                        <div className="my-2 font-semibold">Service URL</div>
                        <Input
                          value={service.url ?? ''}
                          onChange={ev => setActiveTabUrl(ev.target.value)}
                        />
                      </div>
                    )}
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
    <div className="flex grow flex-row">
      <Select
        options={selectableServices}
        value=""
        onValueChange={props.onSelect}
        label="Select a service..."
        disabled={selectableServices.length === 0}
        width="md"
      />
      <Button variant="orangeLink" className="ml-0 whitespace-nowrap" onClick={props.onSelectNew}>
        + New<span className="hidden sm:inline-block">&nbsp;Service</span>
      </Button>
    </div>
  ) : null;
}

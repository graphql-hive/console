import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { editor } from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { AlertTriangleIcon, XIcon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { DotFilledIcon, GearIcon, MagicWandIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import { SchemaEditor } from '@theguild/editor';
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
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const setActiveTabAndScroll = (tab: number) => {
    setActiveTab(tab);
    // scroll to the activated tab
    setTimeout(() => {
      if (tabsRef?.current) {
        const left = (tabsRef.current.childNodes.item(Math.max(tab - 1, 0)) as any)?.offsetLeft;
        if (left) {
          tabsRef.current.scrollTo({ left: left + 100 });
        }
      }
    });
  };
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
      setActiveTabAndScroll(changedServices.length);
    },
    [changedServices],
  );

  const onAddService = useCallback(
    (serviceId: string) => {
      // check the tab list to be extra safe
      const existing = changedServices.findIndex(s => s.id === serviceId);
      if (existing >= 0) {
        setActiveTabAndScroll(existing);
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
        setActiveTabAndScroll(changedServices.length);
      }
    },
    [props.existingServices, changedServices],
  );

  const onRemoveTab = useCallback(
    (index: number) => {
      // @todo if changed, add confirmation, "Remove "___" from your proposal?"
      const tabs = changedServices.toSpliced(index, 1);
      setChangedServices(tabs);
      setActiveTabAndScroll(Math.min(index, tabs.length - 1));
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
      {(activeService || changedServices.length > 0) && (
        <Tabs
          value={`${activeTab}`}
          onValueChange={idx => {
            try {
              setActiveTab(parseInt(idx, 10));
            } catch (e) {
              console.error('Cannot set active tab. Could not parse index.');
            }
          }}
        >
          <div className="mt-4 flex w-full flex-row pl-2">
            <TabsList
              ref={tabsRef}
              className="no-scrollbar [&>*:not:(:first-child)]:mr-2 mr-auto max-w-full justify-normal overflow-x-auto whitespace-nowrap rounded-b-none p-2 pb-0 text-sm"
            >
              {changedServices.map((service, idx) => {
                const isActiveTab = idx === activeTab;
                if (service.__typename === 'SingleSchema') {
                  return (
                    <TabsTrigger
                      variant="default"
                      value={`${idx}`}
                      asChild
                      key={service.id.length ? `changed-${service.id}` : `tab-${idx}`}
                    >
                      <div className="p-2 font-bold">single schema</div>
                    </TabsTrigger>
                  );
                }
                return (
                  <TabsTrigger
                    variant="default"
                    value={`${idx}`}
                    asChild
                    key={service.unpublished ? `newtab-${idx}` : `tab-${service.id}`}
                  >
                    <div className="flex items-center p-2 font-bold">
                      {service.unpublished ? (
                        <>
                          <DotFilledIcon className="-ml-2 size-4 text-green-600" />
                          <Input
                            className="h-auto min-w-[150px] rounded-none border-none bg-transparent p-0 leading-none"
                            value={schemaTitle(service)}
                            onChange={e => {
                              service.service = e.target.value;
                              setChangedServices([...changedServices]);
                            }}
                          />
                          {props.existingServices.some(
                            s =>
                              s.__typename === 'CompositeSchema' && s.service === service.service,
                          ) && (
                            <TooltipProvider delayDuration={0} skipDelayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangleIcon className="size-4 text-red-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  New service name cannot match an existing service name
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      ) : (
                        schemaTitle(service)
                      )}
                      <div
                        className="ml-2"
                        onClick={() => {
                          onRemoveTab(idx);
                        }}
                      >
                        <XIcon className={cn('size-4', !isActiveTab && 'hidden')} />
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <div className="flex flex-row items-center justify-end">
              <Link
                className="ml-2 cursor-pointer p-1 hover:text-orange-500"
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
                  'ml-2 cursor-pointer p-1 hover:text-orange-500',
                  showSettings && 'border-b-2 border-orange-500',
                  projectType?.project.type === ProjectType.Single && 'hidden',
                )}
                title="Edit schema settings"
                onClick={onToggleTabSettings}
              >
                <GearIcon />
              </Link>
            </div>
          </div>
          {changedServices.map((service, idx) => {
            return (
              <TabsContent
                value={`${idx}`}
                key={
                  service.__typename === 'CompositeSchema' && service.unpublished
                    ? `new-${idx}`
                    : `tab-${service.id}`
                }
                className="relative mt-0 py-0"
              >
                <SchemaEditor
                  theme="vs-dark"
                  height={400}
                  className="border"
                  schema={service.source ?? ''}
                  onMount={setEditor}
                  onChange={setActiveTabSource}
                />
                {showSettings && service.__typename === 'CompositeSchema' && (
                  <div className="absolute right-0 top-0 z-10 h-full w-[20vw] min-w-[200px] max-w-full border bg-black p-4 pt-6 text-sm">
                    {!!service.service && (
                      <SubPageLayoutHeader
                        subPageTitle="Settings"
                        description={
                          <CardDescription className="pb-4">
                            Additional service configuration
                          </CardDescription>
                        }
                      />
                    )}
                    <div className="my-2 font-semibold">Service URL</div>
                    <Input
                      value={service.url ?? ''}
                      onChange={ev => setActiveTabUrl(ev.target.value)}
                      className="text-xs"
                    />
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
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
        .map((edge, i) => (
          <SelectItem
            key={`${edge.cursor}-${i}`}
            value={`${edge.node.id}`}
            data-cy={`project-picker-option-${edge.node.id}`}
          >
            {schemaTitle(edge.node)}
          </SelectItem>
        )) ?? []
    );
  }, [props.selected, schemaEdges]);

  if (props.targetFragment === undefined) {
    return null;
  }

  return schemaEdges && schemaEdges.length > 1 ? (
    <div className="flex grow flex-row">
      <Select onValueChange={props.onSelect} value="">
        <SelectTrigger
          variant="default"
          data-cy="project-picker-trigger"
          className="min-w-[200px] max-w-[15vw] font-medium"
          disabled={selectableServices.length === 0}
        >
          Select a service...
        </SelectTrigger>
        <SelectContent>{selectableServices}</SelectContent>
      </Select>
      <Button variant="orangeLink" className="ml-0 whitespace-nowrap" onClick={props.onSelectNew}>
        + New<span className="hidden sm:inline-block">&nbsp;Service</span>
      </Button>
    </div>
  ) : null;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSchema, parse, print } from 'graphql';
import { editor } from 'monaco-editor';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { ProposalChangeDetail } from '@/components/target/proposals/change-detail';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { CardDescription } from '@/components/ui/card';
import { AlertTriangleIcon, XIcon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { Change, CriticalityLevel, diff } from '@graphql-inspector/core';
import {
  DotFilledIcon,
  ExclamationTriangleIcon,
  GearIcon,
  MagicWandIcon,
} from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import { SchemaEditor } from '@theguild/editor';

type Service =
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

type ServiceTab =
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

function prettier(source: string) {
  try {
    return print(parse(source));
  } catch (e) {
    console.warn(e);
    return source;
  }
}

const ProposalsNewProposalQuery = graphql(`
  query ProposalsNewProposalQuery($targetReference: TargetReferenceInput!) {
    target(reference: $targetReference) {
      ...Proposals_SelectFragment
      ...Proposals_TargetProjectTypeFragment
      id
      slug
      project {
        id
        type
      }
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
  }
`);

export function TargetProposalsNewPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Schema proposals" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Proposals}
        className="flex h-[--content-height] min-h-[300px] flex-col pb-0"
      >
        <ProposalsNewHeading {...props} />
        <ProposalsNewContent {...props} />
      </TargetLayout>
    </>
  );
}

function ProposalsNewHeading(props: Parameters<typeof TargetProposalsNewPage>[0]) {
  return (
    <div className="flex py-6">
      <div className="flex-1">
        <SubPageLayoutHeader
          subPageTitle={
            <span className="flex items-center">
              <Link
                className="text-white"
                to="/$organizationSlug/$projectSlug/$targetSlug/proposals"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
              >
                Schema Proposals
              </Link>{' '}
              <span className="inline-block px-2 italic text-gray-500">/</span> New
            </span>
          }
          description={
            <CardDescription>
              Collaborate on schema changes to reduce friction during development.
            </CardDescription>
          }
        />
      </div>
    </div>
  );
}

function schemaTitle(
  schema:
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
      },
): string {
  if (schema.__typename === 'CompositeSchema') {
    return schema.service ?? schema.url ?? schema.id;
  }
  return '';
}

function ProposalsNewContent(
  props: Parameters<typeof TargetProposalsNewPage>[0] & { page?: string },
) {
  const [query] = useQuery({
    query: ProposalsNewProposalQuery,
    variables: {
      targetReference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
    },
  });
  const existingServices = useMemo(() => {
    return query.data?.target?.latestValidSchemaVersion?.schemas.edges.map(e => e.node);
  }, [query.data]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [page, setPage] = useState('overview');
  const onNextPage = useCallback(() => {
    if (page === 'overview') {
      setPage('editor');
    }
    // @todo
  }, [page]);
  const [changedServices, setChangedServices] = useState<Array<ServiceTab>>([]);

  if (query.error) {
    return (
      <Callout type="error" className="mx-auto w-2/3">
        <b>Oops, something went wrong.</b>
        <br />
        {query.error.message}
      </Callout>
    );
  }

  return (
    <Tabs orientation="vertical" className="flex" value={page} onValueChange={setPage}>
      <TabsList
        variant="content"
        className={cn(
          'flex h-full w-[20vw] min-w-[160px] flex-col items-start border-0',
          '[&>*]:flex [&>*]:w-full [&>*]:justify-start [&>*]:p-3',
        )}
      >
        <TabsTrigger variant="menu" value="overview" asChild>
          <Link>Overview</Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value="editor" asChild>
          <Link>Editor</Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value="changes" asChild className="mb-2">
          <Link>Changes</Link>
        </TabsTrigger>
        {/* @todo disable if proposal is invalid */}
        <div className="mt-6">
          <Button variant="ghost" className="mt-2 w-full justify-center px-3 font-bold">
            Submit Proposal
          </Button>
        </div>
      </TabsList>
      <div className="w-full flex-col items-start overflow-x-hidden pl-8 [&>*]:pt-0">
        <OverviewTab
          title={title}
          description={description}
          setTitle={setTitle}
          setDescription={setDescription}
          onNextPage={onNextPage}
        />
        {query.fetching ? (
          <Spinner />
        ) : (
          <>
            <EditorTab
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              changedServices={changedServices}
              setChangedServices={setChangedServices}
              existingServices={existingServices ?? []}
              projectTypeFragment={query.data?.target ?? undefined}
              selectFragment={query.data?.target ?? undefined}
            />
            <ChangesTab
              changedServices={changedServices}
              existingServices={existingServices ?? []}
            />
          </>
        )}
      </div>
    </Tabs>
  );
}

function ChangesTab(props: {
  changedServices: Array<ServiceTab>;
  existingServices: Array<Service>;
}) {
  return (
    <TabsContent value="changes">
      <ServiceChanges
        changedServices={props.changedServices}
        existingServices={props.existingServices}
      />
    </TabsContent>
  );
}

function ServiceChanges(props: {
  changedServices: Array<ServiceTab>;
  existingServices: Array<Service>;
}) {
  const [changes, setChanges] = useState<
    { service: ServiceTab; changes: Change<any>[]; error?: string }[]
  >([]);
  const [calculatingChanges, setCalculatingChanges] = useState(false);

  useEffect(() => {
    let canceled = false;

    const diffSchemas = async () => {
      let idx = 0;
      const _changes = [...changes];
      for (const s of props.changedServices) {
        let change: (typeof changes)[number];
        const existingService = props.existingServices.find(existing => existing.id === s.id);
        if (existingService) {
          try {
            const existingSchema = buildSchema(existingService.source, {
              assumeValid: true,
              assumeValidSDL: true,
            });
            const proposedSchema = buildSchema(s.source, {
              // @todo consider not assuming valid...
              // this is a workaround for missing federation directive definitions
              assumeValid: true,
              assumeValidSDL: true,
            });
            // @todo calculate from the supergraph...
            change = { service: s, changes: await diff(existingSchema, proposedSchema) };
          } catch (e: unknown) {
            change = { service: s, changes: [], error: e instanceof Error ? e.message : String(e) };
            console.warn(e);
          }
        } else {
          try {
            // check that schema is valid
            buildSchema(s.source);
            change = {
              service: s,
              changes: [
                {
                  criticality: {
                    level: CriticalityLevel.NonBreaking,
                    reason: 'Adding a new service is safe.',
                  },
                  type: '',
                  meta: null,
                  message: `Schema "${schemaTitle(s)}" added`,
                },
              ],
            };
          } catch (e: unknown) {
            change = { service: s, changes: [], error: e instanceof Error ? e.message : String(e) };
            console.warn(e);
          }
        }

        if (_changes[idx]) {
          _changes[idx] = change;
        } else {
          _changes.push(change);
        }

        if (canceled) {
          return;
        }
        setChanges(_changes);
        idx++;
      }
      if (_changes.length > props.changedServices.length) {
        _changes.slice(0, Math.max(props.changedServices.length - 1, 0));
      }

      if (canceled) {
        return;
      }
      setChanges(_changes);
      setCalculatingChanges(false);
    };

    setCalculatingChanges(true);
    void diffSchemas();

    return () => {
      canceled = true;
    };
  }, [props.changedServices]);

  const changeElements = useMemo(() => {
    return changes.map((c, idx) => {
      return (
        <div key={c.service.id.length ? `changes-${c.service.id}` : `new-${idx}`}>
          <h2 className="mb-2 flex items-center font-bold text-gray-900 dark:text-white">
            {schemaTitle(c.service)}
          </h2>
          <div className="mb-6">
            {c.error ? (
              <div className="flex items-center text-red-500">
                <ExclamationTriangleIcon className="mr-2" />
                {c.error}
              </div>
            ) : (
              c.changes.length === 0 && 'No changes.'
            )}
            {c.changes.map((change, changeIndex) => {
              return (
                <ProposalChangeDetail
                  change={change}
                  key={`${change.type}-${change.path ?? changeIndex}`}
                />
              );
            })}
          </div>
        </div>
      );
    });
  }, [changes]);
  return (
    <>
      {calculatingChanges && (
        <div className="text-xs">
          Calculating latest changes... <Spinner />
        </div>
      )}
      {changeElements.length === 0 && (
        <div className="mt-8 text-center">
          <h2 className="mb-2 text-3xl font-bold">No changes</h2>
          <h3 className="text-xl font-semibold">
            Use the "Editor" to make modifications to your schema(s)
          </h3>
        </div>
      )}
      {changeElements}
    </>
  );
}

const Proposals_TargetProjectTypeFragment = graphql(`
  fragment Proposals_TargetProjectTypeFragment on Target {
    project {
      id
      type
    }
  }
`);

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
      <Button variant="orangeLink" className="ml-4 whitespace-nowrap" onClick={props.onSelectNew}>
        + New Service
      </Button>
    </div>
  ) : null;
}

function EditorTab(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  projectTypeFragment: FragmentType<typeof Proposals_TargetProjectTypeFragment> | undefined;
  selectFragment: FragmentType<typeof Proposals_SelectFragment> | undefined;
  changedServices: Array<ServiceTab>;
  setChangedServices: (s: Array<ServiceTab>) => void;
  existingServices: Array<Service>;
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
      setActiveTab(changedServices.length - 1);
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

  useEffect(() => {
    if (props.existingServices.length === 1 && changedServices.length === 0) {
      const oneAndOnlySchema = props.existingServices[0];
      onAddService(oneAndOnlySchema.id);
    }
  }, [props.existingServices, onAddService]);

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
  const onToggleTabSettings = () => {
    setShowSettings(!showSettings);
  };
  /** A reference to the monaco editor so we can force set the value on prettify */
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
  const projectType = useFragment(Proposals_TargetProjectTypeFragment, props.projectTypeFragment);

  return (
    <TabsContent value="editor">
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
                      <div className="p-2">
                        <Link className="font-bold">single schema</Link>
                      </div>
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
                    <div className="p-2">
                      <Link className="flex items-center font-bold">
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
                      </Link>
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
                onClick={() => {
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
    </TabsContent>
  );
}

function OverviewTab(props: {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  onNextPage?: () => void;
}) {
  return (
    <TabsContent className="max-w-[600px]" value="overview">
      <div className="pb-10">
        <Label htmlFor="proposal-title" className="p-1">
          Title
        </Label>
        <Input
          aria-label="title"
          id="proposal-title"
          name="proposal-title"
          className="mt-2"
          value={props.title}
          onChange={e => props.setTitle(e.currentTarget.value)}
        />
      </div>
      <div className="pb-10">
        <Label className="p-1" htmlFor="proposal-description">
          Description
        </Label>
        <Textarea
          aria-label="description"
          id="proposal-description"
          name="proposal-description"
          className="mt-2"
          value={props.description}
          onChange={e => props.setDescription(e.currentTarget.value)}
        />
      </div>
      {props.onNextPage !== undefined && (
        <div className="text-right">
          <Button variant="outline" className="mb-10" onClick={props.onNextPage}>
            Next
          </Button>
        </div>
      )}
    </TabsContent>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
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
import { DotFilledIcon, GearIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import { SchemaEditor } from '@theguild/editor';

const ProposalsNewProposalEditorQuery = graphql(`
  query ProposalsNewProposalEditorQuery($targetReference: TargetReferenceInput!) {
    target(reference: $targetReference) {
      ...Proposals_SelectFragment
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [page, setPage] = useState('overview');
  const onNextPage = useCallback(() => {
    if (page === 'overview') {
      setPage('editor');
    }
    // @todo
  }, [page]);
  return (
    <Tabs orientation="vertical" className="flex" value={page} onValueChange={setPage}>
      <TabsList
        variant="content"
        className={cn(
          'flex h-full w-[15vw] min-w-[120px] flex-col items-start',
          '[&>*]:flex [&>*]:w-full [&>*]:justify-start [&>*]:p-1 [&>*]:py-4',
        )}
      >
        <TabsTrigger variant="content" value="overview" asChild>
          <Link>Overview</Link>
        </TabsTrigger>
        <TabsTrigger variant="content" value="editor" asChild>
          <Link>Editor</Link>
        </TabsTrigger>
        <TabsTrigger variant="content" value="changes" asChild>
          <Link>Changes</Link>
        </TabsTrigger>
      </TabsList>
      <div className="w-full flex-col items-start overflow-x-hidden pl-8 [&>*]:pt-0">
        <OverviewTab
          title={title}
          description={description}
          setTitle={setTitle}
          setDescription={setDescription}
          onNextPage={onNextPage}
        />
        <EditorTab
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
        />
        <TabsContent value="changes">TODO</TabsContent>
      </div>
    </Tabs>
  );
}

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

function EditorTab(props: { organizationSlug: string; projectSlug: string; targetSlug: string }) {
  const [query] = useQuery({
    query: ProposalsNewProposalEditorQuery,
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
  // note: schemas is not paginated for some reason...
  const schemaEdges = query.data?.target?.latestValidSchemaVersion?.schemas.edges ?? [];
  const [serviceTabs, setServiceTabs] = useState<Array<ServiceTab>>([]);
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

  useEffect(() => {
    if (serviceTabs.length - 1 < activeTab) {
      setActiveTab(serviceTabs.length - 1);
    }
  }, [serviceTabs, activeTab]);

  const activeService = serviceTabs[activeTab] as ServiceTab | undefined;

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
        if (serviceTabs.length === 0) {
          setServiceTabs([{ __typename: 'SingleSchema', id: '', source: '' }]);
          setActiveTab(0);
        }
        return;
      }
      const hasConflictingName = schemaEdges.some(
        s => s.node.__typename === 'CompositeSchema' && s.node.service === schema.serviceName,
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
      setServiceTabs([...serviceTabs, newService]);
      setActiveTabAndScroll(serviceTabs.length);
    },
    [serviceTabs],
  );

  const onAddService = useCallback(
    (serviceId: string) => {
      // check the tab list to be extra safe
      const existing = serviceTabs.findIndex(s => s.id === serviceId);
      if (existing >= 0) {
        setActiveTabAndScroll(existing);
        return;
      }

      const addedService = schemaEdges.find(edge => edge.node.id === serviceId);
      if (addedService) {
        // clone the node so that we can modify the sdl and url without impacting the original
        setServiceTabs([...serviceTabs, { ...addedService.node }]);
        // select the new last element in the serviceTabs list
        setActiveTabAndScroll(serviceTabs.length);
      }
    },
    [schemaEdges, serviceTabs],
  );

  const onRemoveTab = useCallback(
    (index: number) => {
      // @todo if changed, add confirmation, "Remove "___" from your proposal?"
      const tabs = serviceTabs.toSpliced(index, 1);
      setServiceTabs(tabs);
      setActiveTabAndScroll(Math.min(index, tabs.length - 1));
    },
    [serviceTabs],
  );

  useEffect(() => {
    if (schemaEdges?.length === 1 && serviceTabs.length === 0) {
      const oneAndOnlySchema = schemaEdges[0].node;
      onAddService(oneAndOnlySchema.id);
    }
  }, [schemaEdges, onAddService]);

  const serviceTabIds = useMemo(() => {
    return serviceTabs.map(s => s.id);
  }, [serviceTabs]);

  const setActiveTabSource = useCallback(
    (source: string) => {
      serviceTabs[activeTab].source = source;
      setServiceTabs(serviceTabs);
    },
    [activeTab, serviceTabs],
  );

  if (query.fetching) {
    return <Spinner />;
  }
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
    <TabsContent value="editor">
      <div className="flex grow border-b pb-4 pl-2">
        <ServiceSelect
          targetFragment={query.data?.target ?? undefined}
          onSelect={onAddService}
          selected={serviceTabIds}
          onSelectNew={() => {
            const type = query.data?.target?.project.type;
            if (type === ProjectType.Single) {
              onAddNewService({ type: ProjectType.Single });
            } else if (type) {
              onAddNewService({
                type,
                serviceName: 'new service',
                serviceUrl: 'https://localhost:3000',
              });
            }
          }}
        />
        <div>
          <Button variant="default">Submit</Button>
        </div>
      </div>
      {(activeService || serviceTabs.length > 0) && (
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
              {serviceTabs.map((service, idx) => {
                const isActiveTab = idx === activeTab;
                if (service.__typename === 'SingleSchema') {
                  return (
                    <div className="p-2" key={`tab-${service.id}`}>
                      <Link className="font-bold">{query.data?.target?.slug ?? 'monolith'}</Link>
                    </div>
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
                                setServiceTabs([...serviceTabs]);
                              }}
                            />
                            {service.unpublished &&
                              schemaEdges.some(
                                s => (s.node as any).service === service.service,
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
            {
              <div className="flex flex-row items-center justify-end">
                <div className="ml-2 cursor-pointer p-1" title="settings">
                  <GearIcon />
                </div>
                {/* <div className="ml-2 cursor-pointer p-1" title="save">
                <SaveIcon className="size-4" />
              </div> */}
              </div>
            }
          </div>
          {serviceTabs.map((service, idx) => {
            return (
              <TabsContent
                value={`${idx}`}
                key={
                  service.__typename === 'CompositeSchema' && service.unpublished
                    ? `new-${idx}`
                    : `tab-${service.id}`
                }
                className="mt-0 py-0"
              >
                <SchemaEditor
                  theme="vs-dark"
                  height={400}
                  className="border"
                  schema={service.source ?? ''}
                  onChange={setActiveTabSource}
                />
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

import { ReactElement, ReactNode, useMemo, useState } from 'react';
import { LinkIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HiveLink } from '@/components/ui/hive-link';
import { InputCopy } from '@/components/ui/input-copy';
import { Link as UiLink } from '@/components/ui/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserMenu } from '@/components/ui/user-menu';
import { graphql } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { getDocsUrl } from '@/lib/docs-url';
import { useToggle } from '@/lib/hooks';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { ResourceNotFoundComponent } from '../resource-not-found';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TargetSelector } from './target-selector';

export enum Page {
  Schema = 'schema',
  Explorer = 'explorer',
  Checks = 'checks',
  History = 'history',
  Insights = 'insights',
  Laboratory = 'laboratory',
  Apps = 'apps',
  Settings = 'settings',
}

const TargetLayoutQuery = graphql(`
  query TargetLayoutQuery($organizationSlug: String!, $projectSlug: String!, $targetSlug: String!) {
    me {
      id
      ...UserMenu_MeFragment
    }
    organizations {
      ...TargetSelector_OrganizationConnectionFragment
      ...UserMenu_OrganizationConnectionFragment
    }
    isCDNEnabled
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        target: targetBySlug(targetSlug: $targetSlug) {
          id
          slug
          viewerCanViewLaboratory
          viewerCanViewAppDeployments
          viewerCanAccessSettings
        }
      }
    }
  }
`);

export const TargetLayout = ({
  children,
  connect,
  page,
  className,
  ...props
}: {
  page: Page;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  className?: string;
  children: ReactNode;
  connect?: ReactNode;
}): ReactElement | null => {
  const [isModalOpen, toggleModalOpen] = useToggle();
  const [query] = useQuery({
    query: TargetLayoutQuery,
    requestPolicy: 'cache-first',
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });

  const me = query.data?.me;
  const currentOrganization = query.data?.organization;
  const currentProject = query.data?.organization?.project;
  const currentTarget = query.data?.organization?.project?.target;

  const isCDNEnabled = query.data?.isCDNEnabled === true;

  useLastVisitedOrganizationWriter(currentOrganization?.slug);

  return (
    <>
      <header>
        <div className="container flex h-[--header-height] items-center justify-between">
          <div className="flex flex-row items-center gap-4">
            <HiveLink className="size-8" />
            <TargetSelector
              organizations={query.data?.organizations ?? null}
              currentOrganizationSlug={props.organizationSlug}
              currentProjectSlug={props.projectSlug}
              currentTargetSlug={props.targetSlug}
            />
          </div>
          <div>
            <UserMenu
              me={me ?? null}
              currentOrganizationSlug={props.organizationSlug}
              organizations={query.data?.organizations ?? null}
            />
          </div>
        </div>
      </header>

      {query.fetching === false &&
      query.stale === false &&
      (currentProject === null || currentOrganization === null || currentTarget === null) ? (
        <ResourceNotFoundComponent title="404 - This project does not seem to exist." />
      ) : (
        <>
          <div className="relative h-[--tabs-navbar-height] border-b border-gray-800">
            <div className="container flex items-center justify-between">
              {currentOrganization && currentProject && currentTarget ? (
                <Tabs className="flex h-full grow flex-col" value={page}>
                  <TabsList variant="menu">
                    <TabsTrigger variant="menu" value={Page.Schema} asChild>
                      <Link
                        to="/$organizationSlug/$projectSlug/$targetSlug"
                        params={{
                          organizationSlug: props.organizationSlug,
                          projectSlug: props.projectSlug,
                          targetSlug: props.targetSlug,
                        }}
                      >
                        Schema
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger variant="menu" value={Page.Checks} asChild>
                      <Link
                        to="/$organizationSlug/$projectSlug/$targetSlug/checks"
                        params={{
                          organizationSlug: props.organizationSlug,
                          projectSlug: props.projectSlug,
                          targetSlug: props.targetSlug,
                        }}
                      >
                        Checks
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger variant="menu" value={Page.Explorer} asChild>
                      <Link
                        to="/$organizationSlug/$projectSlug/$targetSlug/explorer"
                        params={{
                          organizationSlug: props.organizationSlug,
                          projectSlug: props.projectSlug,
                          targetSlug: props.targetSlug,
                        }}
                      >
                        Explorer
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger variant="menu" value={Page.History} asChild>
                      <Link
                        to="/$organizationSlug/$projectSlug/$targetSlug/history"
                        params={{
                          organizationSlug: currentOrganization.slug,
                          projectSlug: currentProject.slug,
                          targetSlug: currentTarget.slug,
                        }}
                      >
                        History
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger variant="menu" value={Page.Insights} asChild>
                      <Link
                        to="/$organizationSlug/$projectSlug/$targetSlug/insights"
                        params={{
                          organizationSlug: props.organizationSlug,
                          projectSlug: props.projectSlug,
                          targetSlug: props.targetSlug,
                        }}
                      >
                        Insights
                      </Link>
                    </TabsTrigger>
                    {currentTarget.viewerCanViewAppDeployments && (
                      <TabsTrigger variant="menu" value={Page.Apps} asChild>
                        <Link
                          to="/$organizationSlug/$projectSlug/$targetSlug/apps"
                          params={{
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                            targetSlug: props.targetSlug,
                          }}
                        >
                          Apps
                        </Link>
                      </TabsTrigger>
                    )}
                    {currentTarget.viewerCanViewLaboratory && (
                      <TabsTrigger variant="menu" value={Page.Laboratory} asChild>
                        <Link
                          to="/$organizationSlug/$projectSlug/$targetSlug/laboratory"
                          params={{
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                            targetSlug: props.targetSlug,
                          }}
                        >
                          Laboratory
                        </Link>
                      </TabsTrigger>
                    )}
                    {currentTarget.viewerCanAccessSettings && (
                      <TabsTrigger variant="menu" value={Page.Settings} asChild>
                        <Link
                          to="/$organizationSlug/$projectSlug/$targetSlug/settings"
                          params={{
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                            targetSlug: props.targetSlug,
                          }}
                        >
                          Settings
                        </Link>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>
              ) : (
                <div className="flex flex-row gap-x-8 border-b-2 border-b-transparent px-4 py-3">
                  <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
                  <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
                  <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
                </div>
              )}
              {currentTarget ? (
                connect != null ? (
                  connect
                ) : isCDNEnabled ? (
                  <>
                    <Button onClick={toggleModalOpen} variant="link" className="text-orange-500">
                      <LinkIcon size={16} className="mr-2" />
                      Connect to CDN
                    </Button>
                    <ConnectSchemaModal
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                      isOpen={isModalOpen}
                      toggleModalOpen={toggleModalOpen}
                    />
                  </>
                ) : null
              ) : null}
            </div>
          </div>
          <div className={cn('container min-h-[var(--content-height)] pb-7', className)}>
            {children}
          </div>
        </>
      )}
    </>
  );
};

const ConnectSchemaModalQuery = graphql(`
  query ConnectSchemaModal($targetSelector: TargetSelectorInput!) {
    target(reference: { bySelector: $targetSelector }) {
      id
      project {
        id
        type
      }
      cdnUrl
      activeContracts(first: 20) {
        edges {
          node {
            id
            contractName
            cdnUrl
          }
        }
      }
    }
  }
`);

type CdnArtifactType = 'sdl' | 'services' | 'supergraph' | 'metadata';

const ArtifactToProjectTypeMapping: Record<ProjectType, CdnArtifactType[]> = {
  [ProjectType.Federation]: ['supergraph', 'sdl', 'services'],
  [ProjectType.Single]: ['sdl', 'metadata'],
  [ProjectType.Stitching]: ['sdl', 'services'],
};

const ArtifactTypeToDisplayName: Record<CdnArtifactType, string> = {
  supergraph: 'Supergraph',
  sdl: 'Public GraphQL SDL',
  services: 'Services Definition and SDL',
  metadata: 'Hive Schema Metadata',
};

function composeEndpoint(baseUrl: string, artifactType: CdnArtifactType): string {
  return `${baseUrl}/${artifactType}`;
}

export function ConnectSchemaModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [query] = useQuery({
    query: ConnectSchemaModalQuery,
    variables: {
      targetSelector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
    },
    requestPolicy: 'cache-and-network',
    // we only need to fetch the data when the modal is open
    pause: !props.isOpen,
  });

  const [selectedGraph, setSelectedGraph] = useState<string>('DEFAULT_GRAPH');

  const selectedContract = useMemo(() => {
    if (selectedGraph === 'DEFAULT_GRAPH') {
      return null;
    }
    return query.data?.target?.activeContracts.edges.find(
      ({ node }) => node.contractName === selectedGraph,
    )?.node;
  }, [selectedGraph]);

  const target = query.data?.target;

  const [selectedArtifact, setSelectedArtifact] = useResetState<CdnArtifactType>(
    () => (target?.project.type === ProjectType.Federation ? 'supergraph' : 'sdl'),
    [target?.project.type],
  );

  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-[650px] min-w-[650px]">
        <DialogHeader>
          <DialogTitle>Hive CDN Access</DialogTitle>
          <DialogDescription>
            Learn more in our{' '}
            <UiLink
              variant="primary"
              href={getDocsUrl('/high-availability-cdn')}
              target="_blank"
              rel="noreferrer"
            >
              High-Availability CDN
            </UiLink>{' '}
            documentation.
          </DialogDescription>
        </DialogHeader>
        <div className="max-w-[600px]">
          {target && (
            <>
              <div className="mb-5 mt-1 flex flex-row justify-start gap-3">
                <div>
                  <Label>Graph Variant</Label>
                  <Select
                    value={selectedGraph}
                    onValueChange={value => {
                      if (
                        value !== 'DEFAULT_GRAPH' &&
                        selectedArtifact !== 'sdl' &&
                        selectedArtifact !== 'supergraph'
                      ) {
                        setSelectedArtifact('sdl');
                      }
                      setSelectedGraph(value);
                    }}
                  >
                    <SelectTrigger className="w-[250px] max-w-[300px]">
                      <SelectValue placeholder="Select Graph" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEFAULT_GRAPH">Default Graph</SelectItem>
                      {target.activeContracts.edges.map(({ node }) => (
                        <SelectItem key={node.id} value={node.contractName}>
                          {node.contractName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Artifact</Label>
                  <Select
                    value={selectedArtifact}
                    onValueChange={(value: CdnArtifactType) => setSelectedArtifact(value)}
                  >
                    <SelectTrigger className="w-[250px] max-w-[300px]">
                      <SelectValue placeholder="Select Artifact" />
                    </SelectTrigger>
                    <SelectContent>
                      {ArtifactToProjectTypeMapping[target.project.type].map(t => (
                        <SelectItem
                          key={t}
                          value={t}
                          disabled={
                            t !== 'supergraph' && t !== 'sdl' && selectedGraph !== 'DEFAULT_GRAPH'
                          }
                        >
                          {ArtifactTypeToDisplayName[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedArtifact === 'supergraph' ? (
                <FederationModalContent
                  cdnUrl={selectedContract?.cdnUrl ?? target.cdnUrl}
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                />
              ) : (
                <div className="space-y-2 text-sm">
                  <p>To access your schema from Hive's CDN, use the following endpoint:</p>
                  <InputCopy
                    value={composeEndpoint(
                      selectedContract?.cdnUrl ?? target.cdnUrl,
                      selectedArtifact,
                    )}
                  />
                  <p>
                    To authenticate,{' '}
                    <UiLink
                      as="a"
                      search={{
                        page: 'cdn',
                      }}
                      variant="primary"
                      to="/$organizationSlug/$projectSlug/$targetSlug/settings"
                      params={{
                        organizationSlug: props.organizationSlug,
                        projectSlug: props.projectSlug,
                        targetSlug: props.targetSlug,
                      }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      create a CDN Access Token from your target's Settings page
                    </UiLink>{' '}
                    use the CDN access token in your HTTP headers:
                    <br />
                  </p>
                  <InputCopy value="X-Hive-CDN-Key: <Your Access Token>" />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FederationModalContent(props: {
  cdnUrl: string;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const authenticateSection = (
    <p>
      Replace "{'<hive_cdn_access_key>'}" with a{' '}
      <UiLink
        search={{
          page: 'cdn',
        }}
        variant="primary"
        to="/$organizationSlug/$projectSlug/$targetSlug/settings"
        params={{
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        }}
        target="_blank"
        rel="noreferrer"
      >
        CDN Access Token from your target's settings
      </UiLink>
      .
    </p>
  );
  return (
    <Tabs className="mt-2 flex min-h-[300px] grow flex-col text-sm" defaultValue="hive-gateway">
      <TabsList variant="content">
        <TabsTrigger value="hive-gateway" variant="content">
          Hive Gateway
        </TabsTrigger>
        <TabsTrigger value="apollo-router" variant="content">
          Apollo Router
        </TabsTrigger>
        <TabsTrigger value="cdn" variant="content">
          Custom / HTTP
        </TabsTrigger>
      </TabsList>
      <TabsContent value="hive-gateway" variant="content">
        <p>
          Start up a Hive Gateway instance polling the supergraph from the Hive CDN using the
          following command.
        </p>
        {authenticateSection}
        <div className="mt-2">
          <InputCopy
            value={`docker run --name hive-gateway --rm -p 4000:4000 \\
  ghcr.io/graphql-hive/gateway supergraph \\
  '${props.cdnUrl}' \\
  --hive-cdn-key '<hive_cdn_access_key>'`}
          />
        </div>
        <p>
          For more information please refer to our{' '}
          <UiLink variant="primary" target="_blank" rel="noreferrer" to={getDocsUrl('/gateway')}>
            Hive Gateway documentation
          </UiLink>
          .
        </p>
      </TabsContent>
      <TabsContent value="apollo-router" variant="content">
        <p>
          Start up a Hive Gateway instance polling the supergraph from the Hive CDN using the
          following command.
        </p>
        {authenticateSection}
        <InputCopy
          value={`docker run --name hive-gateway --rm \\
  --env HIVE_CDN_ENDPOINT="${props.cdnUrl}" \\
  --env HIVE_CDN_KEY="<hive_cdn_access_key>"
  ghcr.io/graphql-hive/apollo-router`}
        />
        <p>
          For more information please refer to our{' '}
          <UiLink
            variant="primary"
            target="_blank"
            rel="noreferrer"
            to={getDocsUrl('/other-integrations/apollo-router')}
          >
            Apollo Router documentation
          </UiLink>
          .
        </p>
      </TabsContent>
      <TabsContent value="cdn" className="space-y-2 pt-2" variant="content">
        <p>For other tooling you can access the raw supergraph by sending a HTTP request.</p>
        <p>To access your schema from Hive's CDN, use the following endpoint:</p>
        <InputCopy value={`${props.cdnUrl}/supergraph`} />
        <p>Here is an example calling the endpoint using curl.</p>
        {authenticateSection}
        <div className="mt-2">
          <InputCopy
            value={`curl -H 'X-Hive-CDN-Key: <hive_cdn_access_key>' \\
  ${props.cdnUrl}/supergraph`}
          />
        </div>
        <p>
          For more information please refer to our{' '}
          <UiLink
            variant="primary"
            target="_blank"
            rel="noreferrer"
            to={getDocsUrl('/high-availability-cdn')}
          >
            CDN documentation
          </UiLink>
          .
        </p>
      </TabsContent>
    </Tabs>
  );
}

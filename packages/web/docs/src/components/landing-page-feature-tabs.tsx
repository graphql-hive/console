import { ActiveHighlightImage, FeatureTab, FeatureTabs, Highlight } from './feature-tabs';
import auditImage from '../../public/features/gateway/audit.png';
import observabilityClientsImage from '../../public/features/observability/clients.webp';
import observabilityOperationsImage from '../../public/features/observability/operations.webp';
import observabilityOverallImage from '../../public/features/observability/overall.webp';
import registryExplorerImage from '../../public/features/registry/explorer.webp';
import registrySchemaChecksImage from '../../public/features/registry/schema-checks.webp';
import registryVersionControlSystemImage from '../../public/features/registry/version-control-system.webp';

const tabs = ['Schema Registry', 'GraphQL Observability', 'GraphQL Gateway'];
type Tab = (typeof tabs)[number];

export const highlights: Record<Tab, Highlight[]> = {
  'Schema Registry': [
    {
      title: 'Version Control System',
      description:
        'Track schema modifications across multiple environments from development to production.',
      image: registryVersionControlSystemImage,
    },
    {
      title: 'Schema Checks',
      description:
        'Identify and breaking changes before they reach production. Evolve your API with confidence.',
      image: registrySchemaChecksImage,
    },
    {
      title: 'Composition Error Prevention',
      description: 'Avoid runtime errors by validating compatibility of all your subgraphs.',
      image: registrySchemaChecksImage,
    },
    {
      title: 'Schema Explorer',
      description: 'Navigate through your GraphQL schema and check ownership and usage of types.',
      image: registryExplorerImage,
    },
  ],
  'GraphQL Observability': [
    {
      title: 'GraphQL consumers',
      description: 'Track GraphQL requests to see how API is utilized and by what applications.',
      image: observabilityClientsImage,
    },
    {
      title: 'Overall performance',
      description: 'Observe and analyze performance of your GraphQL API.',
      image: observabilityOverallImage,
    },
    {
      title: 'Query performance',
      description: 'Identify slow GraphQL operations to pinpoint performance bottlenecks.',
      image: observabilityOperationsImage,
    },
  ],
  'GraphQL Gateway': [
    {
      title: 'Federation v1 and v2',
      description:
        'Best in class support for Apollo Federation. Scores 100% in the Federation audit.',
      link: '/federation-gateway-audit',
      image: auditImage,
    },
    {
      title: 'Real-time features',
      description: 'Contribute data from subgraphs to a GraphQL subscription seamlessly.',
      link: '/docs/gateway/subscriptions',
      image: auditImage,
      // TODO: show entities and Subscription type (code)
    },
    {
      title: 'Security and Compliance',
      description:
        'Access control with role-based access control (RBAC), JSON Web Tokens (JWT) and Persisted Operations.',
      link: '/docs/gateway/authorization-authentication',
      image: auditImage,
      // TODO: show directives and auth roles
    },
    {
      title: 'OTEL & Prometheus',
      description:
        'Out-of-the-box support for OpenTelemetry and Prometheus metrics to fit your observability stack.',
      link: '/docs/gateway/monitoring-tracing',
      image: auditImage,
      // TODO: image
    },
  ],
};

export interface LandingPageFeatureTabsProps {
  className?: string;
}

export function LandingPageFeatureTabs({ className }: LandingPageFeatureTabsProps) {
  const icons = [<SchemaRegistryIcon />, <GraphQLObservabilityIcon />, <GatewayIcon />];
  return (
    <FeatureTabs className={className} highlights={highlights} icons={icons}>
      <FeatureTab
        title="Schema Registry"
        documentationLink="/docs/schema-registry"
        description="Publish schemas, compose federated GraphQL api, and detect backward-incompatible changes with ease."
        highlights={highlights['Schema Registry']}
      />
      <FeatureTab
        title="GraphQL Observability"
        documentationLink="/docs/schema-registry/usage-reporting"
        description="Insights into API usage and user experience metrics."
        highlights={highlights['GraphQL Observability']}
      />
      <FeatureTab
        title="GraphQL Gateway"
        documentationLink="/docs/gateway"
        description="Entry point to your distributed data graph."
        highlights={highlights['GraphQL Gateway']}
      />
      <ActiveHighlightImage />
    </FeatureTabs>
  );
}

function SchemaRegistryIcon() {
  return (
    <svg width="24" height="24" fill="currentColor">
      <path d="M5.25 7.5a2.25 2.25 0 1 1 3 2.122v4.756a2.251 2.251 0 1 1-1.5 0V9.622A2.25 2.25 0 0 1 5.25 7.5Zm9.22-2.03a.75.75 0 0 1 1.06 0l.97.97.97-.97a.75.75 0 1 1 1.06 1.06l-.97.97.97.97a.75.75 0 0 1-1.06 1.06l-.97-.97-.97.97a.75.75 0 1 1-1.06-1.06l.97-.97-.97-.97a.75.75 0 0 1 0-1.06Zm2.03 5.03a.75.75 0 0 1 .75.75v3.128a2.251 2.251 0 1 1-1.5 0V11.25a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function GraphQLObservabilityIcon() {
  return (
    <svg width="24" height="24" fill="currentColor">
      <path d="M11.1 19.2v-6.3H9.3v-2.7h5.4v2.7h-1.8v6.3h4.5V21H6.6v-1.8h4.5Zm-.9-16V2.1h3.6v1.1a8.102 8.102 0 0 1 2.694 14.64l-1-1.497a6.3 6.3 0 1 0-6.99 0l-.998 1.497A8.103 8.103 0 0 1 10.2 3.2Z" />
    </svg>
  );
}

function GatewayIcon() {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 256 256"
      height="24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z" />
    </svg>
  );
}

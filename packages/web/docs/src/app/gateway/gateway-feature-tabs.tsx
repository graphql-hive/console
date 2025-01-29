import { FeatureTab, FeatureTabs, Highlight } from '#components/feature-tabs';

// TODO: the long values here will be bad for mobiles
type Tab = 'Observability & Performance Monitoring' | 'Security & Access Control';

const monitoringDocsLink = 'https://the-guild.dev/graphql/hive/docs/gateway/monitoring-tracing';
const securityDocsLink = 'https://the-guild.dev/graphql/hive/docs/gateway/security';

const highlights: Record<Tab, Highlight[]> = {
  'Observability & Performance Monitoring': [
    {
      title: 'Open Telemetry & Prometheus Integration',
      description:
        'Equip your teams with comprehensive tools for monitoring API health, performance, and usage patterns, crucial for maintaining operational excellence.',
    },
    {
      title: 'Response Caching',
      description:
        'Enhances response times and reduces load on backend services by intelligently caching frequent requests.',
    },
    {
      title: 'Rate Limiting',
      description:
        'Protects your API from overload and abuse, ensuring consistent and reliable service performance.',
    },
    {
      title: 'Schema Explorer',
      description:
        'Navigate and analyze the connections within your GraphQL schema using Schema Explorer.',
    },
  ],
  'Security & Access Control': [],
};

export function GatewayFeatureTabs() {
  return <FeatureTabs highlights={highlights} icons={[<PerformanceIcon />, <SecurityIcon />]} />;
}

function PerformanceIcon() {
  return (
    <svg width="24" height="24" fill="currentColor">
      <path d="M5 3v16h16v2H3V3h2Zm15.293 3.293 1.414 1.414L16 13.414l-3-2.999-4.293 4.292-1.414-1.414L13 7.586l3 2.999 4.293-4.292Z" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg width="25" height="24" fill="currentColor">
      <path d="m12.5 1 8.217 1.826c.2221.04936.4207.17297.563.3504.1424.17744.22.39812.22.6256v9.987c-.0001.9877-.244 1.9602-.7101 2.831-.4661.8708-1.14 1.6131-1.9619 2.161L12.5 23l-6.328-4.219c-.82173-.5478-1.49554-1.2899-1.96165-2.1605-.46611-.8707-.71011-1.8429-.71035-2.8305V3.802c.00004-.22748.07764-.44816.21999-.6256.14235-.17743.34095-.30104.56301-.3504L12.5 1Zm0 2.049-7 1.555v9.185c.00001.6585.16257 1.3067.47326 1.8873.31069.5805.75989 1.0754 1.30774 1.4407l5.219 3.48 5.219-3.48c.5477-.3652.9968-.8599 1.3075-1.4403.3107-.5803.4733-1.2284.4735-1.8867V4.604l-7-1.555ZM12.5 7c.4403-.0002.8684.14492 1.2179.41286.3494.26794.6007.64371.7147 1.06901.1141.42531.0846.87637-.0838 1.28322-.1685.40681-.4665.74671-.8478.96691L13.5 15h-2v-4.268c-.3813-.2201-.6792-.5599-.8477-.96668-.1685-.40675-.198-.85771-.0841-1.28296.114-.42526.3651-.80103.7143-1.06904.3493-.26802.7772-.4133 1.2175-.41332Z" />
    </svg>
  );
}

import { withGuildDocs } from '@theguild/components/next.config';

export default withGuildDocs({
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    turbo: {
      treeShaking: true,
    },
  },

  nextraConfig: {
    contentDirBasePath: '/docs',
  },
  redirects: async () => [
    {
      source: '/docs/get-started/organizations',
      destination: '/docs/management/organizations',
      permanent: true,
    },
    {
      source: '/docs/get-started/projects',
      destination: '/docs/management/projects',
      permanent: true,
    },
    {
      source: '/docs/get-started/targets',
      destination: '/docs/management/targets',
      permanent: true,
    },
    {
      source: '/docs/features/tokens',
      destination: '/docs/management/targets#manage-tokens',
      permanent: true,
    },
    {
      source: '/docs/features/publish-schema',
      destination: '/docs/schema-registry#publish-a-schema',
      permanent: true,
    },
    {
      source: '/docs/features/checking-schema',
      destination: '/docs/schema-registry#check-a-schema',
      permanent: true,
    },
    {
      source: '/docs/features/delete-schema',
      destination: '/docs/schema-registry#delete-a-service',
      permanent: true,
    },
    {
      source: '/docs/features/registry-usage',
      destination: '/docs/schema-registry/high-availability-cdn',
      permanent: true,
    },
    {
      source: '/docs/features/high-availability-cdn',
      destination: '/docs/schema-registry/high-availability-cdn',
      permanent: true,
    },
    {
      source: '/docs/high-availability-cdn',
      destination: '/docs/schema-registry/high-availability-cdn',
      permanent: true,
    },
    {
      source: '/docs/features/monitoring',
      destination: '/docs/schema-registry/usage-reporting',
      permanent: true,
    },
    {
      source: '/docs/features/usage-reporting',
      destination: '/docs/schema-registry/usage-reporting',
      permanent: true,
    },
    {
      source: '/docs/features/schema-history',
      destination: '/docs/schema-registry#schema-history-and-changelog',
      permanent: true,
    },
    {
      source: '/docs/features/integrations',
      destination: '/docs/management/organizations#integrations',
      permanent: true,
    },
    {
      source: '/docs/features/alerts-notifications',
      destination: '/docs/management/projects#alerts-and-notifications',
      permanent: true,
    },
    {
      source: '/docs/management/external-schema-composition',
      destination: '/docs/schema-registry/external-schema-composition',
      permanent: true,
    },
    {
      source: '/docs/features/external-schema-composition',
      destination: '/docs/schema-registry/external-schema-composition',
      permanent: true,
    },
    {
      source: '/docs/specs/schema-reports',
      destination: '/docs/api-reference/cli#publish-a-schema',
      permanent: true,
    },
    {
      source: '/docs/self-hosting/apollo-federation-2',
      destination: '/docs/schema-registry/self-hosting/external-composition',
      permanent: true,
    },
    {
      source: '/docs/features/sso-oidc-provider',
      destination: '/docs/management/sso-oidc-provider',
      permanent: true,
    },
    {
      source: '/docs/features/schema-registry',
      destination: '/docs/schema-registry',
      permanent: true,
    },
    {
      source: '/docs/management/external-schema-composition',
      destination: '/docs/schema-registry/external-schema-composition',
      permanent: true,
    },
    {
      source: '/docs/features/laboratory/:path*',
      destination: '/docs/schema-registry/laboratory/:path*',
      permanent: true,
    },
    {
      source: '/docs/management/contracts',
      destination: '/docs/schema-registry/contracts',
      permanent: true,
    },
    {
      source: '/docs/features/schema-policy',
      destination: '/docs/schema-registry/schema-policy',
      permanent: true,
    },
    {
      source: '/docs/features/app-deployments',
      destination: '/docs/schema-registry/app-deployments',
      permanent: true,
    },
    {
      source: '/docs/use-cases/apollo-studio',
      destination: '/docs/use-cases/apollo-graphos',
      permanent: true,
    },
    {
      source: '/docs/specs/link-specifications',
      destination: '/docs/api-reference/link-specifications',
      permanent: true,
    },
    {
      source: '/docs/graphql-api/:path*',
      destination: '/docs/api-reference/graphql-api/:path*',
      permanent: true,
    },
    {
      source: '/docs/specs/usage-reports',
      destination: '/docs/api-reference/usage-reports',
      permanent: true,
    },
    {
      source: '/docs/get-started/:path*',
      destination: '/docs/schema-registry/get-started/:path*',
      permanent: true,
    },
    {
      source: '/docs/management/:path*',
      destination: '/docs/schema-registry/management/:path*',
      permanent: true,
    },
    {
      // SEO: Redirect to the new URL
      source: '/docs/self-hosting/federation-2',
      destination: '/docs/schema-registry/self-hosting/external-composition',
      permanent: true,
    },
    {
      source: '/docs/integrations/:path*',
      destination: '/docs/other-integrations/:path*',
      permanent: false,
    },
    {
      source: '/docs/api-reference/gateway/cli',
      destination: '/docs/api-reference/gateway-cli',
      permanent: true,
    },
    // Broken links found in Google Search Console
    {
      source: '/docs/api-reference',
      destination: '/docs/api-reference/cli',
      permanent: true,
    },
    {
      source: '/docs/self-hosting',
      destination: '/docs/schema-registry/self-hosting/get-started',
      permanent: true,
    },
    {
      source: '/docs/dashboard',
      destination: '/docs/schema-registry/usage-reporting',
      permanent: true,
    },
    {
      source: '/docs/dashboard/insights',
      destination: '/docs/schema-registry/usage-reporting',
      permanent: true,
    },
    {
      source: '/docs/dashboard/explorer',
      destination: '/docs/schema-registry/explorer',
      permanent: true,
    },
    {
      source: '/docs/dashboard/laboratory/:path*',
      destination: '/docs/schema-registry/laboratory/:path*',
      permanent: true,
    },
    {
      source: '/docs/integrations/code-first',
      destination: '/docs/other-integrations/code-first',
      permanent: true,
    },
    {
      source: '/product-updates/2024-01-25-schema-contracts-for-federation',
      destination: '/product-updates/2024-02-06-schema-contracts-for-federation',
      permanent: true,
    },
    {
      source: '/docs/integrations/apollo-router',
      destination: '/docs/other-integrations/apollo-router',
      permanent: true,
    },
    {
      source: '/docs/integrations/envelop',
      destination: '/docs/other-integrations/envelop',
      permanent: true,
    },
    {
      source: '/docs/integrations/schema-stitching',
      destination: '/docs/other-integrations/schema-stitching',
      permanent: true,
    },
    {
      source: '/docs/integrations/apollo-gateway',
      destination: '/docs/other-integrations/apollo-gateway',
      permanent: true,
    },
    {
      source: '/docs/integrations/graphql-code-generator',
      destination: '/docs/other-integrations/graphql-code-generator',
      permanent: true,
    },
    {
      source: '/docs/integrations/ci-cd',
      destination: '/docs/other-integrations/ci-cd',
      permanent: true,
    },
    {
      source: '/docs/integrations/apollo-server',
      destination: '/docs/other-integrations/apollo-server',
      permanent: true,
    },
    {
      source: '/docs/integrations/graphql-ruby',
      destination: '/docs/other-integrations/graphql-ruby',
      permanent: true,
    },
    {
      source: '/docs/integrations/graphql-mesh',
      destination: '/docs/gateway',
      permanent: true,
    },
    {
      source: '/docs/integrations/graphql-yoga',
      destination: '/docs/other-integrations/graphql-yoga',
      permanent: true,
    },
    {
      source: '/docs/gateway/deployment/node-frameworks',
      destination: '/docs/gateway/deployment/runtimes/nodejs',
      permanent: true,
    },
    {
      source: '/docs/gateway/other-features/performance/deduplicate-request',
      destination: '/docs/gateway/other-features/performance/deduplicate-inflight-requests',
      permanent: true,
    },
    {
      source: '/docs/self-hosting/:path*',
      destination: '/docs/schema-registry/self-hosting/:path*',
      permanent: true,
    },
  ],
  env: {
    SITE_URL: 'https://the-guild.dev/graphql/hive',
    NEXT_BASE_PATH: process.env.NEXT_BASE_PATH,
  },
  webpack: (config, { webpack }) => {
    config.externals['node:fs'] = 'commonjs node:fs';
    config.externals['node:path'] = 'commonjs node:path';

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
        resource.request = resource.request.replace(/^node:/, '');
      }),
    );

    return config;
  },
});

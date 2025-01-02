import { useRouter } from 'next/router';
import {
  defineConfig,
  Giscus,
  HiveFooter,
  PRODUCTS,
  useConfig,
  useTheme,
} from '@theguild/components';
import { isLandingPage, NavigationMenu } from './components/navigation-menu';
import { ProductUpdateBlogPostHeader } from './components/product-update-blog-post-header';
import { cn } from './lib';
import favicon from '../public/favicon.svg';

const HiveLogo = PRODUCTS.HIVE.logo;

const siteDescription =
  'Fully Open-source schema registry, analytics and gateway for GraphQL federation and other GraphQL APIs';
const siteName = 'Hive';

function ensureAbsolute(url: string) {
  if (url.startsWith('/')) {
    return `https://the-guild.dev/graphql/hive${url.replace(/\/$/, '')}`;
  }

  return url;
}

type NormalizedResult = ReturnType<typeof useConfig>['normalizePagesResult'];

function createBreadcrumb(normalizedResult: NormalizedResult) {
  const activePaths = normalizedResult.activePath.slice();

  if (activePaths[0].route !== '/') {
    // Add the home page to all pages except the home page
    activePaths.unshift({
      route: '/',
      title: 'Hive',
      name: 'index',
      type: 'page',
      display: 'hidden',
      children: [],
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: activePaths.map((path, index) => {
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: path.route === '/' ? 'Hive' : path.title,
        item: ensureAbsolute(path.route),
      };
    }),
  };
}

export default defineConfig({
  docsRepositoryBase: 'https://github.com/graphql-hive/platform/tree/main/packages/web/docs',
  color: {
    hue: {
      dark: 67.1,
      light: 173,
    },
    saturation: {
      dark: 100,
      light: 40,
    },
  },
  head: function useHead() {
    const { frontMatter, title: pageTitle, normalizePagesResult } = useConfig();

    // Get the current page path
    // Because it shows the full path, from top to bottom,
    // we need to get the last one to get the current page.
    const pagePath = normalizePagesResult.activePath[normalizePagesResult.activePath.length - 1];

    const isGatewayDocsPage = pagePath.route.includes('/docs/gateway');
    const suffix = isGatewayDocsPage ? 'Hive Gateway' : 'Hive';
    const title = `${pageTitle} - ${suffix}`;
    const { description = `${siteName}: ${siteDescription}`, canonical, ogImage } = frontMatter;

    const canonicalUrl = ensureAbsolute(canonical ?? pagePath.route);

    return (
      <>
        <link rel="icon" href={favicon.src} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="canonical" href={canonicalUrl} />
        <meta content="en" httpEquiv="Content-Language" />
        <title>{title}</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content={description} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@TheGuildDev" />
        <meta name="twitter:creator" content="@TheGuildDev" />
        {/* OG */}
        <meta property="og:site_name" content="Hive" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:locale" content="en_US" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ensureAbsolute(ogImage ?? '/og-image.png')} />
        <meta property="og:image:alt" content={description} />
        <meta property="og:image:width" content="1340" />
        <meta property="og:image:height" content="700" />
        <script
          type="application/ld+json"
          id="breadcrumb"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(createBreadcrumb(normalizePagesResult), null, 2),
          }}
        />
      </>
    );
  },
  navbar: { component: NavigationMenu },
  footer: {
    component: _props => {
      const { route } = useRouter();

      return (
        <HiveFooter
          className={cn(
            isLandingPage(route) ? 'light' : '[&>:first-child]:mx-0 [&>:first-child]:max-w-[90rem]',
            'pt-[72px]',
          )}
          items={{
            resources: [
              {
                children: 'Privacy Policy',
                href: 'https://the-guild.dev/graphql/hive/privacy-policy.pdf',
                title: 'Privacy Policy',
              },
              {
                children: 'Terms of Use',
                href: 'https://the-guild.dev/graphql/hive/terms-of-use.pdf',
                title: 'Terms of Use',
              },
              {
                children: 'Partners',
                href: '/partners',
                title: 'Partners',
              },
            ],
          }}
        />
      );
    },
  },

  main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();
    const config = useConfig();

    if (route === '/product-updates') {
      return <>{children}</>;
    }

    if (route.startsWith('/product-updates')) {
      children = (
        <>
          <ProductUpdateBlogPostHeader meta={config.frontMatter as any} />
          {children}
        </>
      );
    }

    return (
      <>
        {children}
        <Giscus
          // ensure giscus is reloaded when client side route is changed
          key={route}
          repo="graphql-hive/platform"
          repoId="R_kgDOHWr5kA"
          category="Docs Discussions"
          categoryId="DIC_kwDOHWr5kM4CSDSS"
          mapping="pathname"
          theme={resolvedTheme}
        />
      </>
    );
  },
  description: 'Schema registry for your GraphQL workflows',
  websiteName: 'Hive',
  logo: <HiveLogo className="text-green-1000" />,
});

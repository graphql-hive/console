/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.SITE_URL || 'https://graphql-hive.com',
  generateIndexSitemap: false,
  additionalPaths: config => [
    {
      loc: config.siteUrl.replace(/\/$/, '') + '/federation-gateway-audit',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    },
    {
      loc: config.siteUrl.replace(/\/$/, '') + '/federation-gateway-performance',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    },
  ],
  output: 'export',
};

import { readFileSync } from 'node:fs';
import type { GetStaticProps } from 'next';
// eslint-disable-next-line import/no-extraneous-dependencies
import { buildDynamicMDX } from 'nextra/remote';
import { RemoteContent } from '@theguild/components';

export function UsageReportsJSONSchema() {
  return <RemoteContent />;
}

export const getStaticProps: GetStaticProps = async () => {
  const data = [
    '```json',
    readFileSync('../../services/usage/usage-report-v2.schema.json', 'utf-8'),
    '```',
  ].join('\n');
  const dynamicMdx = await buildDynamicMDX(data, {
    defaultShowCopyCode: true,
  });

  return {
    props: {
      ...dynamicMdx,
      __nextra_dynamic_opts: {
        title: 'Usage Report JSON Schema / Specification',
        frontMatter: {
          description: 'Hive Usage Report JSON Schema / Specification',
        },
      },
    },
  };
};

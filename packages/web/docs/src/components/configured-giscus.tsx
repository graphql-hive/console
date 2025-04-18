'use client';

import { usePathname } from 'next/navigation';
import { Giscus } from '@theguild/components';

export function ConfiguredGiscus(props: React.HTMLAttributes<HTMLDivElement>) {
  const route = usePathname();

  return (
    <div {...props}>
      <Giscus
        // ensure giscus is reloaded when client side route is changed
        key={route}
        repo="graphql-hive/platform"
        repoId="R_kgDOHWr5kA"
        category="Docs Discussions"
        categoryId="DIC_kwDOHWr5kM4CSDSS"
        mapping="pathname"
      />
    </div>
  );
}

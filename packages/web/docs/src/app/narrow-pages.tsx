'use client';

import { usePathname } from 'next/navigation';
import { HiveLayoutConfig } from '@theguild/components';

/**
 * All light mode only pages are narrower, but we also have
 * narrow pages that support dark mode.
 */
export function NarrowPages({ pages }: { pages: string[] }) {
  const pathname = usePathname();
  const isLightOnlyPage = pages.includes(pathname);

  return isLightOnlyPage ? (
    <div className="absolute size-0">
      <HiveLayoutConfig widths="landing-narrow" />
    </div>
  ) : null;
}

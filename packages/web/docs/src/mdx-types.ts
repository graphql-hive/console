import type { getPageMap } from '@theguild/components/server';

/**
 * TODO: This type should be exported from `nextra` and `@theguild/components`
 */
export type MdxFile<FrontMatterType> = {
  name: string;
  route: string;
  frontMatter?: FrontMatterType;
};

/**
 * TODO: This should be exported from `nextra` and `@theguild/components`
 */
export type PageMapItem = Awaited<ReturnType<typeof getPageMap>>[number];

export type FolderItem = Extract<PageMapItem, { children: PageMapItem[] }>;

export function isFolder(item: PageMapItem): item is FolderItem {
  return !!item && typeof item === 'object' && 'children' in item;
}

export function* pagesDepthFirst(items: PageMapItem[]): Generator<PageMapItem> {
  for (const item of items) {
    if (isFolder(item)) {
      yield* pagesDepthFirst(item.children);
    } else {
      yield item;
    }
  }
}

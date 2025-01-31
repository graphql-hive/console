import type { FederatedLink } from './link.js';

const VERSION_KEY_MATCH = /v(\d{1,3})[\._](\d{1,4})/i;

/**
 * This is a special case for handling federation v1. Be careful when implementing
 * for federation v1, because versioning isn't possible
 */
export const FEDERATION_V1 = Symbol('FEDERATION_V1');

/** Best practice is to version links. Do not use this unless you know specifically why */
export const NULL_VERSION = Symbol('NULL_VERSION');

export type Versioned<T> = {
  [minVersion: string]: (resolveImportName: FederatedLink['resolveImportName']) => T;
  [FEDERATION_V1]?: (resolveImportName: FederatedLink['resolveImportName']) => T;
  [NULL_VERSION]?: (resolveImportName: FederatedLink['resolveImportName']) => T;
};

export class LinkableSpec<T> {
  private readonly sortedVersionKeys: { key: string; split: number[] }[];

  constructor(
    public readonly identity: string,
    public readonly versions: Versioned<T>,
  ) {
    // sort the versions in descending order for quicker lookups
    this.sortedVersionKeys = Object.keys(versions)
      .map(
        (
          key,
        ): {
          key: string;
          split?: number[];
        } => ({ key, split: key.match(VERSION_KEY_MATCH)?.map(Number).slice(1) }),
      )
      .filter((v): v is Required<typeof v> => v.split !== undefined)
      .sort(({ split: [aMajor, aMinor] }, { split: [bMajor, bMinor] }) => {
        return bMajor !== aMajor ? bMajor - aMajor : bMinor - aMinor;
      });
  }

  /**
   *
   * @param links List of links used in a schema. Can be extracted from SDL using: `FederatedLink.fromTypedefs(parse(sdl))`
   * @returns the minimum version that is supported by this LinkableSpec
   */
  private detectLinkVersion(link: FederatedLink): string | null | undefined {
    // for every link, find the highest supported version
    if (link.identity === this.identity) {
      return (
        this.sortedVersionKeys.find(minVersion =>
          link.supports(minVersion.split[0], minVersion.split[1]),
        )?.key ||
        // check null last since Object.keys doesnt include symbols.
        (link.supports(null) && this.versions[NULL_VERSION] ? null : undefined)
      );
    }
    return undefined;
  }

  private findLinkByIdentity(links: FederatedLink[]): FederatedLink | undefined {
    return links.find(link => link.identity === this.identity);
  }

  public detectImplementation(links: FederatedLink[]): T | undefined {
    const maybeLink = this.findLinkByIdentity(links);
    if (maybeLink) {
      const version = this.detectLinkVersion(maybeLink);
      if (version !== undefined) {
        const activeVersion = this.versions[version || NULL_VERSION];
        return activeVersion?.(maybeLink.resolveImportName.bind(maybeLink));
      }
      console.warn(
        `Cannot apply @link due to unsupported version found for "${this.identity}". ` +
          `Available versions: ${this.sortedVersionKeys.map(v => `${v.split.join('.')}`).join(', ')} and any version these are compatible compatible with.`,
      );
    }
  }
}

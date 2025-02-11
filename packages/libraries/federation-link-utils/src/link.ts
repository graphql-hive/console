import { ConstArgumentNode, DocumentNode, Kind } from 'graphql';
import { FederatedLinkImport } from './link-import.js';
import { FederatedLinkUrl } from './link-url.js';

function linkFromArgs(args: readonly ConstArgumentNode[]): FederatedLink | undefined {
  let url: FederatedLinkUrl | undefined,
    imports: FederatedLinkImport[] = [],
    as: string | null = null;
  for (const arg of args) {
    switch (arg.name.value) {
      case 'url': {
        if (arg.value.kind === Kind.STRING) {
          url = FederatedLinkUrl.fromUrl(arg.value.value);
        } else {
          console.warn(`Unexpected kind, ${arg.value.kind}, for argument "url" in @link.`);
        }
        break;
      }
      case 'import': {
        imports = FederatedLinkImport.fromTypedefs(arg.value);
        break;
      }
      case 'as': {
        if (arg.value.kind === Kind.STRING) {
          as = arg.value.value ?? null;
        } else {
          console.warn(`Unexpected kind, ${arg.value.kind}, for argument "as" in @link.`);
        }
        break;
      }
      default: {
        // ignore. Federation should validate links.
      }
    }
  }
  if (url !== undefined) {
    return new FederatedLink(url, as, imports);
  }
  return;
}

function namespaced(namespace: string | null, name: string) {
  if (namespace?.length) {
    if (name.startsWith('@')) {
      return `@${namespace}__${name.substring(1)}`;
    }
    return `${namespace}__${name}`;
  }
  return name;
}

export class FederatedLink {
  constructor(
    private readonly url: FederatedLinkUrl,
    private readonly as: string | null,
    private readonly imports: FederatedLinkImport[],
  ) {}

  /** Collects all `@link`s defined in graphql typedefs */
  static fromTypedefs(typeDefs: DocumentNode): FederatedLink[] {
    let links: FederatedLink[] = [];
    for (const definition of typeDefs.definitions) {
      if (definition.kind === Kind.SCHEMA_EXTENSION || definition.kind === Kind.SCHEMA_DEFINITION) {
        const defLinks = definition.directives?.filter(
          directive => directive.name.value === 'link',
        );
        const parsedLinks =
          defLinks?.map(l => linkFromArgs(l.arguments ?? [])).filter(l => l !== undefined) ?? [];
        links = links.concat(parsedLinks);
      }
    }
    return links;
  }

  /**
   * By default, `@link` will assign a prefix based on the name extracted from the URL.
   * If no name is present, a prefix will not be assigned.
   * See: https://specs.apollo.dev/link/v1.0/#@link.as
   */
  private get namespace(): string | null {
    return this.as ?? this.url.name;
  }

  toString(): string {
    return `@link(url: "${this.url}"${this.as ? `, as: "${this.as}"` : ''}${this.imports.length ? `, import: [${this.imports.join(', ')}]` : ''})`;
  }

  private get defaultImport(): string | null {
    return this.namespace && `@${this.namespace}`;
  }

  /** The Link's identity. This is the unique identifier of a `@link`. */
  get identity(): string {
    return this.url.identity;
  }

  supports(version: string): boolean;
  supports(major: number, minor: number): boolean;
  supports(version: FederatedLinkUrl): boolean;
  supports(version: null): boolean;
  supports(...args: [string] | [number, number] | [FederatedLinkUrl] | [null]): boolean {
    /** @ts-expect-error: ignore tuple error. These are tuples and can be spread. tsc is wrong. */
    return this.url.supports(...args);
  }

  /**
   * Given the name of an element in a linked schema, this returns the name of that element
   * as it has been imported. This accounts for aliasing and namespacing unreferenced imports.
   * This can be used by LinkSpecs to get the translated names of elements.
   *
   * The directive `@` prefix is removed from the returned name. This is to make it easier to match node names when visiting a schema definition.
   * When visiting nodes, a directive's name doesn't include the `@`.
   * However, the `@` is necessary for the input parameter in order to know how to correctly resolve the name.
   * Otherwise, setting the import argument as: import: ["foo"] would incorrectly return `foo` for `@foo`, when it should be `{namespace}__foo`.
   *
   * @name string The element name in the linked schema. If this is the name of the link (e.g. "example" when linking "https://foo.graphql-hive.com/example"), then this returns the default link import.
   * @throws if both importName is null and the url has no name.
   * @returns The name of the element as it has been imported.
   */
  resolveImportName(elementName: string): string {
    if (this.url.name && elementName === `@${this.url.name}`) {
      // @note: default is a directive... So remove the `@`
      return this.defaultImport!.substring(1);
    }
    const imported = this.imports.find(i => i.name === elementName);
    let resolvedName = imported?.as ?? imported?.name ?? namespaced(this.namespace, elementName);
    // Strip the `@` prefix for directives because in all implementations of mapping or visiting a schema,
    // directive names are not prefixed with `@`. The `@` is only for SDL.
    return resolvedName.startsWith('@') ? resolvedName.substring(1) : resolvedName;
  }
}

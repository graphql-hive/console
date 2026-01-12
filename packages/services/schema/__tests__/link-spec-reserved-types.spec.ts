import { parse } from 'graphql';
import { createComposeFederation } from '../src/composition/federation';
import {
  LINK_SPEC_RESERVED_DIRECTIVES,
  LINK_SPEC_RESERVED_TYPES,
  validateLinkSpecReservedTypes,
} from '../src/lib/link-spec-reserved-types';

describe('Link Spec Reserved Types Validation', () => {
  describe('validateLinkSpecReservedTypes', () => {
    it('should detect conflict with Purpose enum', () => {
      const schema = parse(/* GraphQL */ `
        enum Purpose {
          FOO
          BAR
        }

        type Query {
          foo: Purpose
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        name: 'Purpose',
        kind: 'type',
        message: expect.stringContaining('Type "Purpose" conflicts with Apollo Link spec'),
      });
    });

    it('should detect conflict with Import scalar', () => {
      const schema = parse(/* GraphQL */ `
        scalar Import

        type Query {
          foo: Import
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        name: 'Import',
        kind: 'type',
        message: expect.stringContaining('Type "Import" conflicts with Apollo Link spec'),
      });
    });

    it('should detect conflict with @link directive definition', () => {
      const schema = parse(/* GraphQL */ `
        directive @link on FIELD

        type Query {
          foo: String @link
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        name: 'link',
        kind: 'directive',
        message: expect.stringContaining('Directive "@link" conflicts with Apollo Link spec'),
      });
    });

    it('should detect multiple conflicts in same schema', () => {
      const schema = parse(/* GraphQL */ `
        enum Purpose {
          FOO
        }

        scalar Import

        type Query {
          foo: Purpose
          bar: Import
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(2);
      expect(conflicts.map(c => c.name)).toContain('Purpose');
      expect(conflicts.map(c => c.name)).toContain('Import');
    });

    it('should detect conflicts in type extensions', () => {
      const schema = parse(/* GraphQL */ `
        extend enum Purpose {
          EXTRA_VALUE
        }

        type Query {
          foo: String
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('Purpose');
    });

    it('should allow valid schemas without conflicts', () => {
      const schema = parse(/* GraphQL */ `
        enum Status {
          ACTIVE
          INACTIVE
        }

        scalar DateTime

        type Query {
          status: Status
          createdAt: DateTime
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(0);
    });

    it('should allow types with similar but different names', () => {
      const schema = parse(/* GraphQL */ `
        enum UserPurpose {
          FOO
          BAR
        }

        scalar ImportData

        type Query {
          purpose: UserPurpose
          data: ImportData
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicts in object types named Purpose or Import', () => {
      const schema = parse(/* GraphQL */ `
        type Purpose {
          id: ID!
        }

        type Query {
          purpose: Purpose
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('Purpose');
      expect(conflicts[0].kind).toBe('type');
    });

    it('should detect conflicts in input types', () => {
      const schema = parse(/* GraphQL */ `
        input Purpose {
          value: String
        }

        type Query {
          foo(input: Purpose): String
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('Purpose');
    });

    it('should detect conflicts in interface types', () => {
      const schema = parse(/* GraphQL */ `
        interface Import {
          id: ID!
        }

        type Query {
          foo: Import
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('Import');
    });

    it('should detect conflicts in union types', () => {
      const schema = parse(/* GraphQL */ `
        type Foo {
          id: ID!
        }

        type Bar {
          id: ID!
        }

        union Purpose = Foo | Bar

        type Query {
          purpose: Purpose
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('Purpose');
      expect(conflicts[0].kind).toBe('type');
    });

    it('should detect all three reserved identifier conflicts simultaneously', () => {
      const schema = parse(/* GraphQL */ `
        enum Purpose {
          FOO
        }

        scalar Import

        directive @link on FIELD

        type Query {
          foo: String
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(3);
      expect(conflicts.map(c => c.name).sort()).toEqual(['Import', 'Purpose', 'link']);
    });

    it('should include spec URL in error message', () => {
      const schema = parse(/* GraphQL */ `
        enum Purpose {
          FOO
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts[0].message).toContain('https://specs.apollo.dev/link/v1.0/');
    });

    it('should be case-sensitive and not flag lowercase variations', () => {
      const schema = parse(/* GraphQL */ `
        enum purpose {
          FOO
        }

        scalar import

        directive @Link on FIELD

        type Query {
          foo: String
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      expect(conflicts).toHaveLength(0);
    });

    it('should only detect directive definitions, not directive usages', () => {
      const schema = parse(/* GraphQL */ `
        directive @myCustomDirective on FIELD

        type Query {
          foo: String @myCustomDirective
        }
      `);

      const conflicts = validateLinkSpecReservedTypes(schema);
      // Only @link directive definition would conflict, not @myCustomDirective
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Reserved type sets', () => {
    it('should include Purpose in reserved types', () => {
      expect(LINK_SPEC_RESERVED_TYPES.has('Purpose')).toBe(true);
    });

    it('should include Import in reserved types', () => {
      expect(LINK_SPEC_RESERVED_TYPES.has('Import')).toBe(true);
    });

    it('should include link in reserved directives', () => {
      expect(LINK_SPEC_RESERVED_DIRECTIVES.has('link')).toBe(true);
    });
  });

  describe('Integration with composeFederation', () => {
    const composeFederation = createComposeFederation({
      decrypt: (value: string) => value,
      requestTimeoutMs: 30000,
    });

    it('should fail composition when Federation v2 subgraph defines Purpose type', async () => {
      const result = await composeFederation({
        native: true,
        schemas: [
          {
            source: 'products',
            raw: /* GraphQL */ `
              extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

              enum Purpose {
                FOO
                BAR
              }

              type Product @key(fields: "id") {
                id: ID!
                purpose: Purpose
              }

              type Query {
                products: [Product]
              }
            `,
          },
        ],
        external: null as any,
        contracts: undefined,
        requestId: 'test-request-id',
      });

      expect(result.type).toBe('failure');
      if (result.type === 'failure') {
        expect(result.result.errors).toHaveLength(1);
        expect(result.result.errors[0].message).toContain('[products]');
        expect(result.result.errors[0].message).toContain('Purpose');
        expect(result.result.errors[0].source).toBe('composition');
      }
    });

    it('should fail composition and report all conflicts across multiple subgraphs', async () => {
      const result = await composeFederation({
        native: true,
        schemas: [
          {
            source: 'products',
            raw: /* GraphQL */ `
              extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

              enum Purpose {
                FOO
              }

              type Product @key(fields: "id") {
                id: ID!
              }

              type Query {
                products: [Product]
              }
            `,
          },
          {
            source: 'reviews',
            raw: /* GraphQL */ `
              extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

              scalar Import

              type Review @key(fields: "id") {
                id: ID!
              }

              type Query {
                reviews: [Review]
              }
            `,
          },
        ],
        external: null as any,
        contracts: undefined,
        requestId: 'test-request-id',
      });

      expect(result.type).toBe('failure');
      if (result.type === 'failure') {
        expect(result.result.errors).toHaveLength(2);
        const messages = result.result.errors.map(e => e.message);
        expect(messages.some(m => m.includes('[products]') && m.includes('Purpose'))).toBe(true);
        expect(messages.some(m => m.includes('[reviews]') && m.includes('Import'))).toBe(true);
      }
    });

    it('should allow valid Federation v2 schemas without reserved type conflicts', async () => {
      const result = await composeFederation({
        native: true,
        schemas: [
          {
            source: 'products',
            raw: /* GraphQL */ `
              extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

              type Product @key(fields: "id") {
                id: ID!
                name: String
              }

              type Query {
                products: [Product]
              }
            `,
          },
        ],
        external: null as any,
        contracts: undefined,
        requestId: 'test-request-id',
      });

      expect(result.type).toBe('success');
    });

    it('should skip validation for Federation v1 schemas', async () => {
      const result = await composeFederation({
        native: false,
        schemas: [
          {
            source: 'products',
            raw: /* GraphQL */ `
              # Federation v1 schema (no @link directive)
              type Product @key(fields: "id") {
                id: ID!
                purpose: Purpose
              }

              enum Purpose {
                FOO
                BAR
              }

              type Query {
                products: [Product]
              }
            `,
          },
        ],
        external: null as any,
        contracts: undefined,
        requestId: 'test-request-id',
      });

      // Federation v1 schemas can use these names, validation is skipped
      // The composition may fail for other reasons (Fed v1 validation), but not for reserved types
      if (result.type === 'failure') {
        const hasReservedTypeError = result.result.errors.some(e =>
          e.message.includes('conflicts with Apollo Link spec'),
        );
        expect(hasReservedTypeError).toBe(false);
      }
    });
  });
});

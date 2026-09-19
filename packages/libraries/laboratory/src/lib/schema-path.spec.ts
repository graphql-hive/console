import { buildSchema } from 'graphql';
import {
  decodeTypeConditionSegment,
  encodeTypeConditionSegment,
  isTypeConditionSegment,
  parseSchemaPath,
  resolveSchemaPath,
  toFieldSegments,
} from './schema-path';

const schema = buildSchema(/* GraphQL */ `
  type Image {
    url: String
    title: String
  }
  type Video {
    url: String
    duration: Int
  }
  union CmsContent = Image | Video
  interface Node {
    id: ID!
    name: String
  }
  type Page implements Node {
    id: ID!
    name: String
    content: [CmsContent!]!
    slug: String
  }
  type Article implements Node {
    id: ID!
    name: String
    body: String
  }
  type Query {
    categoryPage: Page
    node: Node
  }
`);

describe('type condition segments', () => {
  it('round-trips a type name', () => {
    expect(decodeTypeConditionSegment(encodeTypeConditionSegment('Image'))).toBe('Image');
  });

  it('reads an ordinary field name as a field', () => {
    expect(decodeTypeConditionSegment('content')).toBeNull();
    expect(isTypeConditionSegment('content')).toBe(false);
  });

  // Every path consumer splits on '.', and the ancestry helpers slice at every
  // dot, so a sigil containing one would shatter into empty segments.
  it('encodes without a dot', () => {
    expect(encodeTypeConditionSegment('Image')).not.toContain('.');
  });

  it('treats a bare prefix as a field rather than an unnamed condition', () => {
    expect(decodeTypeConditionSegment('on:')).toBeNull();
  });
});

describe('parseSchemaPath', () => {
  it('separates field segments from type conditions', () => {
    const { operation, segments } = parseSchemaPath('query.categoryPage.content.on:Image.url');

    expect(operation).toBe('query');
    expect(segments).toEqual([
      { kind: 'field', name: 'categoryPage' },
      { kind: 'field', name: 'content' },
      { kind: 'typeCondition', typeName: 'Image' },
      { kind: 'field', name: 'url' },
    ]);
  });

  it('rejects a path that does not start at an operation root', () => {
    expect(parseSchemaPath('categoryPage.content').operation).toBeNull();
  });

  it('projects to field names only', () => {
    const { segments } = parseSchemaPath('query.categoryPage.content.on:Image.url');

    expect(toFieldSegments(segments)).toEqual(['categoryPage', 'content', 'url']);
  });
});

describe('resolveSchemaPath', () => {
  it('walks into a union member', () => {
    const steps = resolveSchemaPath('query.categoryPage.content.on:Image.url', schema);

    expect(steps?.map(step => step.parentType.name)).toEqual([
      'Query',
      'Page',
      'CmsContent',
      'Image',
    ]);
    expect(steps?.at(-1)?.field?.name).toBe('url');
  });

  it('walks into an interface implementation', () => {
    const steps = resolveSchemaPath('query.node.on:Article.body', schema);

    expect(steps?.at(-1)?.field?.name).toBe('body');
  });

  it('unwraps list and non-null wrappers between segments', () => {
    const steps = resolveSchemaPath('query.categoryPage.content', schema);

    expect(steps?.at(-1)?.type.name).toBe('CmsContent');
  });

  it('rejects a type that is not a member of the abstract type', () => {
    expect(resolveSchemaPath('query.node.on:Image.url', schema)).toBeNull();
  });

  it('rejects a field the type does not have', () => {
    expect(resolveSchemaPath('query.categoryPage.nope', schema)).toBeNull();
  });

  // A partial walk would let a caller mistake the last type it resolved for the
  // one the path named.
  it('returns null rather than a partial walk', () => {
    expect(resolveSchemaPath('query.categoryPage.content.url', schema)).toBeNull();
  });
});

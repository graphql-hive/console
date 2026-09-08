// @vitest-environment jsdom
import { buildSchema, type GraphQLInterfaceType, type GraphQLObjectType } from 'graphql';
import { fireEvent, render, screen } from '@testing-library/react';
import { BuilderField, BuilderTypeConditionField } from './builder';

const laboratory = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./context', () => ({
  useLaboratory: () => laboratory.current,
}));

const schema = buildSchema(`
  type Image { url: String, title: String }
  type Video { url: String, duration: Int }
  union CmsContent = Image | Video
  interface Node { id: ID!, name: String }
  type Article implements Node { id: ID!, name: String, body: String }
  type Bare implements Node { id: ID!, name: String }
  type Page { content: [CmsContent!]!, node: Node }
  type Query { page: Page }
`);

const pageType = schema.getType('Page') as GraphQLObjectType;
const contentField = pageType.getFields().content;
const nodeField = pageType.getFields().node;

const addPathToActiveOperation = vi.fn();
const openDocs = vi.fn();

const mount = (node: React.ReactElement, query = '') => {
  laboratory.current = {
    schema,
    enableDocs: true,
    openDocs,
    activeOperation: { query },
    activeTab: { type: 'operation' },
    addPathToActiveOperation,
    deletePathFromActiveOperation: vi.fn(),
    addArgToActiveOperation: vi.fn(),
    deleteArgFromActiveOperation: vi.fn(),
  };

  return render(node);
};

const fieldRow = (field: typeof contentField, name: string) => (
  <BuilderField
    field={field}
    path={['query', 'page', name]}
    openPaths={['query.page.content', 'query.page.node']}
    setOpenPaths={vi.fn()}
  />
);

describe('abstract fields in the builder', () => {
  beforeEach(() => {
    addPathToActiveOperation.mockReset();
    openDocs.mockReset();
  });

  // The reported bug: a union field rendered as a leaf checkbox with no expander.
  it('expands a union field into a row per possible type', () => {
    mount(fieldRow(contentField, 'content'));

    expect(screen.getByText('Image')).toBeDefined();
    expect(screen.getByText('Video')).toBeDefined();
  });

  it('shows an interface its own fields as well as its implementations', () => {
    mount(fieldRow(nodeField, 'node'));

    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('name')).toBeDefined();
    expect(screen.getByText('Article')).toBeDefined();
  });

  it('omits an implementation that adds nothing to the interface', () => {
    mount(fieldRow(nodeField, 'node'));

    expect(screen.queryByText('Bare')).toBeNull();
  });
});

const conditionRow = (typeName: string, parent: 'CmsContent' | 'Node', query = '') =>
  mount(
    <BuilderTypeConditionField
      type={schema.getType(typeName) as GraphQLObjectType}
      parentType={schema.getType(parent) as GraphQLObjectType | GraphQLInterfaceType}
      path={['query', 'page', 'content', `on:${typeName}`]}
      openPaths={['query.page.content.on:' + typeName]}
      setOpenPaths={vi.fn()}
    />,
    query,
  );

describe('BuilderTypeConditionField', () => {
  beforeEach(() => {
    addPathToActiveOperation.mockReset();
    openDocs.mockReset();
  });

  it('renders the type condition as GraphQL', () => {
    const { container } = conditionRow('Image', 'CmsContent');

    expect(container.textContent).toContain('... on');
    expect(screen.getByText('Image')).toBeDefined();
  });

  // A disabled checkbox here reads as broken rather than as "not selectable", and
  // a type condition groups fields rather than being one you select.
  it('offers no checkbox to tick', () => {
    const { container } = conditionRow('Image', 'CmsContent');
    // The row itself, not its field rows, which are tickable.
    const row = container.querySelector('button')!;

    expect(row.textContent).toContain('... on');
    expect(row.querySelector('[data-slot="checkbox"]')).toBeNull();
  });

  it('reflects a fragment that is already in the document', () => {
    const query = 'query { page { content { __typename ... on Image { url } } } }';
    const { container } = conditionRow('Image', 'CmsContent', query);

    expect(container.querySelector('.text-foreground-primary')).not.toBeNull();
  });

  it('ticks a member field with the encoded path and the schema', () => {
    conditionRow('Image', 'CmsContent');

    fireEvent.click(screen.getByText('url').closest('div')!.querySelector('button')!);

    expect(addPathToActiveOperation).toHaveBeenCalledWith(
      'query.page.content.on:Image.url',
      undefined,
      schema,
    );
  });

  it('offers the possible type in the docs menu', () => {
    const { container } = conditionRow('Image', 'CmsContent');

    fireEvent.contextMenu(container.querySelector('button')!);
    fireEvent.click(screen.getByText('Open in Docs'));

    expect(openDocs).toHaveBeenCalledWith({ kind: 'type', name: 'Image' });
  });
});

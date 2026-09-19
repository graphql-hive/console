// @vitest-environment jsdom
import { buildSchema, type GraphQLObjectType } from 'graphql';
import { fireEvent, render, screen } from '@testing-library/react';
import { BuilderObjectField, BuilderScalarField } from './builder';

const laboratory = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./context', () => ({
  useLaboratory: () => laboratory.current,
}));

const schema = buildSchema(`
  type Profile { city: String }
  type User { id: ID!, profile: Profile }
  type Query { me: User }
`);

const idField = (schema.getType('User') as GraphQLObjectType).getFields().id;
const meField = schema.getQueryType()!.getFields().me;

const openDocs = vi.fn();

const mount = (node: React.ReactElement, enableDocs: boolean) => {
  laboratory.current = {
    schema,
    enableDocs,
    openDocs,
    activeOperation: null,
    activeTab: { type: 'operation' },
    addPathToActiveOperation: vi.fn(),
    deletePathFromActiveOperation: vi.fn(),
    addArgToActiveOperation: vi.fn(),
    deleteArgFromActiveOperation: vi.fn(),
  };

  return render(node);
};

const scalarRow = (disableChildren: boolean) => (
  <BuilderScalarField
    field={idField}
    path={['query', 'me', 'id']}
    openPaths={[]}
    setOpenPaths={vi.fn()}
    disableChildren={disableChildren}
  />
);

describe('Builder row docs context menu', () => {
  beforeEach(() => {
    openDocs.mockReset();
  });

  it('offers Open in Docs on a plain row', () => {
    const { container } = mount(scalarRow(false), true);

    fireEvent.contextMenu(container.firstElementChild!);

    expect(screen.getByText('Open in Docs')).toBeDefined();
  });

  it('opens the field the row represents, not its return type', () => {
    const { container } = mount(scalarRow(false), true);

    fireEvent.contextMenu(container.firstElementChild!);
    fireEvent.click(screen.getByText('Open in Docs'));

    expect(openDocs).toHaveBeenCalledWith({ kind: 'field', typeName: 'User', fieldName: 'id' });
  });

  it('offers nothing when docs are disabled', () => {
    const { container } = mount(scalarRow(false), false);

    fireEvent.contextMenu(container.firstElementChild!);

    expect(screen.queryByText('Open in Docs')).toBeNull();
  });

  it('still renders the sticky row variant', () => {
    const { container } = mount(scalarRow(true), true);

    expect(container.firstElementChild).not.toBeNull();
  });

  // The collapsible variant nests ContextMenuTrigger asChild around
  // CollapsibleTrigger asChild, so both slots have to resolve onto the Button.
  it('renders the collapsible row without breaking the asChild chain', () => {
    const { container } = mount(
      <BuilderObjectField
        field={meField}
        path={['query', 'me']}
        openPaths={[]}
        setOpenPaths={vi.fn()}
      />,
      true,
    );

    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    fireEvent.contextMenu(button!);

    expect(screen.getByText('Open in Docs')).toBeDefined();
  });
});

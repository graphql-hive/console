// @vitest-environment jsdom
import { buildSchema } from 'graphql';
import { render, screen } from '@testing-library/react';
import { Docs } from './docs';

const laboratory = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./context', () => ({
  useLaboratory: () => laboratory.current,
}));

const schema = buildSchema(`
  type User {
    "The user's unique identifier."
    id: ID!
    displayName: String
  }
  type Query { me: User }
`);

const mount = (state: Record<string, unknown>) => {
  laboratory.current = {
    schema,
    docsNavStack: [],
    pushDocs: vi.fn(),
    popDocs: vi.fn(),
    resetDocs: vi.fn(),
    ...state,
  };

  return render(<Docs />);
};

describe('Docs', () => {
  it('lists the root operation types when the stack is empty', () => {
    mount({});

    expect(screen.getByText('Query')).toBeDefined();
  });

  it('renders a description when the field has one', () => {
    const { container } = mount({
      docsNavStack: [{ kind: 'field', typeName: 'User', fieldName: 'id' }],
    });

    expect(container.querySelector('[data-slot="markdown"]')).not.toBeNull();
  });

  // Most schemas carry no docstrings, so an empty container would be the common case.
  it('renders no description block when the field has none', () => {
    const { container } = mount({
      docsNavStack: [{ kind: 'field', typeName: 'User', fieldName: 'displayName' }],
    });

    expect(container.querySelector('[data-slot="markdown"]')).toBeNull();
    expect(screen.getByText('Type')).toBeDefined();
  });

  it('falls back to the root view when the target type is gone', () => {
    mount({ docsNavStack: [{ kind: 'type', name: 'Removed' }] });

    expect(screen.getByText('Root types')).toBeDefined();
  });

  it('falls back to the root view when the target field is gone', () => {
    mount({ docsNavStack: [{ kind: 'field', typeName: 'User', fieldName: 'gone' }] });

    expect(screen.getByText('Root types')).toBeDefined();
  });

  it('shows an empty state before a schema is available', () => {
    mount({ schema: null });

    expect(screen.getByText('No schema yet')).toBeDefined();
  });
});

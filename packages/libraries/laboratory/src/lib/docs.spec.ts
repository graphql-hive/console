// @vitest-environment happy-dom
import { buildSchema } from 'graphql';
import { act, renderHook } from '@testing-library/react';
import { docsTargetFromPath, useDocs } from './docs';

const schema = buildSchema(`
  interface Node { id: ID! }
  type Address { city: String }
  type Profile implements Node { id: ID!, address: Address }
  type User implements Node { id: ID!, profile: Profile }
  type Query { me: User }
  type Mutation { signIn: User }
`);

describe('docsTargetFromPath', () => {
  it('resolves a root field to its operation type', () => {
    expect(docsTargetFromPath(['query', 'me'], schema)).toEqual({
      kind: 'field',
      typeName: 'Query',
      fieldName: 'me',
    });
  });

  it('resolves a nested field to its immediate parent type', () => {
    expect(docsTargetFromPath(['query', 'me', 'profile', 'address'], schema)).toEqual({
      kind: 'field',
      typeName: 'Profile',
      fieldName: 'address',
    });
  });

  it('walks through interfaces', () => {
    expect(docsTargetFromPath(['query', 'me', 'profile', 'id'], schema)).toEqual({
      kind: 'field',
      typeName: 'Profile',
      fieldName: 'id',
    });
  });

  it('resolves mutation roots', () => {
    expect(docsTargetFromPath(['mutation', 'signIn'], schema)).toEqual({
      kind: 'field',
      typeName: 'Mutation',
      fieldName: 'signIn',
    });
  });

  it('returns null for an unknown field', () => {
    expect(docsTargetFromPath(['query', 'nope'], schema)).toBeNull();
  });

  it('returns null for an operation the schema does not define', () => {
    expect(docsTargetFromPath(['subscription', 'anything'], schema)).toBeNull();
  });

  it('returns null without a schema or a field segment', () => {
    expect(docsTargetFromPath(['query', 'me'], null)).toBeNull();
    expect(docsTargetFromPath(['query'], schema)).toBeNull();
  });
});

describe('useDocs', () => {
  it('starts on the root view', () => {
    const { result } = renderHook(() => useDocs({}));

    expect(result.current.docsNavStack).toEqual([]);
    expect(result.current.activePanel).toBeNull();
  });

  it('honours the default active panel', () => {
    const { result } = renderHook(() => useDocs({ defaultActivePanel: 'collections' }));

    expect(result.current.activePanel).toBe('collections');
  });

  it('opens the pane and pushes the target in one step', () => {
    const { result } = renderHook(() => useDocs({}));

    act(() => {
      result.current.openDocs({ kind: 'type', name: 'User' });
    });

    expect(result.current.activePanel).toBe('docs');
    expect(result.current.docsNavStack).toEqual([{ kind: 'type', name: 'User' }]);
  });

  it('opens the pane without a target, leaving the stack alone', () => {
    const { result } = renderHook(() => useDocs({}));

    act(() => {
      result.current.openDocs();
    });

    expect(result.current.activePanel).toBe('docs');
    expect(result.current.docsNavStack).toEqual([]);
  });

  it('pops back one level at a time', () => {
    const { result } = renderHook(() => useDocs({}));

    act(() => {
      result.current.pushDocs({ kind: 'type', name: 'User' });
    });
    act(() => {
      result.current.pushDocs({ kind: 'field', typeName: 'User', fieldName: 'id' });
    });
    act(() => {
      result.current.popDocs();
    });

    expect(result.current.docsNavStack).toEqual([{ kind: 'type', name: 'User' }]);
  });

  it('resets all the way to the root', () => {
    const { result } = renderHook(() => useDocs({}));

    act(() => {
      result.current.pushDocs({ kind: 'type', name: 'User' });
    });
    act(() => {
      result.current.resetDocs();
    });

    expect(result.current.docsNavStack).toEqual([]);
  });

  it('holds targets by name so a schema swap cannot strand the stack', () => {
    const { result } = renderHook(() => useDocs({}));

    act(() => {
      result.current.pushDocs({ kind: 'field', typeName: 'User', fieldName: 'id' });
    });

    // Nothing in the stack references a GraphQLSchema object, so a new schema
    // instance leaves it re-resolvable rather than pointing at a detached type.
    expect(result.current.docsNavStack).toEqual([
      { kind: 'field', typeName: 'User', fieldName: 'id' },
    ]);
  });
});

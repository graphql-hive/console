// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { useDocs } from './docs';

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

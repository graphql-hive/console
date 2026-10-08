// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { renderLaboratory } from './index';

const Laboratory = vi.hoisted(() => vi.fn((_props: Record<string, unknown>) => null));

vi.mock('./components/laboratory/laboratory', () => ({ Laboratory }));

// `index.tsx` re-exports the whole package, which drags in Monaco and its workers.
vi.mock('monaco-editor', () => ({ editor: {}, languages: {}, Uri: {} }));
vi.mock('@monaco-editor/react', () => ({ default: () => null, loader: { config: () => {} } }));
vi.mock('./components/laboratory/editor', () => ({ Editor: () => null }));
vi.mock('./components/ui/dialog', () => ({}));
vi.mock('./components/ui/tabs', () => ({}));

describe('renderLaboratory', () => {
  beforeEach(() => {
    Laboratory.mockClear();
    localStorage.clear();
  });

  const mount = (props = {}) => {
    const el = document.createElement('div');
    document.body.append(el);

    // createRoot().render() is async, so the props are not readable until flushed.
    act(() => {
      renderLaboratory(el, props);
    });

    return Laboratory.mock.lastCall?.[0];
  };

  // Standalone embedders (Hive Router) call this global directly and pass no props.
  it('enables the docs pane by default', () => {
    expect(mount()?.enableDocs).toBe(true);
  });

  it('lets the host turn it back off', () => {
    expect(mount({ enableDocs: false })?.enableDocs).toBe(false);
  });

  // render-laboratory forwards Yoga's `endpoint` here. A visitor may have a stale endpoint saved
  // from before the host configured one, so the configured value has to win (#8656).
  it('lets a host default endpoint win over the saved one', () => {
    localStorage.setItem(
      'hive-laboratory:endpoint',
      JSON.stringify('https://saved.example/graphql'),
    );

    expect(mount({ defaultEndpoint: 'https://host.example/graphql' })?.defaultEndpoint).toBe(
      'https://host.example/graphql',
    );
  });

  it('falls back to the saved endpoint when the host passes none', () => {
    localStorage.setItem(
      'hive-laboratory:endpoint',
      JSON.stringify('https://saved.example/graphql'),
    );

    expect(mount()?.defaultEndpoint).toBe('https://saved.example/graphql');
  });
});

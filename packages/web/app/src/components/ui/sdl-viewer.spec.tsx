// @vitest-environment jsdom
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { SdlViewer } from './sdl-viewer';

const fake = vi.hoisted(() => {
  type FakeModel = { uri: { scheme: string }; dispose: () => void };
  const state = { models: [] as FakeModel[] };
  const monaco = {
    languages: { registerDefinitionProvider: () => {} },
    editor: { getModels: () => state.models },
  };
  function model(scheme: string): FakeModel {
    const created: FakeModel = {
      uri: { scheme },
      dispose: () => {
        state.models = state.models.filter(m => m !== created);
      },
    };
    state.models.push(created);
    return created;
  }
  return { state, monaco, model };
});

vi.mock('@/components/schema-editor', () => ({
  SchemaEditor: (props: { onMount: Function }) => {
    useEffect(() => {
      props.onMount({}, fake.monaco);
    }, []);
    return null;
  },
}));

const viewer = (name: string) => (
  <SdlViewer sdl="type Query { a: String }" modelPath={`hive-sdl:/v1/${name}.graphql`} />
);

beforeEach(() => {
  vi.useFakeTimers();
  fake.state.models = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SdlViewer', () => {
  it('disposes viewer models, and only those, once the last viewer unmounts', () => {
    const viewerModel = fake.model('hive-sdl');
    const otherEditorModel = fake.model('inmemory');
    const first = render(viewer('a'));
    const second = render(viewer('b'));

    first.unmount();
    vi.runAllTimers();
    expect(fake.state.models).toContain(viewerModel);

    second.unmount();
    vi.runAllTimers();
    expect(fake.state.models).toEqual([otherEditorModel]);
  });

  it('keeps its models when a viewer remounts before the disposal runs', () => {
    const viewerModel = fake.model('hive-sdl');

    render(viewer('a')).unmount();
    render(viewer('a'));
    vi.runAllTimers();

    expect(fake.state.models).toContain(viewerModel);
  });
});

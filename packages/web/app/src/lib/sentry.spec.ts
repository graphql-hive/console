import { tagMonacoErrors, type ErrorEvent } from './sentry';

function eventWithFrame(filename: string): ErrorEvent {
  return {
    type: undefined,
    exception: {
      values: [{ type: 'Error', value: 'boom', stacktrace: { frames: [{ filename }] } }],
    },
  };
}

describe('tagMonacoErrors', () => {
  it('prefixes errors thrown from the monaco-editor package', () => {
    const event = tagMonacoErrors(
      eventWithFrame('node_modules/monaco-editor/esm/vs/base/common/async.js'),
    );
    expect(event.exception?.values?.[0]?.value).toBe('[Monaco] boom');
  });

  it('prefixes errors from the Monaco chunk inlined into the laboratory build, regardless of the content hash', () => {
    const event = tagMonacoErrors(
      eventWithFrame('../../libraries/laboratory/dist/editor.api-HASH.js'),
    );
    expect(event.exception?.values?.[0]?.value).toBe('[Monaco] boom');
  });

  it('leaves other errors untouched', () => {
    const event = tagMonacoErrors(eventWithFrame('src/components/foo.tsx'));
    expect(event.exception?.values?.[0]?.value).toBe('boom');
  });
});

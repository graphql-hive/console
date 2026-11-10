import {
  buildSentryInitOptions,
  sentryIgnoreErrors,
  tagMonacoErrors,
  type ErrorEvent,
} from './sentry';

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

describe('buildSentryInitOptions', () => {
  it('keeps the pre-v11 message behaviour and wires the app filters', () => {
    const options = buildSentryInitOptions({
      sentry: { dsn: 'https://public@sentry.invalid/1' },
      release: 'r1',
      environment: 'test',
    });

    expect(options).toMatchObject({
      dsn: 'https://public@sentry.invalid/1',
      enabled: true,
      dist: 'webapp',
      release: 'r1',
      environment: 'test',
      attachStacktrace: false,
      enhanceFetchErrorMessages: false,
    });
    expect(options.ignoreErrors).toBe(sentryIgnoreErrors);
    expect(options.beforeSend).toBe(tagMonacoErrors);
  });
});

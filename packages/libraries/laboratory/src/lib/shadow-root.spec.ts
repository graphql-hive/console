// @vitest-environment happy-dom
import { ensureShadowRoot } from './shadow-root';

describe('ensureShadowRoot', () => {
  it('attaches a shadow root to a host that has none', () => {
    const host = document.createElement('div');

    expect(ensureShadowRoot(host)).toBe(host.shadowRoot);
  });

  // The second call is what a StrictMode remount makes: same element, fresh effect.
  // Calling attachShadow again there throws, which took the whole Laboratory down.
  it('reuses the existing root instead of attaching a second one', () => {
    const host = document.createElement('div');
    const first = ensureShadowRoot(host);

    expect(() => host.attachShadow({ mode: 'open' })).toThrow();
    expect(ensureShadowRoot(host)).toBe(first);
  });
});

/**
 * React's StrictMode runs an effect, tears it down and runs it again against the same
 * DOM node, and `attachShadow` throws when the host already hosts a shadow tree
 * ("Shadow root cannot be created on a host which already hosts a shadow tree").
 * Reusing the existing root keeps the Laboratory mountable under StrictMode, which any
 * embedder may be running in development. The sibling effects on that container run
 * twice for the same reason, which only duplicates inert style nodes.
 */
export function ensureShadowRoot(host: HTMLElement): ShadowRoot {
  return host.shadowRoot ?? host.attachShadow({ mode: 'open' });
}

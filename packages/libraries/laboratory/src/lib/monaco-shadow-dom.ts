/**
 * Works around monaco losing hovers when it runs inside a shadow root.
 *
 * Monaco installs a document-level `mousemove` listener as a fallback for browsers
 * that occasionally skip `mouseleave`, and decides the pointer left the editor with
 * `viewDomNode.contains(event.target)`. Events crossing a shadow boundary are
 * retargeted to the host, and the host is an *ancestor* of the view node, so that
 * check is false for every move. Monaco therefore reports a mouse leave on the same
 * event that opened the hover, and tears it down before it can be seen.
 *
 * Keeping editor mouse moves inside the shadow tree avoids that. Monaco's real
 * `mouseleave` listener sits on the view node itself and still fires correctly, and
 * its drag handling uses pointer events, which are untouched.
 */
export function keepEditorMouseMovesInShadowRoot(shadowRoot: ShadowRoot): () => void {
  const stopEditorMouseMove = (event: Event) => {
    const target = event.target as Element | null;

    if (typeof target?.closest === 'function' && target.closest('.monaco-editor')) {
      event.stopPropagation();
    }
  };

  shadowRoot.addEventListener('mousemove', stopEditorMouseMove);

  return () => shadowRoot.removeEventListener('mousemove', stopEditorMouseMove);
}

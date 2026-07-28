const FONT_FACE_RULE = /@font-face\s*\{[^}]*\}/g;

const MARKER_ATTRIBUTE = 'data-hive-laboratory-fonts';

let hasInjected = false;

/**
 * Copies @font-face rules out of a stylesheet and into document.head.
 *
 * The laboratory renders inside a shadow root, and browsers resolve font faces
 * against the document's font set rather than a shadow tree's, so a @font-face
 * declared in the shadow style is ignored. Monaco's codicon glyphs (the folding
 * chevrons) render as empty squares without this.
 *
 * Idempotent across component instances, StrictMode double mounts, and multiple
 * copies of the bundle on one page.
 */
export function ensureDocumentFontFaces(css: string): void {
  if (hasInjected || typeof document === 'undefined') {
    return;
  }

  hasInjected = true;

  if (document.head.querySelector(`[${MARKER_ATTRIBUTE}]`)) {
    return;
  }

  const rules = css.match(FONT_FACE_RULE);

  if (!rules?.length) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute(MARKER_ATTRIBUTE, '');
  style.textContent = rules.join('\n');

  document.head.append(style);
}

/** Test seam: resets the module-level guard. */
export function resetDocumentFontFacesForTests(): void {
  hasInjected = false;
}

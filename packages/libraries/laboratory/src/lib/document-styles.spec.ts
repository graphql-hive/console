// @vitest-environment happy-dom
import { ensureDocumentFontFaces, resetDocumentFontFacesForTests } from './document-styles';

const CODICON_CSS = [
  '.monaco-editor{color:red}',
  '@font-face{font-display:block;font-family:codicon;src:url(data:font/ttf;base64,AAEA) format("truetype")}',
  '.codicon-folding-expanded:before{content:"\\eab4"}',
].join('');

const injectedStyles = () =>
  Array.from(document.head.querySelectorAll('[data-hive-laboratory-fonts]'));

describe('ensureDocumentFontFaces', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    resetDocumentFontFacesForTests();
  });

  it('copies the font-face rule into document.head', () => {
    ensureDocumentFontFaces(CODICON_CSS);

    const styles = injectedStyles();
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('font-family:codicon');
  });

  it('does not copy anything else from the stylesheet', () => {
    ensureDocumentFontFaces(CODICON_CSS);

    const text = injectedStyles()[0].textContent ?? '';
    expect(text).not.toContain('.monaco-editor');
    expect(text).not.toContain('codicon-folding-expanded');
  });

  it('is a no-op on a second call', () => {
    ensureDocumentFontFaces(CODICON_CSS);
    ensureDocumentFontFaces(CODICON_CSS);

    expect(injectedStyles()).toHaveLength(1);
  });

  it('does not duplicate when another copy of the bundle already injected', () => {
    ensureDocumentFontFaces(CODICON_CSS);
    // A second bundle has its own module state but shares the document.
    resetDocumentFontFacesForTests();
    ensureDocumentFontFaces(CODICON_CSS);

    expect(injectedStyles()).toHaveLength(1);
  });

  it('injects nothing when the stylesheet declares no font faces', () => {
    ensureDocumentFontFaces('.monaco-editor{color:red}');

    expect(injectedStyles()).toHaveLength(0);
  });

  it('copies every font-face rule when there are several', () => {
    ensureDocumentFontFaces(
      '@font-face{font-family:codicon;src:url(a)}@font-face{font-family:seti;src:url(b)}',
    );

    const text = injectedStyles()[0].textContent ?? '';
    expect(text).toContain('font-family:codicon');
    expect(text).toContain('font-family:seti');
  });
});

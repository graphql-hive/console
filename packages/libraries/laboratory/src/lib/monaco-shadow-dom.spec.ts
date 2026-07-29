// @vitest-environment happy-dom
import { keepEditorMouseMovesInShadowRoot } from './monaco-shadow-dom';

const buildShadowTree = () => {
  const host = document.createElement('div');
  document.body.append(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  const editor = document.createElement('div');
  editor.className = 'monaco-editor';
  const line = document.createElement('span');
  editor.append(line);

  const outsideEditor = document.createElement('button');

  shadowRoot.append(editor, outsideEditor);

  return { host, shadowRoot, line, outsideEditor };
};

const mouseMove = () => new MouseEvent('mousemove', { bubbles: true, composed: true });

describe('keepEditorMouseMovesInShadowRoot', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Monaco's document-level fallback listener treats any mousemove whose target is
  // not inside the editor as the pointer leaving, and retargeting makes that every
  // move. Withholding the event is what keeps hovers open.
  it('stops editor mouse moves reaching the document', () => {
    const { shadowRoot, line } = buildShadowTree();
    const onDocumentMouseMove = vi.fn();
    document.addEventListener('mousemove', onDocumentMouseMove);

    const dispose = keepEditorMouseMovesInShadowRoot(shadowRoot);
    line.dispatchEvent(mouseMove());

    expect(onDocumentMouseMove).not.toHaveBeenCalled();

    dispose();
    document.removeEventListener('mousemove', onDocumentMouseMove);
  });

  it('leaves the editor’s own listeners untouched', () => {
    const { shadowRoot, line } = buildShadowTree();
    const onEditorMouseMove = vi.fn();
    shadowRoot.querySelector('.monaco-editor')!.addEventListener('mousemove', onEditorMouseMove);

    const dispose = keepEditorMouseMovesInShadowRoot(shadowRoot);
    line.dispatchEvent(mouseMove());

    expect(onEditorMouseMove).toHaveBeenCalledOnce();

    dispose();
  });

  it('does not interfere with mouse moves outside an editor', () => {
    const { shadowRoot, outsideEditor } = buildShadowTree();
    const onDocumentMouseMove = vi.fn();
    document.addEventListener('mousemove', onDocumentMouseMove);

    const dispose = keepEditorMouseMovesInShadowRoot(shadowRoot);
    outsideEditor.dispatchEvent(mouseMove());

    expect(onDocumentMouseMove).toHaveBeenCalledOnce();

    dispose();
    document.removeEventListener('mousemove', onDocumentMouseMove);
  });

  it('stops intercepting once disposed', () => {
    const { shadowRoot, line } = buildShadowTree();
    const onDocumentMouseMove = vi.fn();
    document.addEventListener('mousemove', onDocumentMouseMove);

    keepEditorMouseMovesInShadowRoot(shadowRoot)();
    line.dispatchEvent(mouseMove());

    expect(onDocumentMouseMove).toHaveBeenCalledOnce();

    document.removeEventListener('mousemove', onDocumentMouseMove);
  });
});

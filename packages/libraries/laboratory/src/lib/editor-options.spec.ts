import { buildEditorOptions } from './editor-options';

describe('buildEditorOptions', () => {
  it('lets hover widgets escape the clipped panels', () => {
    expect(buildEditorOptions().fixedOverflowWidgets).toBe(true);
  });

  // Caller options are spread first on purpose; flipping to the more familiar
  // {...defaults, ...overrides} order would let an editor clip its own hovers.
  it('does not let a caller turn the shared options off', () => {
    const options = buildEditorOptions({ fixedOverflowWidgets: false, readOnly: true });

    expect(options.fixedOverflowWidgets).toBe(true);
    expect(options.readOnly).toBe(true);
  });
});

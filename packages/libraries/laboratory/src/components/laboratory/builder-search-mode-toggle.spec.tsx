// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { BuilderSearchModeToggle, BuilderSearchResultMode } from './builder';

const renderToggle = (
  overrides: Partial<React.ComponentProps<typeof BuilderSearchModeToggle>> = {},
) => {
  const onModeChange = vi.fn();

  render(
    <BuilderSearchModeToggle
      mode={BuilderSearchResultMode.TREE}
      onModeChange={onModeChange}
      isSearchActive
      {...overrides}
    />,
  );

  return {
    onModeChange,
    tree: screen.getByLabelText('Tree') as HTMLButtonElement,
    list: screen.getByLabelText('List') as HTMLButtonElement,
  };
};

describe('BuilderSearchModeToggle', () => {
  it('is disabled until there is a search, since the mode only affects results', () => {
    const { tree, list } = renderToggle({ isSearchActive: false });

    expect(tree.disabled).toBe(true);
    expect(list.disabled).toBe(true);
  });

  it('reports the newly picked mode', () => {
    const { list, onModeChange } = renderToggle();

    fireEvent.click(list);

    expect(onModeChange).toHaveBeenCalledWith(BuilderSearchResultMode.LIST);
  });

  it('stays on the current mode when the active item is clicked again', () => {
    const { tree, onModeChange } = renderToggle();

    fireEvent.click(tree);

    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('reflects the mode it is given rather than tracking its own', () => {
    const { tree, list } = renderToggle({ mode: BuilderSearchResultMode.LIST });

    expect(list.getAttribute('data-state')).toBe('on');
    expect(tree.getAttribute('data-state')).toBe('off');
  });
});

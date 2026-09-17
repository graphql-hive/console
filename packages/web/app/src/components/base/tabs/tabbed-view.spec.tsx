// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { TabbedView } from './tabbed-view';

const VIEWS = [
  { value: 'details', label: 'Details', content: <p>Details view</p> },
  { value: 'schema', label: 'Schema', content: <p>Schema view</p> },
];

describe('TabbedView', () => {
  it('puts the action and tabs in the band and the picked view in the body', () => {
    const onValueChange = vi.fn();
    render(
      <TabbedView
        items={VIEWS}
        defaultValue="details"
        onValueChange={onValueChange}
        action={<button type="button">Pick graph</button>}
        attrs={{ 'data-cy': 'check-view' }}
      />,
    );
    const view = document.querySelector('[data-cy="check-view"]')!;
    const band = view.firstElementChild!;
    expect(band.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(band.textContent).toContain('Pick graph');
    expect(screen.getByRole('tabpanel').textContent).toBe('Details view');
    expect(screen.queryByText('Schema view')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Schema' }));
    expect(onValueChange).toHaveBeenCalledWith('schema');
    expect(screen.getByRole('tabpanel').textContent).toBe('Schema view');
  });
});

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from './tabs';

const ITEMS = [
  {
    value: 'details',
    label: 'Details',
    content: <p>Details panel</p>,
    attrs: { 'data-testid': 'details-view-btn' },
  },
  { value: 'schema', label: 'Schema', content: <p>Schema panel</p> },
  { value: 'policy', label: 'Policy', disabled: true },
];

describe('Tabs', () => {
  it('renders a tab per item, shows the active panel, and switches on click', () => {
    const onValueChange = vi.fn();
    render(<Tabs items={ITEMS} defaultValue="details" onValueChange={onValueChange} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('data-testid')).toBe(
      'details-view-btn',
    );
    expect(screen.getByText('Details panel')).toBeTruthy();
    expect(screen.queryByText('Schema panel')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Schema' }));
    expect(onValueChange).toHaveBeenCalledWith('schema');
    expect(screen.getByText('Schema panel')).toBeTruthy();
    expect(screen.queryByText('Details panel')).toBeNull();
  });

  it('keeps a disabled tab out of reach and renders no panel for items without content', () => {
    render(<Tabs items={ITEMS} defaultValue="details" />);
    const policy = screen.getByRole('tab', { name: 'Policy' });
    expect(policy.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('leads the strip with the action without making it a tab', () => {
    render(
      <Tabs
        items={ITEMS}
        defaultValue="details"
        variant="header"
        action={<button type="button">Pick graph</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Pick graph' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});

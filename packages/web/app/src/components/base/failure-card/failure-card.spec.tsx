// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { FailureCard } from './failure-card';

describe('FailureCard', () => {
  it('names each failure with its reason and scopes the page from its row', () => {
    const onView = vi.fn();
    render(
      <FailureCard
        title="2 of 11 contracts failed"
        aside="9 passed"
        items={[
          {
            key: 'mobile',
            label: 'mobile',
            reason: 'Composition failed.',
            detail: '2 errors',
            onView: () => onView('mobile'),
          },
          { key: 'billing', label: 'billing', reason: 'Unapproved breaking changes!' },
        ]}
      />,
    );
    expect(screen.getByText('2 of 11 contracts failed')).toBeTruthy();
    expect(screen.getByText('9 passed')).toBeTruthy();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('mobile');
    expect(rows[0].textContent).toContain('Composition failed. 2 errors');
    expect(rows[1].textContent).toContain('Unapproved breaking changes!');

    // Only the row with a handler gets a button.
    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(onView).toHaveBeenCalledWith('mobile');
  });

  it('renders nothing without items', () => {
    const { container } = render(<FailureCard title="0 of 11 contracts failed" items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { RefreshButton } from './refresh-button';

describe('RefreshButton', () => {
  it('is a button named Refresh that calls back on click', () => {
    const onClick = vi.fn();
    render(<RefreshButton onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button.className).toContain('w-9');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('takes the compact size for filter rows', () => {
    render(<RefreshButton size="compact" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Refresh' }).className).toContain('w-7.5');
  });

  it('does nothing while disabled', () => {
    const onClick = vi.fn();
    render(<RefreshButton disabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button).toHaveProperty('disabled', true);

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

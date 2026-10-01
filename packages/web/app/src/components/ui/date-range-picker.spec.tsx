// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DateRangePicker, presetLast7Days } from './date-range-picker';

describe('DateRangePicker', () => {
  it('renders its own segmented trigger at the form-control height', () => {
    render(<DateRangePicker selectedRange={presetLast7Days.range} />);
    const trigger = screen.getByRole('button', { name: 'Last 7 days' });
    expect(trigger.className).toContain('h-9');
    expect(trigger.className).not.toContain('h-7.5');
  });

  it('takes the compact height for a filter row', () => {
    render(<DateRangePicker selectedRange={presetLast7Days.range} size="compact" />);
    expect(screen.getByRole('button', { name: 'Last 7 days' }).className).toContain('h-7.5');
  });

  it('labels a relative range the quick-range list does not list by name', () => {
    // The pages used to pass the controller's label here, which falls back to absolute dates.
    render(<DateRangePicker selectedRange={{ from: 'now-3d', to: 'now' }} />);
    expect(screen.getByRole('button', { name: 'Last 3 days' })).toBeTruthy();
  });

  it('applies a quick range from the panel and closes', async () => {
    const onUpdate = vi.fn();
    render(<DateRangePicker selectedRange={presetLast7Days.range} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Last 30 days' }));
    expect(onUpdate).toHaveBeenCalledWith({
      preset: expect.objectContaining({ name: 'last30d' }),
    });
    await waitFor(() => expect(screen.queryByPlaceholderText('Filter quick ranges')).toBeNull());
  });

  it('lists every preset, greying out those that start before the start date', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    render(
      <DateRangePicker
        selectedRange={presetLast7Days.range}
        startDate={new Date(Date.now() - 8 * DAY)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    const preset = (name: string) =>
      screen.getAllByRole('button', { name }).at(-1) as HTMLButtonElement;
    await screen.findByRole('button', { name: 'Last 15 minutes' });
    expect(preset('Last 15 minutes').disabled).toBe(false);
    expect(preset('Last 7 days').disabled).toBe(false);
    expect(preset('Last 14 days').disabled).toBe(true);
    expect(preset('Last 1 year').disabled).toBe(true);
  });
});

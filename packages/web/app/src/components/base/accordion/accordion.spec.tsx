// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Accordion } from './accordion';

const ITEMS = [
  { value: 'a', label: 'Breaking', content: <p>Breaking panel</p>, attrs: { 'data-cy': 'row-a' } },
  { value: 'b', label: 'Safe', content: <p>Safe panel</p> },
  { value: 'c', label: 'Locked', content: <p>Locked panel</p>, disabled: true },
];

describe('Accordion', () => {
  it('opens one item at a time by default, and reports the open set', () => {
    const onValueChange = vi.fn();
    render(<Accordion items={ITEMS} onValueChange={onValueChange} />);
    expect(screen.queryByText('Breaking panel')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Breaking' }));
    expect(screen.getByText('Breaking panel')).toBeTruthy();
    expect(onValueChange).toHaveBeenLastCalledWith(['a']);

    fireEvent.click(screen.getByRole('button', { name: 'Safe' }));
    expect(screen.queryByText('Breaking panel')).toBeNull();
    expect(screen.getByText('Safe panel')).toBeTruthy();
    expect(onValueChange).toHaveBeenLastCalledWith(['b']);
  });

  it('keeps several open with multiple, and follows a controlled value', () => {
    const { rerender } = render(
      <Accordion items={ITEMS} multiple value={['a', 'b']} onValueChange={() => {}} />,
    );
    expect(screen.getByText('Breaking panel')).toBeTruthy();
    expect(screen.getByText('Safe panel')).toBeTruthy();

    rerender(<Accordion items={ITEMS} multiple value={[]} onValueChange={() => {}} />);
    expect(screen.queryByText('Breaking panel')).toBeNull();
  });

  it('puts trailing inside the trigger and action beside it, and lands attrs on the item', () => {
    render(
      <Accordion
        items={[
          {
            ...ITEMS[0],
            trailing: <span>3 selected</span>,
            action: <button type="button">More</button>,
          },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Breaking/ });
    expect(trigger.textContent).toContain('3 selected');
    const more = screen.getByRole('button', { name: 'More' });
    expect(trigger.contains(more)).toBe(false);
    expect(document.querySelector('[data-cy="row-a"]')!.contains(more)).toBe(true);
  });

  it('will not open a disabled item', () => {
    render(<Accordion items={ITEMS} />);
    const locked = screen.getByRole('button', { name: 'Locked' });
    expect(locked.hasAttribute('disabled') || locked.getAttribute('aria-disabled') === 'true').toBe(
      true,
    );
    fireEvent.click(locked);
    expect(screen.queryByText('Locked panel')).toBeNull();
  });
});

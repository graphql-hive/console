// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders a button by default', () => {
    render(<Checkbox aria-label="Include field" />);

    expect(screen.getByLabelText('Include field').tagName).toBe('BUTTON');
  });

  // Builder rows are themselves buttons, and a button inside a button is invalid.
  it('renders a span when asSpan, keeping checkbox semantics and clicks', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox asSpan aria-label="Include field" onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByLabelText('Include field');

    expect(checkbox.tagName).toBe('SPAN');
    expect(checkbox.getAttribute('role')).toBe('checkbox');

    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('still reflects checked state as a span', () => {
    render(<Checkbox asSpan checked aria-label="Include field" />);

    expect(screen.getByLabelText('Include field').getAttribute('data-state')).toBe('checked');
  });
});

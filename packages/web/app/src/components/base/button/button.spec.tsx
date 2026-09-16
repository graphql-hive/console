// @vitest-environment jsdom
import { RefreshCw } from 'lucide-react';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders an icon-only button as a square at each size rung', () => {
    const { rerender } = render(<Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" />);
    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('w-9');
    expect(button.className).toContain('justify-center');

    rerender(<Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" size="compact" />);
    expect(button.className).toContain('h-7.5');
    expect(button.className).toContain('w-7.5');
  });

  it('leaves the width of a text button to its content', () => {
    render(<Button variant="primary">Save alert</Button>);
    const button = screen.getByRole('button', { name: 'Save alert' });
    expect(button.className).toContain('px-4');
    expect(button.className).not.toContain('w-9');
  });
});

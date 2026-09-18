// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('announces itself as a status and spins the accent icon at the default size', () => {
    render(<Spinner />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-label')).toBe('Loading');
    const icon = status.querySelector('svg') as SVGElement;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.classList.contains('animate-spinner-spin')).toBe(true);
    expect(icon.classList.contains('[&>path]:animate-spinner-arc')).toBe(true);
    expect(icon.classList.contains('text-accent')).toBe(true);
    expect(icon.classList.contains('size-6')).toBe(true);
  });

  it('takes a label and a size', () => {
    render(<Spinner label="Loading app deployments" variants={{ size: 'sm' }} />);
    const status = screen.getByLabelText('Loading app deployments');
    expect(status.querySelector('svg')?.classList.contains('size-4')).toBe(true);
  });
});

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('labels the control it points at', () => {
    render(
      <>
        <Label htmlFor="cdn-graph" label="Graph Variant" />
        <select id="cdn-graph" />
      </>,
    );
    expect(screen.getByLabelText('Graph Variant').tagName).toBe('SELECT');
  });

  it('carries a hint beside the label, outside it, with its own accessible name', () => {
    render(
      <>
        <Label htmlFor="cdn-artifact" label="Artifact" tooltip="What the CDN serves." />
        <select id="cdn-artifact" />
      </>,
    );
    const hint = screen.getByRole('button', { name: 'About Artifact' });
    expect(screen.getByText('Artifact').contains(hint)).toBe(false);
    expect(screen.getByLabelText('Artifact').tagName).toBe('SELECT');
  });

  it('is small caps by default and sentence case inline, beside a switch', () => {
    const { rerender } = render(<Label htmlFor="x" label="Toggle Diff" />);
    expect(screen.getByText('Toggle Diff').className).toContain('uppercase');
    rerender(<Label htmlFor="x" label="Toggle Diff" variant="inline" />);
    const label = screen.getByText('Toggle Diff');
    expect(label.className).not.toContain('uppercase');
    expect(label.className).toContain('text-xs');
  });
});

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { ScopeBar } from './scope-bar';

describe('ScopeBar', () => {
  it('labels the picker and keys its glyphs', () => {
    render(
      <ScopeBar
        picker={<button type="button">Default Graph</button>}
        legend={[
          { icon: <span />, label: 'Failed' },
          { icon: <span />, label: 'Passed' },
        ]}
      />,
    );
    expect(screen.getByText('Viewing')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Default Graph' })).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
  });

  it('leaves out the legend without items', () => {
    const { container } = render(
      <ScopeBar label="Graph" picker={<span>Default Graph</span>} legend={[]} />,
    );
    expect(screen.getByText('Graph')).toBeTruthy();
    expect(container.querySelector('dl')).toBeNull();
  });
});

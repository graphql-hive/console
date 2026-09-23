// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Legend } from './legend';

describe('Legend', () => {
  it('pairs each icon with its label in a description list', () => {
    render(
      <Legend
        items={[
          { icon: <span data-testid="failed-icon" />, label: 'Failed' },
          { icon: <span data-testid="passed-icon" />, label: 'Passed' },
        ]}
      />,
    );
    const terms = screen.getAllByRole('term');
    expect(terms).toHaveLength(2);
    expect(terms[0].contains(screen.getByTestId('failed-icon'))).toBe(true);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual([
      'Failed',
      'Passed',
    ]);
  });
});

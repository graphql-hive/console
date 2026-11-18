// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Filters } from './filters';
import type { FilterDimension } from './types';

const subgraph: FilterDimension = {
  key: 'subgraph',
  label: 'Subgraph',
  items: [{ name: 'products', values: [] }],
  selectedItems: [],
  onChange: () => {},
  onRemove: () => {},
};

describe('Filters', () => {
  it('starts the row at the pinned controls when there is nothing to filter by', () => {
    // Regression: the trigger used to render anyway and open an empty panel.
    render(<Filters dimensions={[]} pinnedControls={<span>Last 7 days</span>} />);
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull();
    expect(screen.getByText('Last 7 days')).toBeTruthy();
  });

  it('renders the menu trigger once a dimension exists', () => {
    render(<Filters dimensions={[subgraph]} />);
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
  });

  it("shows the dimension's unavailable note in the chip popover", async () => {
    render(
      <Filters
        dimensions={[
          {
            ...subgraph,
            items: [{ name: 'gone', values: [], unavailable: true }],
            selectedItems: [{ name: 'gone', values: null }],
            unavailableNote: 'not in the current schema',
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '1 subgraph' }));
    expect(await screen.findByText(/not in the current schema/)).toBeTruthy();
  });

  it('keeps the trigger for an active view so it can be cleared', () => {
    render(<Filters dimensions={[]} activeLabel="Errors only" onClearActive={() => {}} />);
    expect(screen.getByRole('button', { name: /Errors only/ })).toBeTruthy();
  });
});

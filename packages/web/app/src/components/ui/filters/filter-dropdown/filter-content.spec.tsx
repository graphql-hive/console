// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { FilterContent } from './filter-content';
import type { FilterItem } from './types';

const items: FilterItem[] = [{ name: 'https://api.acme.dev/graphql', values: [] }];
const retired: FilterItem = {
  name: 'https://legacy.acme.dev/graphql',
  values: [],
  unavailable: true,
};

function renderContent(props: { items: FilterItem[]; truncatedTo?: number }) {
  render(
    <FilterContent
      label="http url"
      items={props.items}
      selectedItems={[]}
      onChange={() => {}}
      truncatedTo={props.truncatedTo}
    />,
  );
}

describe('FilterContent truncation note', () => {
  it('says nothing about frequency when the list is complete', () => {
    renderContent({ items: [...items, retired] });
    expect(screen.queryByText(/most frequent/)).toBeNull();
    expect(screen.getByText(/not found in the selected date range/)).toBeTruthy();
  });

  it('says the list holds only the most frequent values when truncated', () => {
    renderContent({ items, truncatedTo: 1000 });
    expect(
      screen.getByText('Showing the 1,000 most frequent in the selected date range.'),
    ).toBeTruthy();
  });

  it('explains a struck-through selection as outside the most frequent values', () => {
    renderContent({ items: [...items, retired], truncatedTo: 1000 });
    expect(
      screen.getByText(/not among the most frequent values in the selected date range/),
    ).toBeTruthy();
    expect(screen.queryByText(/not found in the selected date range/)).toBeNull();
  });
});

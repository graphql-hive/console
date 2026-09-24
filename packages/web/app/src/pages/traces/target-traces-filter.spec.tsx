// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MultiSelectFilter } from './target-traces-filter';

const options = [
  { count: 3, label: 'web', searchContent: 'web', value: 'web' },
  { count: 1, label: 'cli', searchContent: 'cli', value: 'cli' },
];

describe('MultiSelectFilter', () => {
  it('keeps the search field while a search matches nothing', () => {
    render(
      <MultiSelectFilter
        name="Client"
        key="client"
        options={options}
        selectedValues={[]}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Client'));
    fireEvent.change(screen.getByPlaceholderText('Search values'), {
      target: { value: 'mobile' },
    });
    // Regression: the field used to be gated on the filtered list, so it vanished mid-search.
    expect(screen.getByText('No option available')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search values')).toBeTruthy();
  });

  it('hides the search field when the group has nothing to search', () => {
    render(
      <MultiSelectFilter
        name="Client"
        key="client"
        options={[]}
        selectedValues={[]}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Client'));
    expect(screen.queryByPlaceholderText('Search values')).toBeNull();
    expect(screen.getByText('No option available')).toBeTruthy();
  });
});

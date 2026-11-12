// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { countNoun, FilterDropdown } from './filter-dropdown';

describe('countNoun', () => {
  it('lowercases the label but keeps acronyms', () => {
    expect(countNoun('Operation name')).toBe('operation name');
    expect(countNoun('HTTP URL')).toBe('HTTP URL');
    expect(countNoun('A')).toBe('a');
  });
});

describe('FilterDropdown count', () => {
  function chip(selected: string[], labelPlural?: string) {
    render(
      <FilterDropdown
        label="HTTP status"
        labelPlural={labelPlural}
        items={selected.map(name => ({ name, values: [] }))}
        selectedItems={selected.map(name => ({ name, values: null }))}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
  }

  it('keeps the acronym in the singular, matching the plural', () => {
    chip(['200'], 'HTTP statuses');
    expect(screen.getByRole('button', { name: '1 HTTP status' })).toBeTruthy();
  });

  it('uses the given plural', () => {
    chip(['200', '400'], 'HTTP statuses');
    expect(screen.getByRole('button', { name: '2 HTTP statuses' })).toBeTruthy();
  });
});

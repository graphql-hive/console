import { encodeIdSelections, urlFilterDimension } from './url-filter';

describe('urlFilterDimension', () => {
  it('carries the display extras onto the dimension', () => {
    const dimension = urlFilterDimension({
      navigate: (() => Promise.resolve()) as never,
      search: { severities: ['high'] },
      searchKey: 'severities',
      key: 'severity',
      label: 'Severity',
      labelPlural: 'severities',
      alwaysShowSearch: true,
      unavailableNote: 'retired',
      items: [{ name: 'high', values: [] }],
      encode: encodeIdSelections,
      decode: () => [],
    });
    expect(dimension).toMatchObject({
      labelPlural: 'severities',
      alwaysShowSearch: true,
      unavailableNote: 'retired',
    });
  });
});

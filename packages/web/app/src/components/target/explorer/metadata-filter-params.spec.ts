import {
  fromMetadataSelections,
  toMetadataItems,
  toMetadataSelections,
  type MetadataAttribute,
} from './metadata-filter-params';

const ATTRIBUTES: MetadataAttribute[] = [
  { name: 'team', values: ['payments', 'identity', 'catalog'] },
  { name: 'tier', values: ['gold', 'silver'] },
];

describe('toMetadataItems', () => {
  it('maps attributes to two-level filter items', () => {
    expect(toMetadataItems(ATTRIBUTES)).toEqual([
      { name: 'team', values: ['payments', 'identity', 'catalog'] },
      { name: 'tier', values: ['gold', 'silver'] },
    ]);
  });
});

describe('toMetadataSelections', () => {
  it('groups flat entries by attribute', () => {
    expect(toMetadataSelections(['team:payments', 'team:identity'], ATTRIBUTES)).toEqual([
      { name: 'team', values: ['payments', 'identity'] },
    ]);
  });

  it('collapses a fully selected attribute to "all values"', () => {
    const meta = ['team:payments', 'team:identity', 'team:catalog'];

    expect(toMetadataSelections(meta, ATTRIBUTES)).toEqual([{ name: 'team', values: null }]);
  });

  it('keeps a partial selection as an explicit list', () => {
    expect(toMetadataSelections(['tier:gold'], ATTRIBUTES)).toEqual([
      { name: 'tier', values: ['gold'] },
    ]);
  });

  it('returns selections in attribute order, not URL order', () => {
    expect(toMetadataSelections(['tier:gold', 'team:catalog'], ATTRIBUTES)).toEqual([
      { name: 'team', values: ['catalog'] },
      { name: 'tier', values: ['gold'] },
    ]);
  });

  it('drops entries for attributes and values that no longer exist', () => {
    const meta = ['team:payments', 'team:decommissioned', 'region:eu'];

    expect(toMetadataSelections(meta, ATTRIBUTES)).toEqual([
      { name: 'team', values: ['payments'] },
    ]);
  });

  it('de-duplicates repeated entries', () => {
    expect(toMetadataSelections(['tier:gold', 'tier:gold'], ATTRIBUTES)).toEqual([
      { name: 'tier', values: ['gold'] },
    ]);
  });

  // Values are matched against known attributes rather than split on the first
  // separator, so a colon inside a value stays part of the value.
  it('handles values containing the separator', () => {
    const attributes: MetadataAttribute[] = [{ name: 'owner', values: ['team:payments'] }];

    expect(toMetadataSelections(['owner:team:payments'], attributes)).toEqual([
      { name: 'owner', values: null },
    ]);
  });

  it('returns nothing for an empty filter', () => {
    expect(toMetadataSelections([], ATTRIBUTES)).toEqual([]);
  });
});

describe('fromMetadataSelections', () => {
  it('flattens an explicit selection', () => {
    const selections = [{ name: 'team', values: ['payments', 'catalog'] }];

    expect(fromMetadataSelections(selections, ATTRIBUTES)).toEqual([
      'team:payments',
      'team:catalog',
    ]);
  });

  it('expands "all values" to every value of the attribute', () => {
    expect(fromMetadataSelections([{ name: 'tier', values: null }], ATTRIBUTES)).toEqual([
      'tier:gold',
      'tier:silver',
    ]);
  });

  it('ignores unknown attributes and values', () => {
    const selections = [
      { name: 'region', values: ['eu'] },
      { name: 'tier', values: ['gold', 'bronze'] },
    ];

    expect(fromMetadataSelections(selections, ATTRIBUTES)).toEqual(['tier:gold']);
  });

  it('round-trips a mixed selection', () => {
    const meta = ['team:payments', 'tier:gold', 'tier:silver'];
    const selections = toMetadataSelections(meta, ATTRIBUTES);

    expect(selections).toEqual([
      { name: 'team', values: ['payments'] },
      { name: 'tier', values: null },
    ]);
    expect(fromMetadataSelections(selections, ATTRIBUTES)).toEqual(meta);
  });
});

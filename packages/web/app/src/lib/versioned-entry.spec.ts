import {
  createKeyValueStoreMemory,
  KeyValueStoreDatabase,
  PreviousEntriesPolicy,
  readVersionedEntry,
  VersionedEntrySpec,
} from './versioned-entry';

interface TestCase {
  databaseBefore: KeyValueStoreDatabase;
  databaseAfter: KeyValueStoreDatabase;
  spec: VersionedEntrySpec;
  value: string | null;
  previousEntriesPolicy?: PreviousEntriesPolicy;
}

const a = 'a';
const b = 'b';
const c = 'c';

// prettier-ignore
test.for<TestCase>([
	// Returns null if spec key is missing in db
	{ spec: [{ key:a }],                   databaseBefore: {},      databaseAfter: {},      value: null },
	{ spec: [{ key:a }],                   databaseBefore: {b},     databaseAfter: {b},     value: null },
	// Returns value if spec key is present in db
	{ spec: [{ key:a }],                   databaseBefore: {a},     databaseAfter: {a},     value: a },
	{ spec: [{ key:a }],                   databaseBefore: {a,b},   databaseAfter: {a,b},   value: a },
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {a},     databaseAfter: {a},     value: a },
	//
	// With previousEntriesPolicy = ignore (default)
	//
	// Previous spec keys are NOT removed from db
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {a,b},   databaseAfter: {a,b},       value: a },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {a,b,c}, databaseAfter: {a,b,c},     value: a },
	// Latest found spec key is returned
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {b},     databaseAfter: {a:b,b},     value: b },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {c},     databaseAfter: {a:c,c},     value: c },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {b,c},   databaseAfter: {a:b,b,c},   value: b },
	//
	// With previousEntriesPolicy = remove
	//
	// Previous spec keys are removed from db
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {a,b},   databaseAfter: {a},     value: a, previousEntriesPolicy: 'remove' },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {a,b,c}, databaseAfter: {a},     value: a, previousEntriesPolicy: 'remove' },
	// Latest found spec key is returned AND removed from db if not current spec
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {b},     databaseAfter: {a:b},   value: b, previousEntriesPolicy: 'remove' },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {c},     databaseAfter: {a:c},   value: c, previousEntriesPolicy: 'remove' },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {b,c},   databaseAfter: {a:b},   value: b, previousEntriesPolicy: 'remove' },
	// Non-spec keys in db are not removed
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {a,b,c}, databaseAfter: {a,c},   value: a, previousEntriesPolicy: 'remove' },
])(
  '%j',
  ({ databaseBefore, databaseAfter, spec, value, previousEntriesPolicy }) => {
    const readVersionedEntryMemory = readVersionedEntry(createKeyValueStoreMemory(databaseBefore));
		const valueActual = readVersionedEntryMemory({spec, previousEntriesPolicy})
		expect(databaseBefore).toEqual(databaseAfter)
		expect(valueActual).toEqual(value)
  },
);

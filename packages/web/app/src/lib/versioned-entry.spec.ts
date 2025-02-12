import {
  createKeyValueStoreMemory,
  KeyValueStore,
  KeyValueStoreDatabase,
  readVersionedEntry,
  VersionedEntrySpec,
} from './versioned-entry';

interface TestCase {
  databaseBefore: KeyValueStoreDatabase;
  databaseAfter: KeyValueStoreDatabase;
  spec: VersionedEntrySpec;
  value: string | null;
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
	// Previous spec keys are removed from db
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {a,b},   databaseAfter: {a},     value: a },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {a,b,c}, databaseAfter: {a},     value: a },
	// Non-spec keys in db are not removed
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {a,b,c}, databaseAfter: {a,c},   value: a },
	// Latest found spec key is returned + migrated in db
	{ spec: [{ key:a }, {key:b}],          databaseBefore: {b},     databaseAfter: {a:b},   value: b },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {c},     databaseAfter: {a:c},   value: c },
	{ spec: [{ key:a }, {key:b}, {key:c}], databaseBefore: {b,c},   databaseAfter: {a:b},   value: b },
])(
  '%j',
  (testCase) => {
    const readVersionedEntryMemory = readVersionedEntry(createKeyValueStoreMemory(testCase.databaseBefore));
		const value = readVersionedEntryMemory(testCase.spec)
		expect(testCase.databaseBefore).toEqual(testCase.databaseAfter)
		expect(value).toEqual(testCase.value)
  },
);

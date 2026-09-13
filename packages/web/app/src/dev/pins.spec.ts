import {
  decodePins,
  EMPTY,
  encodePins,
  formatPinValue,
  isPinKey,
  parsePinAssignment,
  parsePinValue,
} from './pins';

describe('parsePinAssignment', () => {
  test.each([
    ['Organization.plan:ENTERPRISE', ['Organization.plan', 'ENTERPRISE']],
    ['Query.hasCollectedOperations:false', ['Query.hasCollectedOperations', false]],
    ['Target.latestSchemaVersion:null', ['Target.latestSchemaVersion', null]],
    ['RateLimit.retentionInDays:7', ['RateLimit.retentionInDays', 7]],
    ['Organization.supportTickets:@empty', ['Organization.supportTickets', EMPTY]],
    ['Organization.name:"Acme Corp"', ['Organization.name', 'Acme Corp']],
    [' Organization.plan : PRO ', ['Organization.plan', 'PRO']],
  ])('%s', (input, expected) => {
    expect(parsePinAssignment(input)).toEqual(expected);
  });

  test('keeps colons inside the value', () => {
    expect(parsePinAssignment('Target.graphqlEndpointUrl:http://x:1')).toEqual([
      'Target.graphqlEndpointUrl',
      'http://x:1',
    ]);
  });

  test.each([
    '',
    'nope',
    'Organization.plan',
    'Organization.plan:',
    'plan:PRO',
    'Organization:PRO',
  ])('rejects %p', input => {
    expect(parsePinAssignment(input)).toBeNull();
  });
});

describe('isPinKey', () => {
  test('requires Type.field with a capitalised type and a lowercase field', () => {
    expect(isPinKey('Organization.plan')).toBe(true);
    expect(isPinKey('Target.experimental_forcedLegacySchemaComposition')).toBe(true);
    expect(isPinKey('organization.plan')).toBe(false);
    expect(isPinKey('Organization.Plan')).toBe(false);
    expect(isPinKey('Organization')).toBe(false);
  });
});

describe('value round trip', () => {
  test.each([true, false, null, 42, 'ENTERPRISE', EMPTY, 'two words'])('%p', value => {
    expect(parsePinValue(formatPinValue(value))).toEqual(value);
  });
});

describe('cookie round trip', () => {
  test('encodes to cookie-safe characters and decodes back', () => {
    const pins = {
      'Organization.plan': 'ENTERPRISE',
      'Target.latestSchemaVersion': null,
      'X.y': 1,
    };
    const encoded = encodePins(pins);

    expect(encoded).not.toMatch(/[\s;,"]/);
    expect(decodePins(encoded)).toEqual(pins);
  });

  test('drops keys that are not Type.field and survives garbage', () => {
    expect(decodePins(encodeURIComponent(JSON.stringify({ 'A.b': 1, junk: 2 })))).toEqual({
      'A.b': 1,
    });
    expect(decodePins(undefined)).toEqual({});
    expect(decodePins('%7Bnot json')).toEqual({});
    expect(decodePins(encodeURIComponent('[1,2]'))).toEqual({});
  });
});

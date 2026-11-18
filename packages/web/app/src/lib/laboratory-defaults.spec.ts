// @vitest-environment jsdom
import { readLaboratoryDefaults, resolveLaboratoryTargetId } from './laboratory-defaults';
import { laboratoryStorage } from './laboratory-storage';

const operation = {
  id: 'op1',
  name: 'Linked',
  query: '{ a }',
  variables: '{}',
  headers: '{}',
  extensions: '{}',
};

afterEach(() => {
  localStorage.clear();
});

describe('readLaboratoryDefaults', () => {
  it("reads only this target's state, with defaults when nothing is saved", () => {
    laboratoryStorage('target-a').set('env', { variables: { token: 'a' } });

    expect(readLaboratoryDefaults('target-b', null, null)).toEqual({
      defaultOperations: [],
      defaultTabs: [],
      defaultActiveTabId: null,
      defaultSettings: null,
      defaultEnv: { variables: {} },
      defaultPluginsState: {},
      defaultPreflight: null,
    });
  });

  it('picks up writes made since the last mount', () => {
    const storage = laboratoryStorage('target-a');
    storage.set('tabs', [{ id: 't1', type: 'operation', data: { id: 'op1', name: 'A' } }]);
    readLaboratoryDefaults('target-a', null, null);

    storage.set('tabs', []);

    expect(readLaboratoryDefaults('target-a', null, null).defaultTabs).toEqual([]);
  });

  it("pairs the server's preflight script with this target's toggle", () => {
    laboratoryStorage('target-a').set('preflightEnabled', true);

    expect(readLaboratoryDefaults('target-a', null, 'lab.x()').defaultPreflight).toEqual({
      script: 'lab.x()',
      enabled: true,
    });
    expect(readLaboratoryDefaults('target-b', null, 'lab.x()').defaultPreflight).toEqual({
      script: 'lab.x()',
      enabled: false,
    });
  });

  it('opens a linked operation and saves it so a remount keeps it', () => {
    const defaults = readLaboratoryDefaults('target-a', { operation, matchBy: 'id' }, null);

    expect(defaults.defaultOperations).toEqual([operation]);
    expect(defaults.defaultActiveTabId).toBe('op1');
    expect(readLaboratoryDefaults('target-a', null, null).defaultOperations).toEqual([operation]);
    expect(laboratoryStorage('target-b').has('operations')).toBe(false);
  });
});

describe('resolveLaboratoryTargetId', () => {
  const settled = {
    pageTargetId: 'target-a',
    pageFetching: false,
    labTargetId: 'target-a',
    labFetching: false,
  };

  it('resolves once both queries settle on the same target', () => {
    expect(resolveLaboratoryTargetId(settled)).toBe('target-a');
  });

  it('waits while one query still holds the previous target', () => {
    expect(resolveLaboratoryTargetId({ ...settled, labTargetId: 'target-b' })).toBeNull();
  });

  it.each(['pageFetching', 'labFetching'] as const)('waits while %s', key => {
    expect(resolveLaboratoryTargetId({ ...settled, [key]: true })).toBeNull();
  });

  it('waits until the target is known', () => {
    expect(
      resolveLaboratoryTargetId({ ...settled, pageTargetId: null, labTargetId: null }),
    ).toBeNull();
  });
});

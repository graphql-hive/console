// @vitest-environment jsdom
import {
  consumeEnvNotice,
  normalizeTargetEnv,
  prepareSnapshot,
  seedTarget,
} from './laboratory-snapshot';
import { laboratoryStorage } from './laboratory-storage';

const idb = vi.hoisted(() => ({ entries: new Map<string, unknown>(), failWrites: false }));

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (key: string) => idb.entries.get(key),
  set: async (key: string, value: unknown) => {
    if (idb.failWrites) {
      throw new Error('IndexedDB write failed');
    }
    idb.entries.set(key, value);
  },
}));

const SLUG = 'the-guild/api/staging';
const OTHER_SLUG = 'the-guild/api/production';
const history = [{ id: 'h1', operation: { id: 'op1' }, createdAt: '2026-01-01T00:00:00.000Z' }];

function seedGlobalSession() {
  localStorage.setItem('hive:laboratory:env', JSON.stringify({ variables: { token: 'secret' } }));
  localStorage.setItem('hive:laboratory:preflightEnabled', 'true');
  localStorage.setItem('hive:laboratory:operations', JSON.stringify([{ id: 'op1' }]));
  localStorage.setItem('hive:laboratory:tabs', JSON.stringify([{ id: 'op1', type: 'operation' }]));
  localStorage.setItem('hive:laboratory:activeTabId', JSON.stringify('op1'));
  localStorage.setItem(
    'hive:laboratory:settings',
    JSON.stringify({
      fetch: { credentials: 'include' },
      introspection: { method: 'GET', headers: '{"Authorization":"Bearer secret"}' },
    }),
  );
  localStorage.setItem(
    'hive:laboratory:pluginsState',
    JSON.stringify({ targetEnv: { [SLUG]: { region: 'eu' }, [OTHER_SLUG]: { region: 'us' } } }),
  );
  localStorage.setItem('hive:laboratory-tab-value', 'mockApi');
  idb.entries.set('history', history);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
  idb.entries.clear();
  idb.failWrites = false;
  vi.restoreAllMocks();
});

describe('prepareSnapshot', () => {
  it('deletes the env and strips introspection headers', () => {
    seedGlobalSession();

    prepareSnapshot();

    expect(localStorage.getItem('hive:laboratory:env')).toBeNull();
    expect(JSON.parse(localStorage.getItem('hive:laboratory:settings')!)).toEqual({
      fetch: { credentials: 'include' },
      introspection: { method: 'GET', headers: '' },
    });
  });

  it('flags the env notice only when the env had variables', () => {
    localStorage.setItem('hive:laboratory:env', JSON.stringify({ variables: {} }));
    prepareSnapshot();
    expect(consumeEnvNotice()).toBe(false);

    localStorage.setItem('hive:laboratory:env', JSON.stringify({ variables: { token: 'x' } }));
    prepareSnapshot();
    expect(consumeEnvNotice()).toBe(true);
    expect(consumeEnvNotice()).toBe(false);
  });

  it('changes nothing on a second run', () => {
    seedGlobalSession();
    prepareSnapshot();
    const first = { ...localStorage };

    prepareSnapshot();

    expect({ ...localStorage }).toEqual(first);
  });
});

describe('seedTarget', () => {
  it('copies the session but never the env', async () => {
    seedGlobalSession();
    prepareSnapshot();

    expect(await seedTarget('target-a', SLUG)).toBe(true);

    const storage = laboratoryStorage('target-a');
    expect(storage.get('env', null)).toBeNull();
    expect(storage.get('preflightEnabled', null)).toBe(true);
    expect(storage.get('operations', null)).toEqual([{ id: 'op1' }]);
    expect(storage.get('tabs', null)).toEqual([{ id: 'op1', type: 'operation' }]);
    expect(storage.get('activeTabId', null)).toBe('op1');
    expect(storage.get('settings', null)).toEqual({
      fetch: { credentials: 'include' },
      introspection: { method: 'GET', headers: '' },
    });
    expect(storage.get('apiTab', null)).toBe('mockApi');
    expect(idb.entries.get('history:target-a')).toEqual(history);
  });

  it("moves only this target's env-plugin values out of the snapshot", async () => {
    seedGlobalSession();

    await seedTarget('target-a', SLUG);
    await seedTarget('target-b', 'the-guild/other/staging');

    expect(laboratoryStorage('target-a').get('pluginsState', null)).toEqual({
      targetEnv: { [SLUG]: { region: 'eu' } },
    });
    expect(laboratoryStorage('target-b').get('pluginsState', null)).toBeNull();
    expect(JSON.parse(localStorage.getItem('hive:laboratory:pluginsState')!)).toEqual({
      targetEnv: { [OTHER_SLUG]: { region: 'us' } },
    });
  });

  it('seeds every target from the same snapshot', async () => {
    seedGlobalSession();

    await seedTarget('target-a', SLUG);
    await seedTarget('target-b', OTHER_SLUG);

    expect(laboratoryStorage('target-b').get('tabs', null)).toEqual([
      { id: 'op1', type: 'operation' },
    ]);
    expect(idb.entries.get('history:target-b')).toEqual(history);
  });

  it('does not seed a target again after the person cleared it', async () => {
    seedGlobalSession();
    await seedTarget('target-a', SLUG);
    laboratoryStorage('target-a').set('tabs', []);

    await seedTarget('target-a', SLUG);

    expect(laboratoryStorage('target-a').get('tabs', null)).toEqual([]);
  });

  it('retries after a failed history write without overwriting newer work', async () => {
    seedGlobalSession();
    idb.failWrites = true;

    expect(await seedTarget('target-a', SLUG)).toBe(false);
    expect(laboratoryStorage('target-a').has('seeded')).toBe(false);

    laboratoryStorage('target-a').set('tabs', [{ id: 'new', type: 'operation' }]);
    idb.failWrites = false;

    expect(await seedTarget('target-a', SLUG)).toBe(true);
    expect(laboratoryStorage('target-a').get('tabs', null)).toEqual([
      { id: 'new', type: 'operation' },
    ]);
    expect(laboratoryStorage('target-a').get('operations', null)).toEqual([{ id: 'op1' }]);
    expect(idb.entries.get('history:target-a')).toEqual(history);
  });

  it('falls back to the history kept in localStorage before IndexedDB', async () => {
    localStorage.setItem('hive:laboratory:history', JSON.stringify(history));

    await seedTarget('target-a', SLUG);

    expect(idb.entries.get('history:target-a')).toEqual(history);
  });

  it('marks a target seeded with defaults when there is no old session', async () => {
    expect(await seedTarget('target-a', SLUG)).toBe(true);

    expect(laboratoryStorage('target-a').get('seeded', false)).toBe(true);
    expect(laboratoryStorage('target-a').has('tabs')).toBe(false);
    expect(idb.entries.get('history:target-a')).toEqual([]);
  });
});

describe('normalizeTargetEnv', () => {
  it('folds values filed under an old slug into the current one', () => {
    laboratoryStorage('target-a').set('pluginsState', {
      other: { kept: true },
      targetEnv: { 'the-guild/api/old-name': { region: 'eu', tier: 'a' }, [SLUG]: { tier: 'b' } },
    });

    normalizeTargetEnv('target-a', SLUG);

    expect(laboratoryStorage('target-a').get('pluginsState', null)).toEqual({
      other: { kept: true },
      targetEnv: { [SLUG]: { region: 'eu', tier: 'b' } },
    });
  });

  it('leaves state alone when everything is under the current slug', () => {
    laboratoryStorage('target-a').set('pluginsState', { targetEnv: { [SLUG]: { region: 'eu' } } });
    const before = localStorage.getItem('hive:laboratory:target:target-a:pluginsState');

    normalizeTargetEnv('target-a', SLUG);

    expect(localStorage.getItem('hive:laboratory:target:target-a:pluginsState')).toBe(before);
  });
});

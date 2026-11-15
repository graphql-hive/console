import {
  hasTargetHistory,
  loadSnapshotHistory,
  saveTargetHistory,
} from '@/lib/laboratory-history-storage';
import { laboratoryStorage, type LaboratoryStorageKey } from '@/lib/laboratory-storage';

/**
 * Before labs were per target, every target read and wrote these global keys. They are now a
 * read-only snapshot that seeds each target the first time it is opened, minus credentials:
 * env vars are deleted and introspection headers stripped before anything copies them.
 */
const GLOBAL_PREFIX = 'hive:laboratory:';
const GLOBAL_ENV = `${GLOBAL_PREFIX}env`;
const GLOBAL_SETTINGS = `${GLOBAL_PREFIX}settings`;
const GLOBAL_PLUGINS_STATE = `${GLOBAL_PREFIX}pluginsState`;
const GLOBAL_API_TAB = 'hive:laboratory-tab-value';
const ENV_NOTICE_PENDING = `${GLOBAL_PREFIX}envNoticePending`;

// Copied as stored. pluginsState and the API tab need their own handling below.
const COPIED_KEYS = [
  'preflightEnabled',
  'operations',
  'tabs',
  'activeTabId',
  'settings',
] as const satisfies readonly LaboratoryStorageKey[];

const TARGET_ENV_PLUGIN_ID = 'targetEnv';

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Queues the one-time notice that env vars were not carried into per-target labs. */
export function markEnvNoticePending() {
  localStorage.setItem(ENV_NOTICE_PENDING, 'true');
}

/** Removes credentials from the snapshot. Idempotent, safe to run on every page load. */
export function prepareSnapshot() {
  if (localStorage.getItem(GLOBAL_ENV) !== null) {
    const env = readJson(GLOBAL_ENV);

    if (isRecord(env) && isRecord(env.variables) && Object.keys(env.variables).length > 0) {
      markEnvNoticePending();
    }

    localStorage.removeItem(GLOBAL_ENV);
  }

  const settings = readJson(GLOBAL_SETTINGS);

  if (isRecord(settings) && isRecord(settings.introspection) && settings.introspection.headers) {
    localStorage.setItem(
      GLOBAL_SETTINGS,
      JSON.stringify({ ...settings, introspection: { ...settings.introspection, headers: '' } }),
    );
  }
}

/**
 * Fills the keys this target does not have yet from the snapshot, then marks it seeded. Filling
 * only missing keys makes a retry after a failure safe even if the person already started working.
 * `targetSlug` is `org/project/target`, the key TargetEnvPlugin files its values under.
 * Resolves `false` when seeding has to be retried on the next visit.
 */
export async function seedTarget(targetId: string, targetSlug: string): Promise<boolean> {
  const storage = laboratoryStorage(targetId);

  if (storage.get('seeded', false)) {
    return true;
  }

  try {
    const targetHasHistory = await hasTargetHistory(targetId);

    if (targetHasHistory === null) {
      return false;
    }

    if (!targetHasHistory) {
      const history = await loadSnapshotHistory();

      if (history === null || !(await saveTargetHistory(targetId, history))) {
        return false;
      }
    }

    for (const key of COPIED_KEYS) {
      const raw = localStorage.getItem(`${GLOBAL_PREFIX}${key}`);

      if (raw !== null && !storage.has(key)) {
        localStorage.setItem(storage.key(key), raw);
      }
    }

    const apiTab = localStorage.getItem(GLOBAL_API_TAB);

    if ((apiTab === 'mockApi' || apiTab === 'linkedApi') && !storage.has('apiTab')) {
      storage.set('apiTab', apiTab);
    }

    moveTargetEnvSlice(targetId, targetSlug);

    localStorage.setItem(storage.key('seeded'), 'true');
    return true;
  } catch (error) {
    console.error('[Laboratory] Failed to seed target state:', error);
    return false;
  }
}

// Each slice already names its target, so it moves to that target only and leaves the snapshot.
function moveTargetEnvSlice(targetId: string, targetSlug: string) {
  const global = readJson(GLOBAL_PLUGINS_STATE);
  const slices = isRecord(global) ? global[TARGET_ENV_PLUGIN_ID] : null;
  const slice = isRecord(slices) ? slices[targetSlug] : null;

  if (!isRecord(global) || !isRecord(slices) || !isRecord(slice)) {
    return;
  }

  const storage = laboratoryStorage(targetId);
  const state = storage.get<Record<string, unknown>>('pluginsState', {});
  const ownState = state[TARGET_ENV_PLUGIN_ID];
  const own = isRecord(ownState) ? ownState : {};
  const ownSlice = isRecord(own[targetSlug]) ? (own[targetSlug] as Record<string, unknown>) : {};

  // The target's own values win over the snapshot's.
  storage.set('pluginsState', {
    ...state,
    [TARGET_ENV_PLUGIN_ID]: { ...own, [targetSlug]: { ...slice, ...ownSlice } },
  });

  const { [targetSlug]: _moved, ...rest } = slices;
  localStorage.setItem(
    GLOBAL_PLUGINS_STATE,
    JSON.stringify({ ...global, [TARGET_ENV_PLUGIN_ID]: rest }),
  );
}

/**
 * TargetEnvPlugin files values under the target's slugs, so a rename would hide them. Storage is
 * already per target, so every slice it holds is this target's: fold them under the current slugs.
 */
export function normalizeTargetEnv(targetId: string, targetSlug: string) {
  const storage = laboratoryStorage(targetId);
  const state = storage.get<Record<string, unknown>>('pluginsState', {});
  const slices = state[TARGET_ENV_PLUGIN_ID];

  if (!isRecord(slices)) {
    return;
  }

  const stale = Object.keys(slices).filter(slug => slug !== targetSlug);

  if (stale.length === 0) {
    return;
  }

  const current = slices[targetSlug];
  const merged = Object.assign(
    {},
    ...stale.map(slug => slices[slug]).filter(isRecord),
    isRecord(current) ? current : {},
  );

  storage.set('pluginsState', { ...state, [TARGET_ENV_PLUGIN_ID]: { [targetSlug]: merged } });
}

/** True once per browser, when the old session had env vars that were not carried over. */
export function consumeEnvNotice(): boolean {
  if (localStorage.getItem(ENV_NOTICE_PENDING) === null) {
    return false;
  }

  localStorage.removeItem(ENV_NOTICE_PENDING);
  return true;
}

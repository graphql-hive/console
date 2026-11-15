import { markEnvNoticePending } from '@/lib/laboratory-snapshot';

const OLD_ENV_KEY = 'hive:laboratory:environment';
const OLD_ENABLED_KEY = 'hive:laboratory:isPreflightScriptEnabled';
const ENABLED_KEY = 'hive:laboratory:preflightEnabled';
// Everything else the GraphiQL tab left behind: its page switch, its welcome dialog, its env
// (credentials are not carried into per-target labs), its drafts and GraphiQL's own store.
const LEGACY_KEYS = [
  'hive:laboratory:type',
  'hive:laboratory:welcome-dialog-shown',
  OLD_ENV_KEY,
  OLD_ENABLED_KEY,
];
const LEGACY_PREFIXES = ['hive:operation-', 'graphiql:'];

// The GraphiQL tab kept the toggle as a JSON boolean. Copies it only when the lab key is missing,
// then clears what the removed tab left behind.
export function migrateLegacyLaboratoryStorage() {
  if (hasLegacyEnvVariables(localStorage.getItem(OLD_ENV_KEY))) {
    markEnvNoticePending();
  }

  if (!localStorage.getItem(ENABLED_KEY)) {
    const enabled = localStorage.getItem(OLD_ENABLED_KEY);

    if (enabled === 'true' || enabled === 'false') {
      localStorage.setItem(ENABLED_KEY, enabled);
    }
  }

  for (const key of legacyKeys()) {
    localStorage.removeItem(key);
  }
}

function legacyKeys() {
  const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');

  return keys.filter(
    key => LEGACY_KEYS.includes(key) || LEGACY_PREFIXES.some(prefix => key.startsWith(prefix)),
  );
}

// The GraphiQL tab kept env as a JSON object of variables.
function hasLegacyEnvVariables(raw: string | null) {
  if (!raw) {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return (
      !!parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length > 0
    );
  } catch {
    return false;
  }
}

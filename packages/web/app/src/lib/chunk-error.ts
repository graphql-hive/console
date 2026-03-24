const CHUNK_RELOAD_KEY = 'chunk-reload';

/** Check if an error is a chunk/module load failure from a stale deployment. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    // Chrome/Edge: failed dynamic import()
    error.message.includes('Failed to fetch dynamically imported module') ||
    // Safari/Firefox: failed dynamic import()
    error.message.includes('Importing a module script failed') ||
    // Webpack-style chunk errors (unlikely with Vite, but defensive)
    error.name === 'ChunkLoadError'
  );
}

// Reload the page once to recover from a stale chunk error. Uses sessionStorage
// to prevent infinite loops — if we've already reloaded once this session (flag
// not yet cleared by a successful boot), we let the error propagate instead.
export function reloadOnChunkError() {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
}

// Clear the chunk-reload flag on successful app load. This ensures the
// auto-reload mechanism works again after a subsequent deployment. Without
// this, the flag from a previous reload would persist in sessionStorage
// and block future auto-reloads.
export function clearChunkReloadFlag() {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

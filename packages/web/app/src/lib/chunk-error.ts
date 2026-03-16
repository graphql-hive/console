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

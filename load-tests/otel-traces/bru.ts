// Polyfill for Node.js globals that libraries expect
// This must be imported FIRST before any other imports

// @ts-ignore - k6 doesn't have process
globalThis.process = globalThis.process || { env: {} };

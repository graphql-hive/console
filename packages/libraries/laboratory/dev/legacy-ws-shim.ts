/**
 * Dev harness only, never shipped.
 *
 * @graphql-tools/executor-legacy-ws tears a connection down with `terminate()`, an API
 * that exists on node's `ws` sockets but not on the browser WebSocket, so LEGACY_WS
 * runs end with an uncaught TypeError after the stream has already completed. Aliasing
 * it to close() keeps the console readable while testing the transport locally; what
 * an embedder sees is unchanged.
 */
if (typeof WebSocket !== 'undefined' && !('terminate' in WebSocket.prototype)) {
  (WebSocket.prototype as WebSocket & { terminate: () => void }).terminate =
    WebSocket.prototype.close;
}

export {};

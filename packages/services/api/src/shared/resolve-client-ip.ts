import type { FastifyRequest } from '@hive/service-common';

/**
 * Resolve the IP address of the client that sent the request.
 *
 * If `ipHeaderName` is provided (e.g. `cf-connecting-ip`), the value of that header is preferred,
 * as it is set by the CDN/proxy in front of the server. Only configure a header that the proxy
 * always overwrites, as clients can send arbitrary headers.
 * Falls back to the request IP address determined by fastify.
 */
export function resolveClientIP(req: FastifyRequest, ipHeaderName: string | null): string {
  if (ipHeaderName) {
    // Node.js lower-cases all incoming header names.
    const headerValue = req.headers[ipHeaderName.toLowerCase()];
    const ip = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (ip) {
      return ip;
    }
  }

  return req.ip;
}

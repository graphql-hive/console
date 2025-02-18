import type { FastifyRequest } from 'fastify';

export type Prettify<T> = {
  [K in keyof T]: T[K];
};

export function getRelativeUrl(req: FastifyRequest, path: string) {
  console.log('path', path);
  console.log('req.url', `${req.protocol}://${req.hostname}${req.url}`);
  const result = new URL(path, `${req.protocol}://${req.hostname}${req.url}`);
  result.host = pickFirst(req.headers['x-forwarded-host']) || result.host;
  result.protocol = pickFirst(req.headers['x-forwarded-proto']) || result.protocol;
  result.port = pickFirst(req.headers['x-forwarded-port']) || result.port;
  return result.toString();
}

function pickFirst<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

const twoPartTlds = [
  'co.uk',
  'co.jp',
  'co.kr',
  'co.nz',
  'co.za',
  'co.in',
  'com.au',
  'com.br',
  'com.cn',
  'com.mx',
  'com.tw',
  'net.au',
  'org.uk',
  'ne.jp',
  'ac.uk',
  'gov.uk',
  'edu.au',
  'gov.au',
];

export function isDomainMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const partsA = a.split('.');
  const partsB = b.split('.');
  const hasTwoPartTld = twoPartTlds.some(tld => a.endsWith('.' + tld) || b.endsWith('.' + tld));
  const numParts = hasTwoPartTld ? -3 : -2;
  const min = Math.min(partsA.length, partsB.length, numParts);
  const tailA = partsA.slice(min).join('.');
  const tailB = partsB.slice(min).join('.');

  return tailA === tailB;
}

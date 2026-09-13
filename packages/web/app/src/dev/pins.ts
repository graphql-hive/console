/**
 * A pin sets one schema field to one value for the whole mock: "Type.field" -> value.
 * It is the `fields` knob scenarios use, without writing a scenario. Shared by the URL
 * parser, the switcher and the server, so it must stay free of node and browser imports.
 */

export type Pins = Record<string, unknown>;

/** Sentinel value: an empty connection or list, whatever the field's type needs. */
export const EMPTY = '@empty';

const PIN_KEY = /^[A-Z][A-Za-z0-9_]*\.[a-z_][A-Za-z0-9_]*$/;

export function isPinKey(key: string): boolean {
  return PIN_KEY.test(key);
}

/**
 * "Organization.plan:ENTERPRISE" -> ["Organization.plan", "ENTERPRISE"]
 * "Target.latestSchemaVersion:null" -> [..., null]
 * "Query.hasCollectedOperations:false" -> [..., false]
 * Values parse as JSON when they can, otherwise stay strings, so enum members need no quotes.
 */
export function parsePinAssignment(input: string): [key: string, value: unknown] | null {
  const separator = input.indexOf(':');
  if (separator === -1) return null;
  const key = input.slice(0, separator).trim();
  const raw = input.slice(separator + 1).trim();
  if (!isPinKey(key) || raw === '') return null;
  return [key, parsePinValue(raw)];
}

export function parsePinValue(raw: string): unknown {
  if (raw === EMPTY) return EMPTY;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function formatPinValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** Round-trips through a cookie: compact, and safe for cookie octets. */
export function encodePins(pins: Pins): string {
  return encodeURIComponent(JSON.stringify(pins));
}

export function decodePins(raw: string | undefined): Pins {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key]) => isPinKey(key)));
  } catch {
    return {};
  }
}

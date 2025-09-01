'use client';

import { useMemo, useState } from 'react';

/**
 * Zero‑Copy JSON: Two Subgraphs → Partial Final (Bytes & References) — Compact (≤620px)
 *
 * Layout (compact):
 *  1) Subgraph A — left: JSON, right: bytes (two tight columns)
 *  2) Subgraph B — same
 *  3) Final — full‑width JSON with ref chips
 *
 * Notes:
 *  - Container max width is 620px.
 *  - Cards, fonts, and paddings reduced.
 *  - JSON panes are clamped in height with internal scroll.
 *  - Byte strip auto‑scales to container width via SVG viewBox (no horizontal scroll).
 *  - Hover cross‑highlight preserved.
 *
 * Includes lightweight runtime tests via console.assert.
 */

// --- Minimal tokenizer utilities (used by tests to validate slices remain correct) ---
function isDigit(ch: string) {
  return ch >= '0' && ch <= '9';
}
function isNumChar(ch: string) {
  return isDigit(ch) || ch === '-' || ch === '+' || ch === '.' || ch === 'e' || ch === 'E';
}
function isWs(ch: string) {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
}
function skipWs(s: string, i: number) {
  while (i < s.length && isWs(s[i])) i++;
  return i;
}
function closingQuote(s: string, i: number) {
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === '"') {
      let bs = 0,
        k = j - 1;
      while (k >= 0 && s[k] === '\\') {
        bs++;
        k--;
      } // count backslashes
      if (bs % 2 === 0) return j; // even # of backslashes → real quote end
    }
    j++;
  }
  return -1;
}
function tokenize(json: string) {
  const t: Array<{ kind: string; start: number; end: number }> = [];
  const s = json;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"') {
      const end = closingQuote(s, i);
      if (end < 0) break;
      const next = skipWs(s, end + 1);
      const isKey = next < s.length && s[next] === ':';
      const start = i + 1,
        stop = end; // exclude quotes
      t.push({ kind: isKey ? 'key' : 'string', start, end: stop });
      i = end + 1;
      continue;
    }
    if (isDigit(ch) || (ch === '-' && isDigit(s[i + 1] || ''))) {
      let j = i;
      while (j < s.length && isNumChar(s[j])) j++;
      t.push({ kind: 'number', start: i, end: j });
      i = j;
      continue;
    }
    if (s.startsWith('true', i)) {
      t.push({ kind: 'bool', start: i, end: i + 4 });
      i += 4;
      continue;
    }
    if (s.startsWith('false', i)) {
      t.push({ kind: 'bool', start: i, end: i + 5 });
      i += 5;
      continue;
    }
    if (s.startsWith('null', i)) {
      t.push({ kind: 'null', start: i, end: i + 4 });
      i += 4;
      continue;
    }
    i++;
  }
  return t;
}
function enc(str: string) {
  return new TextEncoder().encode(str);
}

// --- Colors (tweaked for compact contrast) ---
const COLORS = {
  key: '#8b93ff',
  string: '#34d399',
  number: '#f59e0b',
  bool: '#60a5fa',
  null: '#9ca3af',
} as const;

// --- Build stable IDs for keys & primitive values using JSON Pointer‑like paths ---
function isPrimitive(v: any) {
  return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}
function keyId(path: string, key: string) {
  return `${path}/${key}#key`;
}
function valId(path: string, key: string) {
  return `${path}/${key}#value`;
}
function idxValId(path: string, i: number) {
  return `${path}/${i}#value`;
}

// Collect IDs (no prefix) — used by tests
function collectIds(val: any, path: string, out: string[]) {
  if (Array.isArray(val)) {
    val.forEach((item, idx) => {
      if (isPrimitive(item)) out.push(idxValId(path, idx));
      else collectIds(item, `${path}/${idx}`, out);
    });
    return out;
  }
  if (val && typeof val === 'object') {
    for (const k of Object.keys(val)) {
      out.push(keyId(path, k));
      const v = (val as any)[k];
      if (isPrimitive(v)) out.push(valId(path, k));
      else collectIds(v, `${path}/${k}`, out);
    }
    return out;
  }
  return out;
}

// --- Serialize to MINIFIED JSON while recording byte slices per key/value ---
function escapeJSONString(s: string) {
  // escape backslashes first, then quotes
  return s.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
}
function serializeWithByteMap(val: any) {
  type Entry = { localId: string; start: number; len: number; kind: keyof typeof COLORS };
  const entries: Entry[] = [];
  let out = '';
  let bytePos = 0; // running UTF‑8 length
  const push = (chunk: string) => {
    out += chunk;
    bytePos += enc(chunk).length;
  };

  const walk = (v: any, path: string) => {
    if (Array.isArray(v)) {
      push('[');
      v.forEach((item, idx) => {
        if (isPrimitive(item)) {
          if (typeof item === 'string') {
            push('"');
            const content = escapeJSONString(item);
            const start = bytePos;
            push(content);
            const len = enc(content).length;
            entries.push({ localId: idxValId(path, idx), start, len, kind: 'string' });
            push('"');
          } else if (typeof item === 'number') {
            const text = String(item);
            const start = bytePos;
            push(text);
            const len = enc(text).length;
            entries.push({ localId: idxValId(path, idx), start, len, kind: 'number' });
          } else if (typeof item === 'boolean') {
            const text = item ? 'true' : 'false';
            const start = bytePos;
            push(text);
            const len = enc(text).length;
            entries.push({ localId: idxValId(path, idx), start, len, kind: 'bool' });
          } else if (item === null) {
            const text = 'null';
            const start = bytePos;
            push(text);
            const len = enc(text).length;
            entries.push({ localId: idxValId(path, idx), start, len, kind: 'null' });
          }
        } else {
          walk(item, `${path}/${idx}`);
        }
        if (idx < v.length - 1) push(',');
      });
      push(']');
      return;
    }

    if (v && typeof v === 'object') {
      push('{');
      const keys = Object.keys(v);
      keys.forEach((k, i) => {
        // key
        push('"');
        const kEsc = escapeJSONString(k);
        const kStart = bytePos;
        push(kEsc);
        const kLen = enc(kEsc).length;
        entries.push({ localId: keyId(path, k), start: kStart, len: kLen, kind: 'key' });
        push('"');
        push(':');
        const val = (v as any)[k];
        if (isPrimitive(val)) {
          if (typeof val === 'string') {
            push('"');
            const content = escapeJSONString(val);
            const start = bytePos;
            push(content);
            const len = enc(content).length;
            entries.push({ localId: valId(path, k), start, len, kind: 'string' });
            push('"');
          } else if (typeof val === 'number') {
            const text = String(val);
            const start = bytePos;
            push(text);
            const len = enc(text).length;
            entries.push({ localId: valId(path, k), start, len, kind: 'number' });
          } else if (typeof val === 'boolean') {
            const text = val ? 'true' : 'false';
            const start = bytePos;
            push(text);
            const len = enc(text).length;
            entries.push({ localId: valId(path, k), start, len, kind: 'bool' });
          } else if (val === null) {
            const text = 'null';
            const start = bytePos;
            push(text);
            const len = enc(text).length;
            entries.push({ localId: valId(path, k), start, len, kind: 'null' });
          }
        } else {
          walk(val, `${path}/${k}`);
        }
        if (i < keys.length - 1) push(',');
      });
      push('}');
      return;
    }

    // primitive at root (rare for us but handle anyway)
    if (typeof v === 'string') {
      push('"');
      const content = escapeJSONString(v);
      const start = bytePos;
      push(content);
      const len = enc(content).length;
      entries.push({ localId: `${path}#value`, start, len, kind: 'string' });
      push('"');
    } else if (typeof v === 'number') {
      const text = String(v);
      const start = bytePos;
      push(text);
      const len = enc(text).length;
      entries.push({ localId: `${path}#value`, start, len, kind: 'number' });
    } else if (typeof v === 'boolean') {
      const text = v ? 'true' : 'false';
      const start = bytePos;
      push(text);
      const len = enc(text).length;
      entries.push({ localId: `${path}#value`, start, len, kind: 'bool' });
    } else if (v === null) {
      const text = 'null';
      const start = bytePos;
      push(text);
      const len = enc(text).length;
      entries.push({ localId: `${path}#value`, start, len, kind: 'null' });
    }
  };

  walk(val, '');
  return { json: out, entries };
}

// --- Pretty JSON renderer with colored spans and cross‑highlight ---
// idMapper: optional function that returns the GLOBAL ID to use for a given token in this view
// If missing, we default to idPrefix + localId
function JsonBlock({
  value,
  hoverId,
  setHoverId,
  title,
  pretty,
  idPrefix = '',
  idMapper,
  sliceLookup,
}: {
  value: any;
  hoverId: string | null;
  pretty: boolean;
  setHoverId: (id: string | null) => void;
  title?: string;
  idPrefix?: string;
  idMapper?: (info: {
    kind: 'key' | 'value' | 'index';
    path: string;
    key?: string;
    index?: number;
  }) => string | null | undefined;
  sliceLookup?: (globalId: string) => { src: 'A' | 'B'; start: number; len: number } | null;
}) {
  let keySeq = 0;
  const K = () => keySeq++;

  const RefChip = ({ gid }: { gid: string }) => {
    if (!sliceLookup) return null;
    const info = sliceLookup(gid);
    if (!info) return null;
    const onEnter = () => setHoverId(gid);
    const onLeave = () => setHoverId(null);
    return (
      <span
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="ml-1 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 align-middle text-[10px]"
        title={`References ${info.src} slice(${info.start}, ${info.len})`}
      >
        {info.src}: {info.start}…{info.start + info.len - 1}
      </span>
    );
  };

  const coloredSpan = (text: string, kind: keyof typeof COLORS, id: string) => {
    const color = COLORS[kind];
    const active = hoverId === id;
    return (
      <span
        key={K()}
        onMouseEnter={() => setHoverId(id)}
        onMouseLeave={() => setHoverId(null)}
        style={{
          background: color + (active ? '55' : '22'),
          border: `1px solid ${color}`,
          borderColor: color + (active ? '' : '66'),
          borderRadius: 5,
          padding: '0 3px',
        }}
      >
        {text}
      </span>
    );
  };

  const renderVal = (v: any, path: string, indent: number) => {
    const pad = '  '.repeat(indent);
    const parts: any[] = [];
    if (Array.isArray(v)) {
      parts.push(<span key={K()}>[</span>);
      if (pretty) {
        parts.push(<span key={K()}>{'\n'}</span>);
      }
      v.forEach((item, idx) => {
        if (pretty) {
          parts.push(<span key={K()}>{pad + '  '}</span>);
        }
        if (isPrimitive(item)) {
          const localId = idxValId(path, idx);
          const globalId = idMapper
            ? idMapper({ kind: 'index', path, index: idx }) || `${idPrefix}${localId}`
            : `${idPrefix}${localId}`;
          const kind: keyof typeof COLORS =
            typeof item === 'string'
              ? 'string'
              : typeof item === 'number'
                ? 'number'
                : typeof item === 'boolean'
                  ? 'bool'
                  : 'null';
          if (typeof item === 'string') parts.push(<span key={K()}>"</span>);
          parts.push(coloredSpan(String(item), kind, globalId));
          if (typeof item === 'string') parts.push(<span key={K()}>"</span>);
          if (sliceLookup) parts.push(<RefChip key={K()} gid={globalId} />);
        } else {
          parts.push(...renderVal(item, `${path}/${idx}`, indent + 1));
        }
        parts.push(<span key={K()}>{idx < v.length - 1 ? ',' : ''}</span>);
        if (pretty) {
          parts.push(<span key={K()}>{'\n'}</span>);
        }
      });
      if (pretty) {
        parts.push(<span key={K()}>{pad}</span>);
      }
      parts.push(<span key={K()}>{']'}</span>);
      return parts;
    }
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      parts.push(<span key={K()}>{'{'}</span>);
      if (pretty) {
        parts.push(<span key={K()}>{'\n'}</span>);
      }
      keys.forEach((k, idx) => {
        const localKeyId = keyId(path, k);
        const keyGlobalId = idMapper
          ? idMapper({ kind: 'key', path, key: k }) || `${idPrefix}${localKeyId}`
          : `${idPrefix}${localKeyId}`;
        if (pretty) {
          parts.push(<span key={K()}>{pad + '  '}</span>);
        }
        parts.push(<span key={K()}>"</span>);
        parts.push(coloredSpan(k, 'key', keyGlobalId));
        parts.push(<span key={K()}>"</span>);
        parts.push(<span key={K()}>:</span>);
        const v2 = (v as any)[k];
        if (isPrimitive(v2)) {
          const localValId = valId(path, k);
          const valGlobalId = idMapper
            ? idMapper({ kind: 'value', path, key: k }) || `${idPrefix}${localValId}`
            : `${idPrefix}${localValId}`;
          const kind: keyof typeof COLORS =
            typeof v2 === 'string'
              ? 'string'
              : typeof v2 === 'number'
                ? 'number'
                : typeof v2 === 'boolean'
                  ? 'bool'
                  : 'null';
          if (typeof v2 === 'string') parts.push(<span key={K()}>"</span>);
          parts.push(coloredSpan(String(v2), kind, valGlobalId));
          if (typeof v2 === 'string') parts.push(<span key={K()}>"</span>);
          if (sliceLookup) parts.push(<RefChip key={K()} gid={valGlobalId} />);
        } else {
          parts.push(...renderVal(v2, `${path}/${k}`, indent + 1));
        }
        parts.push(<span key={K()}>{idx < keys.length - 1 ? ',' : ''}</span>);
        if (pretty) {
          parts.push(<span key={K()}>{'\n'}</span>);
        }
      });
      if (pretty) {
        parts.push(<span key={K()}>{pad}</span>);
      }
      parts.push(<span key={K()}>{'}'}</span>);
      return parts;
    }
    // primitive at root
    const localId = `${path}#value`;
    const globalId = idMapper
      ? idMapper({ kind: 'value', path }) || `${idPrefix}${localId}`
      : `${idPrefix}${localId}`;
    const kind: keyof typeof COLORS =
      typeof v === 'string'
        ? 'string'
        : typeof v === 'number'
          ? 'number'
          : typeof v === 'boolean'
            ? 'bool'
            : 'null';
    if (typeof v === 'string') parts.push(<span key={K()}>"</span>);
    parts.push(coloredSpan(String(v), kind, globalId));
    if (typeof v === 'string') parts.push(<span key={K()}>"</span>);
    if (sliceLookup) parts.push(<RefChip key={K()} gid={globalId} />);
    return parts;
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-slate-100 shadow-sm">
      {title && <h3 className="mb-1 text-sm font-medium tracking-wide text-slate-200">{title}</h3>}
      <pre className="max-h-40 overflow-auto rounded-lg border border-neutral-800 bg-[#111111] p-2 font-mono text-[12px] leading-5 text-neutral-200">
        {renderVal(value, '', 0)}
      </pre>
    </div>
  );
}

// --- Byte buffer renderer for a subgraph (auto‑scales to card width) ---
function ByteBuffer({
  title,
  json,
  entries,
  idPrefix,
  hoverId,
  setHoverId,
}: {
  title: string;
  json: string;
  entries: Array<{ localId: string; start: number; len: number; kind: keyof typeof COLORS }>;
  idPrefix: 'A:' | 'B:';
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
}) {
  const bytes = useMemo(() => enc(json), [json]);
  const PX = 6;
  const H = 12;
  const viewW = Math.max(bytes.length * PX, 1);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-neutral-100">
      <div className="flex items-baseline justify-between">
        <h3 className="mb-1 text-sm font-medium tracking-wide text-slate-200">{title}</h3>
      </div>
      <div className="mt-2 border border-neutral-800 bg-[#111111]">
        <svg
          width="100%"
          height={H + 8}
          viewBox={`0 0 ${viewW} ${H + 8}`}
          preserveAspectRatio="none"
          className="block"
        >
          <rect x={0} y={0} width={viewW} height={H + 8} fill="#111111" />
          {bytes.map(
            (_, i) =>
              (<rect key={i} x={i * PX} y={4} width={PX - 1} height={H} fill="#111111" />) as any,
          )}
          {entries.map((e, i) => {
            const x = e.start * PX;
            const w = Math.max(2, e.len * PX);
            const gid = `${idPrefix}${e.localId}`;
            const active = hoverId === gid;
            return (
              <rect
                key={i}
                x={x}
                y={4}
                width={w}
                height={H}
                fill={COLORS[e.kind] + (active ? '66' : '33')}
                stroke={COLORS[e.kind]}
                strokeWidth={active ? 2 : 1}
                onMouseEnter={() => setHoverId(gid)}
                onMouseLeave={() => setHoverId(null)}
              />
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Colored bars are <strong>byte slices</strong>. Final response references these offsets; no
        copies.
      </p>
    </div>
  );
}

export function ZeroCopyBlocks() {
  // Subgraph A & B
  const subgraphA = {
    user: { id: 1, name: 'Ada', email: 'ada@lab' },
    active: true,
  };

  // Final uses only parts of A & B (no email, plan, org, note)
  const finalJson = {
    user: { id: 1, name: 'Ada' },
    active: true,
  };

  // Build an ID mapper for the FINAL view that points back to source tokens (A: or B:)
  const finalMap = new Map<string, string>([
    ['/user#key', 'A:/user#key'],
    ['/user/id#key', 'A:/user/id#key'],
    ['/user/id#value', 'A:/user/id#value'],
    ['/user/name#key', 'A:/user/name#key'],
    ['/user/name#value', 'A:/user/name#value'],
    ['/user/tags#key', 'B:/user/tags#key'],
    ['/user/tags/0#value', 'B:/user/tags/0#value'],
    ['/user/tags/1#value', 'B:/user/tags/1#value'],
    ['/active#key', 'A:/active#key'],
    ['/active#value', 'A:/active#value'],
    ['/price#key', 'B:/price#key'],
    ['/price#value', 'B:/price#value'],
  ]);
  const idMapperFinal = (info: {
    kind: 'key' | 'value' | 'index';
    path: string;
    key?: string;
    index?: number;
  }) => {
    if (info.kind === 'key' && info.key) return finalMap.get(`${info.path}/${info.key}#key`);
    if (info.kind === 'value' && info.key) return finalMap.get(`${info.path}/${info.key}#value`);
    if (info.kind === 'index' && typeof info.index === 'number')
      return finalMap.get(`${info.path}/${info.index}#value`);
    return undefined;
  };

  // Compute byte buffers + maps for A and B (minified JSON)
  const Adata = useMemo(() => serializeWithByteMap(subgraphA), []);
  const mapA = useMemo(() => {
    const m = new Map<string, { start: number; len: number; kind: keyof typeof COLORS }>();
    Adata.entries.forEach(e => m.set(e.localId, { start: e.start, len: e.len, kind: e.kind }));
    return m;
  }, [Adata]);

  const [hoverId, setHoverId] = useState<string | null>(null);

  // Lookup slices for Final's global IDs
  const sliceLookup = (gid: string) => {
    if (gid.startsWith('A:')) {
      const local = gid.slice(2);
      const e = mapA.get(local);
      if (!e) return null;
      return { src: 'A' as const, start: e.start, len: e.len };
    }
    return null;
  };

  return (
    <div className="w-full p-4 text-neutral-100">
      <div className="space-y-4">
        {/* Row 1: Subgraph A */}
        <section>
          <div className="space-y-2">
            <JsonBlock
              title="Subgraph response as JSON"
              value={subgraphA}
              hoverId={hoverId}
              setHoverId={setHoverId}
              idPrefix="A:"
              pretty={false}
            />
            <ByteBuffer
              title="Subgraph response is stored as bytes"
              json={Adata.json}
              entries={Adata.entries}
              idPrefix="A:"
              hoverId={hoverId}
              setHoverId={setHoverId}
            />
          </div>
        </section>

        {/* Row 3: Final full‑width */}
        <section>
          <div>
            <JsonBlock
              title="Final Response (reuses the bytes from subgraph response)"
              value={finalJson}
              hoverId={hoverId}
              setHoverId={setHoverId}
              idMapper={idMapperFinal}
              sliceLookup={sliceLookup}
              pretty={true}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

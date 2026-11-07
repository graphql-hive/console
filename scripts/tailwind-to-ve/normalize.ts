/**
 * Second pass over the generated stylesheets: from "declarations as Tailwind compiled them" to
 * the shape a person would write.
 *
 *   pnpm tsx scripts/tailwind-to-ve/normalize.ts --scope components/ui [--dry] [--verbose]
 *
 * In every `.css.ts` under the scope, each `{ '@layer': { [layer]: {...} } }` block (in `style`,
 * `recipe`, `globalStyle`, wherever it sits) is rewritten as `layered.<layer>({...})` with:
 *
 * - typed tokens instead of raw variables: `vars.color.fg.muted` for `var(--color-fg-muted)`,
 *   `space(4)` for `calc(var(--spacing) * 4)`, `palette.neutral[4]` for `var(--neutral-4)`;
 * - Tailwind's `--tw-*` bookkeeping resolved away: `line-height: var(--tw-leading, X)` becomes
 *   `X`, `border-style: var(--tw-border-style)` becomes `solid`, a `box-shadow` or `translate`
 *   assembled from `--tw-*` parts becomes the assembled value, and
 *   `calc(X * var(--tw-space-y-reverse))` becomes `0`. Each variable is resolved from the same
 *   rule, then its enclosing rules, then the value Tailwind registered with `@property`.
 *
 * Then, for a `style()` export whose body is exactly a shared primitive (`src/styles/shared.css.ts`),
 * or the union of two or three of them, the export goes and its call sites use the primitive(s).
 * The primitives sit in the `components` layer, so that swap is only made where the cascade
 * cannot tell the difference: the style is used on plain JSX elements (not components), and no
 * other style in the same `cn(...)` touches the same properties. Anything else stays local.
 *
 * Names of the styles that stay local are untouched; renaming them is the hand pass that follows.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { convert, quote, type StyleTree } from './convert.ts';
import { compileTokens } from './tailwind.ts';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const verbose = args.includes('--verbose');
const scopes = args.flatMap((a, i) => (a === '--scope' && args[i + 1] ? [args[i + 1]] : []));
const repoRoot = path.resolve(import.meta.dirname, '../..');
const appDir = path.join(repoRoot, 'packages/web/app');
const srcDir = path.join(appDir, 'src');
const warnings: string[] = [];
const warn = (message: string) => warnings.push(message);

// Primitives ------------------------------------------------------------------------------------

/** Shared primitive → the Tailwind classes it is the exact equivalent of. */
const PRIMITIVES: Array<[expr: string, classes: string]> = [
  ...['2xs', 'xs', 'control', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'].map(
    (size): [string, string] => [
      /^\d/.test(size) ? `shared.text['${size}']` : `shared.text.${size}`,
      `text-${size}`,
    ],
  ),
  ['shared.weight.normal', 'font-normal'],
  ['shared.weight.medium', 'font-medium'],
  ['shared.weight.semibold', 'font-semibold'],
  ['shared.weight.bold', 'font-bold'],
  ['shared.fg.strong', 'text-fg'],
  ['shared.fg.default', 'text-fg-default'],
  ['shared.fg.secondary', 'text-fg-secondary'],
  ['shared.fg.muted', 'text-fg-muted'],
  ['shared.fg.subtle', 'text-fg-subtle'],
  ['shared.fg.inverse', 'text-fg-inverse'],
  ['shared.fg.accent', 'text-accent'],
  ['shared.fg.success', 'text-success'],
  ['shared.fg.successText', 'text-success-text'],
  ['shared.fg.info', 'text-info'],
  ['shared.fg.warning', 'text-warning'],
  ['shared.fg.critical', 'text-critical'],
  ['shared.fg.criticalText', 'text-critical-text'],
  ['shared.mono', 'font-mono'],
  ['shared.tabularNums', 'tabular-nums'],
  ['shared.textCenter', 'text-center'],
  ['shared.truncate', 'truncate'],
  ['shared.nowrap', 'whitespace-nowrap'],
  ['shared.breakAll', 'break-all'],
  ['shared.lineThrough', 'line-through'],
  ['shared.srOnly', 'sr-only'],
  ['shared.icon.xs', 'size-3'],
  ['shared.icon.sm', 'size-3.5'],
  ['shared.icon.md', 'size-4'],
  ['shared.icon.lg', 'size-5'],
  ['shared.icon.xl', 'size-6'],
  ['shared.row.base', 'flex items-center'],
  ['shared.row.gap1', 'flex items-center gap-1'],
  ['shared.row.gap1_5', 'flex items-center gap-1.5'],
  ['shared.row.gap2', 'flex items-center gap-2'],
  ['shared.row.gap3', 'flex items-center gap-3'],
  ['shared.row.gap4', 'flex items-center gap-4'],
  ['shared.row.between', 'flex items-center justify-between'],
  ['shared.row.wrap2', 'flex flex-wrap items-center gap-2'],
  ['shared.inlineRow.base', 'inline-flex items-center'],
  ['shared.inlineRow.gap1', 'inline-flex items-center gap-1'],
  ['shared.inlineRow.gap1_5', 'inline-flex items-center gap-1.5'],
  ['shared.inlineRow.gap2', 'inline-flex items-center gap-2'],
  ['shared.stack.base', 'flex flex-col'],
  ['shared.stack.gap1', 'flex flex-col gap-1'],
  ['shared.stack.gap2', 'flex flex-col gap-2'],
  ['shared.stack.gap3', 'flex flex-col gap-3'],
  ['shared.stack.gap4', 'flex flex-col gap-4'],
  ['shared.stack.gap6', 'flex flex-col gap-6'],
  ['shared.stack.gap8', 'flex flex-col gap-8'],
  ['shared.flex', 'flex'],
  ['shared.inlineFlex', 'inline-flex'],
  ['shared.grow', 'grow'],
  ['shared.fill', 'flex-1'],
  ['shared.shrinkable', 'min-w-0'],
  ['shared.fillShrinkable', 'min-w-0 flex-1'],
  ['shared.noShrink', 'shrink-0'],
  ['shared.fullWidth', 'w-full'],
  ['shared.relative', 'relative'],
  ['shared.hidden', 'hidden'],
  ['shared.contents', 'contents'],
];

// Style trees -----------------------------------------------------------------------------------

type Decls = Map<string, string>;
const newTree = (): StyleTree => ({ decls: new Map(), queries: new Map(), selectors: new Map() });

const isFlat = (tree: StyleTree) => tree.queries.size === 0 && tree.selectors.size === 0;
const isEmptyTree = (tree: StyleTree) => tree.decls.size === 0 && isFlat(tree);
const keyOf = (decls: Decls) => [...decls].map(([p, v]) => `${p}:${v}`).join(';');

/** Every property name the tree sets, at any depth. */
function allProps(tree: StyleTree, out = new Set<string>()): Set<string> {
  for (const p of tree.decls.keys()) out.add(p);
  for (const sub of tree.selectors.values()) allProps(sub, out);
  for (const { tree: sub } of tree.queries.values()) allProps(sub, out);
  return out;
}

// Tailwind bookkeeping ------------------------------------------------------------------------

/** What Tailwind registered with `@property` as each variable's initial value. */
const INITIAL: Record<string, string> = {
  '--tw-translate-x': '0',
  '--tw-translate-y': '0',
  '--tw-translate-z': '0',
  '--tw-scale-x': '1',
  '--tw-scale-y': '1',
  '--tw-scale-z': '1',
  '--tw-space-y-reverse': '0',
  '--tw-space-x-reverse': '0',
  '--tw-divide-y-reverse': '0',
  '--tw-border-style': 'solid',
  '--tw-outline-style': 'solid',
  '--tw-shadow': '0 0 #0000',
  '--tw-inset-shadow': '0 0 #0000',
  '--tw-ring-shadow': '0 0 #0000',
  '--tw-inset-ring-shadow': '0 0 #0000',
  '--tw-ring-offset-shadow': '0 0 #0000',
  // The app's global.css.ts set these two on every element, over Tailwind's own 0px and #fff.
  '--tw-ring-offset-width': '1px',
  '--tw-ring-offset-color': 'var(--color-accent-line)',
  '--tw-shadow-alpha': '100%',
  '--tw-inset-shadow-alpha': '100%',
  '--tw-drop-shadow-alpha': '100%',
  '--tw-content': '""',
};

/** Index of the `)` that closes the `(` at or after `from`. */
function closingParen(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return i;
  }
  return text.length;
}

/** Replaces each `var(--tw-…)` (with any fallback) using `resolve(name, fallback)`. */
function replaceTwVars(
  value: string,
  resolve: (name: string, fallback: string | null) => string,
): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(--tw-', i);
    if (at === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, at);
    const end = closingParen(value, at);
    const inner = value.slice(at + 4, end);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
    out += resolve(name, fallback);
    i = end + 1;
  }
  return out;
}

/** Looks a bookkeeping variable up in the rule, then its enclosing rules, then Tailwind's default. */
function lookup(name: string, chain: Decls[]): string | undefined {
  for (let i = chain.length - 1; i >= 0; i--) {
    const v = chain[i].get(name);
    if (v !== undefined) return v.replace(/ !important$/, '');
  }
  return INITIAL[name];
}

function resolveValue(value: string, chain: Decls[], depth = 0): string {
  if (!value.includes('var(--tw-') || depth > 8) return value;
  const resolved = replaceTwVars(value, (name, fallback) => {
    const found = lookup(name, chain);
    if (found !== undefined) return found;
    if (fallback !== null) return fallback;
    warn(`unresolved ${name}`);
    return `var(${name})`;
  });
  return resolveValue(resolved, chain, depth + 1);
}

/** A shadow layer with every length zero draws nothing, whatever its colour. */
const ZERO_SHADOW = /^(inset\s+)?(-?0(px)?\s+){1,3}-?0(px)?(\s+\S+)?$/;

/** Splits on top-level commas. */
function splitList(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map(p => p.trim()).filter(Boolean);
}

/** Cleans a resolved value: whitespace, redundant colour mixing, empty shadow layers, calc(). */
function tidy(prop: string, value: string): string {
  const important = / !important$/.test(value);
  let v = value
    .replace(/ !important$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  // color-mix(in oklab, X 100%, transparent) is X.
  for (let from = 0; ; ) {
    const at = v.indexOf('color-mix(in oklab, ', from);
    if (at === -1) break;
    const end = closingParen(v, at);
    const inner = v.slice(at + 'color-mix(in oklab, '.length, end);
    if (inner.endsWith(' 100%, transparent')) {
      v = v.slice(0, at) + inner.slice(0, -' 100%, transparent'.length) + v.slice(end + 1);
    } else {
      from = at + 1;
    }
  }
  v = simplifyCalcs(v);
  if (prop === 'box-shadow') {
    const layers = splitList(v).filter(layer => !ZERO_SHADOW.test(layer));
    v = layers.length ? layers.join(', ') : 'none';
  }
  if (prop === 'transition-property') {
    // `transition-colors` lists the gradient stops too; nothing animates them any more.
    v = splitList(v)
      .filter(item => !item.startsWith('--tw-'))
      .join(', ');
  }
  if (prop === 'translate' && /^0 0$/.test(v)) v = 'none';
  if (prop === 'scale' && /^1 1( 1)?$/.test(v)) v = 'none';
  if (v === '') v = prop === 'content' ? '""' : 'none';
  return important ? `${v} !important` : v;
}

/**
 * Resolves `--tw-*` in a tree. A rule that sets a bookkeeping variable an enclosing rule reads
 * (a `@supports` branch re-mixing a shadow colour) gets the reading property re-emitted so the
 * override survives once the variable is gone.
 */
function resolveTree(tree: StyleTree, chain: Decls[] = []): StyleTree {
  const own = tree.decls;
  const fullChain = [...chain, own];
  const out = newTree();
  if ([...own.keys()].some(name => name.startsWith('--tw-'))) {
    for (let i = chain.length - 1; i >= 0; i--) {
      for (const [prop, value] of chain[i]) {
        if (prop.startsWith('--') || own.has(prop) || !value.includes('var(--tw-')) continue;
        const there = tidy(prop, resolveValue(value, chain.slice(0, i + 1)));
        const here = tidy(prop, resolveValue(value, fullChain));
        if (here !== there) out.decls.set(prop, here);
      }
    }
  }
  for (const [prop, value] of own) {
    if (prop.startsWith('--tw-')) continue;
    out.decls.set(prop, tidy(prop, resolveValue(value, fullChain)));
  }
  for (const [sel, sub] of tree.selectors) {
    const resolved = resolveTree(sub, fullChain);
    if (!isEmptyTree(resolved)) out.selectors.set(sel, resolved);
  }
  for (const [k, { query, tree: sub }] of tree.queries) {
    const resolved = resolveTree(sub, fullChain);
    if (!isEmptyTree(resolved)) out.queries.set(k, { query, tree: resolved });
  }
  return out;
}

// calc() ----------------------------------------------------------------------------------------

type Num = { kind: 'num'; value: number; unit: string };
type Raw = { kind: 'raw'; text: string };
type Bin = { kind: 'bin'; op: string; l: Node; r: Node };
type Node = Num | Raw | Bin;
type Tok = Num | Raw | { kind: 'op'; op: string };

const NUMBER = /^(-?\d+\.?\d*|-?\.\d+)(%|[a-zA-Z]+)?$/;

function simplifyCalcs(value: string): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('calc(', i);
    if (at === -1) {
      out += value.slice(i);
      break;
    }
    if (at > 0 && /[\w-]/.test(value[at - 1])) {
      // Part of a longer identifier (`-webkit-calc`): leave it.
      out += value.slice(i, at + 5);
      i = at + 5;
      continue;
    }
    out += value.slice(i, at);
    const end = closingParen(value, at);
    out += simplifyCalc(value.slice(at + 5, end));
    i = end + 1;
  }
  return out;
}

/** Simplifies the inside of one calc(); returns a bare value or a `calc(...)`. */
function simplifyCalc(expr: string): string {
  try {
    const node = fold(parseExpr(tokenizeCalc(expr)));
    if (node.kind === 'num') return renderNum(node);
    if (node.kind === 'raw') return node.text;
    return `calc(${renderNode(node, 0)})`;
  } catch {
    return `calc(${expr})`;
  }
}

function tokenizeCalc(expr: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') {
      i++;
      continue;
    }
    if ('+*/()'.includes(ch) || (ch === '-' && expr[i + 1] === ' ')) {
      toks.push({ kind: 'op', op: ch });
      i++;
      continue;
    }
    const rest = expr.slice(i);
    const num = /^(-?\d+\.?\d*|-?\.\d+)(%|[a-zA-Z]+)?(?![\w(-])/.exec(rest);
    if (num) {
      toks.push({ kind: 'num', value: parseFloat(num[1]), unit: num[2] ?? '' });
      i += num[0].length;
      continue;
    }
    // An identifier, maybe a function call: balanced through its parens.
    const ident = /^-?[a-zA-Z_][\w-]*/.exec(rest);
    if (!ident) throw new Error(`calc: unexpected ${rest}`);
    let end = i + ident[0].length;
    if (expr[end] === '(') end = closingParen(expr, end) + 1;
    let text = expr.slice(i, end);
    // A nested calc() is simplified on its own and kept as an atom, so it still reads as a unit.
    if (text.startsWith('calc(')) {
      const inner = simplifyCalc(text.slice(5, -1));
      const asNum = NUMBER.exec(inner);
      if (asNum) {
        toks.push({ kind: 'num', value: parseFloat(asNum[1]), unit: asNum[2] ?? '' });
        i = end;
        continue;
      }
      text = inner;
    }
    toks.push({ kind: 'raw', text });
    i = end;
  }
  return toks;
}

function parseExpr(toks: Tok[]): Node {
  let pos = 0;
  const peekOp = (...ops: string[]) => {
    const t = toks[pos];
    return t && t.kind === 'op' && ops.includes(t.op) ? t.op : null;
  };
  const factor = (): Node => {
    const t = toks[pos++];
    if (!t) throw new Error('calc: unexpected end');
    if (t.kind === 'op' && t.op === '(') {
      const inner = expr();
      if (!peekOp(')')) throw new Error('calc: unbalanced');
      pos++;
      return inner;
    }
    if (t.kind === 'op' && t.op === '-') {
      return fold({ kind: 'bin', op: '*', l: { kind: 'num', value: -1, unit: '' }, r: factor() });
    }
    if (t.kind === 'op') throw new Error(`calc: unexpected ${t.op}`);
    return t;
  };
  const term = (): Node => {
    let node = factor();
    let op: string | null;
    while ((op = peekOp('*', '/'))) {
      pos++;
      node = { kind: 'bin', op, l: node, r: factor() };
    }
    return node;
  };
  const expr = (): Node => {
    let node = term();
    let op: string | null;
    while ((op = peekOp('+', '-'))) {
      pos++;
      node = { kind: 'bin', op, l: node, r: term() };
    }
    return node;
  };
  const result = expr();
  if (pos !== toks.length) throw new Error('calc: trailing tokens');
  return result;
}

function fold(node: Node): Node {
  if (node.kind !== 'bin') return node;
  const l = fold(node.l);
  const r = fold(node.r);
  const { op } = node;
  const isNum = (n: Node, v?: number): n is Num =>
    n.kind === 'num' && (v === undefined || (n.value === v && n.unit === ''));
  if (isNum(l) && isNum(r)) {
    if (op === '*' && (l.unit === '' || r.unit === '')) {
      return { kind: 'num', value: l.value * r.value, unit: l.unit || r.unit };
    }
    if (op === '/' && r.value !== 0 && (r.unit === '' || l.unit === r.unit)) {
      return { kind: 'num', value: l.value / r.value, unit: r.unit === '' ? l.unit : '' };
    }
    const zeroL = l.value === 0 && l.unit === '';
    const zeroR = r.value === 0 && r.unit === '';
    if ((op === '+' || op === '-') && (l.unit === r.unit || zeroL || zeroR)) {
      return {
        kind: 'num',
        value: op === '+' ? l.value + r.value : l.value - r.value,
        unit: l.unit || r.unit,
      };
    }
  }
  if (op === '*' && (isNum(l, 0) || isNum(r, 0))) return { kind: 'num', value: 0, unit: '' };
  if (op === '*' && isNum(r, 1)) return l;
  if (op === '*' && isNum(l, 1)) return r;
  if (op === '/' && isNum(r, 1)) return l;
  if (op === '+' && isNum(r, 0)) return l;
  if (op === '+' && isNum(l, 0)) return r;
  if (op === '-' && isNum(r, 0)) return l;
  return { kind: 'bin', op, l, r };
}

function renderNum(n: Num): string {
  return `${Number(n.value.toFixed(6))}${n.unit}`;
}

function renderNode(node: Node, parentPrec: number): string {
  if (node.kind === 'num') return renderNum(node);
  if (node.kind === 'raw') return node.text;
  const prec = node.op === '*' || node.op === '/' ? 2 : 1;
  const rightPrec = prec + (node.op === '-' || node.op === '/' ? 1 : 0);
  const text = `${renderNode(node.l, prec)} ${node.op} ${renderNode(node.r, rightPrec)}`;
  return prec < parentPrec ? `(${text})` : text;
}

// Tokens ----------------------------------------------------------------------------------------

/**
 * `--color-fg-muted` → `vars.color.fg.muted`: the token contracts, evaluated. The theme module
 * needs a Vanilla Extract file scope to load outside the bundler; nothing is emitted.
 */
async function readContracts(): Promise<Map<string, string>> {
  const req = createRequire(path.join(appDir, 'package.json'));
  const fileScope = (await import(req.resolve('@vanilla-extract/css/fileScope'))) as {
    setFileScope(filePath: string, packageName?: string): void;
    endFileScope(): void;
  };
  fileScope.setFileScope('src/styles/normalize-probe.css.ts', '@hive/app');
  const theme = (await import(path.join(srcDir, 'styles/theme.css.ts'))) as Record<string, unknown>;
  const animations = (await import(path.join(srcDir, 'styles/animations.css.ts'))) as Record<
    string,
    unknown
  >;
  fileScope.endFileScope();
  const out = new Map<string, string>();
  const walk = (value: unknown, prefix: string) => {
    if (typeof value === 'string') {
      const m = value.match(/^var\((--[\w-]+)\)$/);
      if (m) out.set(m[1], prefix);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        const segment = /^\d+$/.test(k)
          ? `[${k}]`
          : /^[A-Za-z_$][\w$]*$/.test(k)
            ? `.${k}`
            : `['${k}']`;
        walk(v, prefix + segment);
      }
    }
  };
  walk(theme.vars, 'vars');
  walk(theme.palette, 'palette');
  walk(animations.animate, 'animate');
  return out;
}

/** Renders a CSS value as a TS expression, with typed tokens where they exist. */
function tokenize(value: string, tokens: Map<string, string>, used: Set<string>): string {
  let hasToken = false;
  let out = value.replace(/calc\(var\(--spacing\) \* (-?\d*\.?\d+)\)/g, (_, n: string) => {
    hasToken = true;
    used.add('space');
    return `\${space(${n})}`;
  });
  out = out.replace(/var\((--[\w-]+)\)/g, (whole, name: string) => {
    if (name === '--spacing') {
      hasToken = true;
      used.add('space');
      return '${space(1)}';
    }
    const t = tokens.get(name);
    if (!t) return whole;
    hasToken = true;
    used.add(t.split(/[.[]/)[0]);
    return `\${${t}}`;
  });
  if (!hasToken) return quote(value);
  const lone = out.match(/^\$\{([^}]+)\}$/);
  if (lone) return lone[1];
  return '`' + out.replace(/`/g, '\\`') + '`';
}

function cssPropToJs(prop: string): string {
  if (prop.startsWith('-ms-')) return 'ms' + camel(prop.slice(4), true);
  if (prop.startsWith('-')) return camel(prop.slice(1), true);
  return camel(prop, false);
}
function camel(input: string, pascal: boolean): string {
  const out = input.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return pascal ? out[0].toUpperCase() + out.slice(1) : out;
}
function jsPropToCss(name: string): string {
  if (name.startsWith('--')) return name;
  const kebab = name.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  return /^(Webkit|Moz|ms)[A-Z]/.test(name) ? `-${kebab}` : kebab;
}
const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name));
/** Properties csstype 3.1.2 (pinned by react-select) does not know. */
const UNTYPED = new Set(['textWrap']);

function renderTree(tree: StyleTree, tokens: Map<string, string>, used: Set<string>): string[] {
  const lines: string[] = [];
  const vars: Array<[string, string]> = [];
  for (const [prop, value] of tree.decls) {
    if (prop.startsWith('--')) {
      vars.push([prop, value]);
      continue;
    }
    const name = cssPropToJs(prop);
    const rendered = tokenize(value, tokens, used);
    if (UNTYPED.has(name)) lines.push(`...({ ${name}: ${rendered} } as object),`);
    else lines.push(`${key(name)}: ${rendered},`);
  }
  if (vars.length) {
    lines.push('vars: {');
    for (const [p, v] of vars) lines.push(`${quote(p)}: ${tokenize(v, tokens, used)},`);
    lines.push('},');
  }
  if (tree.selectors.size) {
    lines.push('selectors: {');
    for (const [sel, sub] of tree.selectors) {
      lines.push(`${quote(sel)}: {`, ...renderTree(sub, tokens, used), '},');
    }
    lines.push('},');
  }
  const byKind = new Map<string, Array<[string, StyleTree]>>();
  for (const { query, tree: sub } of tree.queries.values()) {
    const list = byKind.get(query.kind) ?? [];
    list.push([query.params, sub]);
    byKind.set(query.kind, list);
  }
  for (const [kind, list] of byKind) {
    lines.push(`${quote(kind)}: {`);
    for (const [params, sub] of list) {
      lines.push(`${quote(params)}: {`, ...renderTree(sub, tokens, used), '},');
    }
    lines.push('},');
  }
  return lines;
}

// Reading a generated stylesheet ------------------------------------------------------------------

const unquote = (text: string) => text.replace(/^'|'$/g, '');

/** Evaluates a generated body literal back into a StyleTree (it was rendered from one). */
function treeOf(body: ts.ObjectLiteralExpression): StyleTree | null {
  const tree = newTree();
  for (const prop of body.properties) {
    if (ts.isSpreadAssignment(prop)) {
      const m = prop.getText().match(/^\.\.\.\(\{ (\w+): '([^']*)' \} as object\)$/);
      if (!m) return null;
      tree.decls.set(jsPropToCss(m[1]), m[2]);
      continue;
    }
    if (!ts.isPropertyAssignment(prop)) return null;
    const name = unquote(prop.name.getText());
    const init = prop.initializer;
    if (name === 'vars' && ts.isObjectLiteralExpression(init)) {
      for (const v of init.properties) {
        if (!ts.isPropertyAssignment(v) || !ts.isStringLiteral(v.initializer)) return null;
        tree.decls.set(unquote(v.name.getText()), v.initializer.text);
      }
    } else if (name === 'selectors' && ts.isObjectLiteralExpression(init)) {
      for (const sel of init.properties) {
        if (!ts.isPropertyAssignment(sel) || !ts.isObjectLiteralExpression(sel.initializer)) {
          return null;
        }
        const sub = treeOf(sel.initializer);
        if (!sub) return null;
        tree.selectors.set(unquote(sel.name.getText()), sub);
      }
    } else if (
      (name === '@media' || name === '@supports' || name === '@container') &&
      ts.isObjectLiteralExpression(init)
    ) {
      for (const q of init.properties) {
        if (!ts.isPropertyAssignment(q) || !ts.isObjectLiteralExpression(q.initializer))
          return null;
        const sub = treeOf(q.initializer);
        if (!sub) return null;
        const params = unquote(q.name.getText());
        tree.queries.set(`${name} ${params}`, { query: { kind: name, params }, tree: sub });
      }
    } else if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
      tree.decls.set(jsPropToCss(name), init.text);
    } else {
      return null;
    }
  }
  return tree;
}

type Wrapper = {
  node: ts.ObjectLiteralExpression;
  body: ts.ObjectLiteralExpression;
  /** For a block inside a recipe's variants: the recipe call and its base block's body. */
  recipe?: ts.CallExpression;
  base?: ts.ObjectLiteralExpression;
};

/** The body of a `{ '@layer': { [layer]: {...} } }` object, or null. */
function wrapperBody(node: ts.ObjectLiteralExpression): ts.ObjectLiteralExpression | null {
  if (node.properties.length !== 1) return null;
  const [p] = node.properties;
  if (
    !ts.isPropertyAssignment(p) ||
    p.name.getText() !== "'@layer'" ||
    !ts.isObjectLiteralExpression(p.initializer) ||
    p.initializer.properties.length !== 1
  ) {
    return null;
  }
  const [inner] = p.initializer.properties;
  if (
    ts.isPropertyAssignment(inner) &&
    ts.isComputedPropertyName(inner.name) &&
    inner.name.expression.getText() === 'layer' &&
    ts.isObjectLiteralExpression(inner.initializer)
  ) {
    return inner.initializer;
  }
  return null;
}

/**
 * Every `{ '@layer': { [layer]: {...} } }` object in the file. A recipe's variants apply together
 * with its base, so a variant block resolves Tailwind's variables with the base in scope.
 */
function findWrappers(sf: ts.SourceFile): Wrapper[] {
  const out: Wrapper[] = [];
  const visit = (node: ts.Node, recipe?: ts.CallExpression, base?: ts.ObjectLiteralExpression) => {
    if (ts.isObjectLiteralExpression(node)) {
      const body = wrapperBody(node);
      if (body) {
        out.push(body === base ? { node, body } : { node, body, recipe, base });
        return;
      }
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === 'recipe' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const baseProp = node.arguments[0].properties.find(
        p => ts.isPropertyAssignment(p) && p.name.getText() === 'base',
      );
      const baseBody =
        baseProp &&
        ts.isPropertyAssignment(baseProp) &&
        ts.isObjectLiteralExpression(baseProp.initializer)
          ? wrapperBody(baseProp.initializer)
          : null;
      ts.forEachChild(node, child => visit(child, node, baseBody ?? undefined));
      return;
    }
    ts.forEachChild(node, child => visit(child, recipe, base));
  };
  visit(sf);
  return out;
}

/** The `--tw-*` variables a tree sets and reads, at any depth. */
function twVarUse(tree: StyleTree, use = { sets: new Set<string>(), reads: new Set<string>() }) {
  for (const [prop, value] of tree.decls) {
    if (prop.startsWith('--tw-')) use.sets.add(prop);
    for (const m of value.matchAll(/var\((--tw-[\w-]+)/g)) use.reads.add(m[1]);
  }
  for (const sub of tree.selectors.values()) twVarUse(sub, use);
  for (const { tree: sub } of tree.queries.values()) twVarUse(sub, use);
  return use;
}

type Exported = { name: string; statement: ts.VariableStatement; wrapper: Wrapper };

/** `export const x = style({ '@layer': ... })` statements, the candidates for a primitive. */
function exportedStyles(sf: ts.SourceFile, wrappers: Wrapper[]): Exported[] {
  const out: Exported[] = [];
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const decl = st.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name) || !decl.initializer) continue;
    const init = decl.initializer;
    if (!ts.isCallExpression(init) || init.expression.getText() !== 'style') continue;
    if (init.arguments.length !== 1) continue;
    const wrapper = wrappers.find(w => w.node === init.arguments[0]);
    if (wrapper) out.push({ name: decl.name.text, statement: st, wrapper });
  }
  return out;
}

// Matching ------------------------------------------------------------------------------------

type Cover = { exprs: string[]; rest: Decls };

/**
 * Covers as much of a body as possible with primitives, largest first, leaving the rest local.
 * A row primitive is never used for a column (`flex-direction` present), since the name would lie.
 */
function matcher(primitives: Map<string, Decls>) {
  const ordered = [...primitives].sort((a, b) => b[1].size - a[1].size);
  return (decls: Decls): Cover => {
    const covered = new Set<string>();
    const exprs: string[] = [];
    const column = decls.has('flex-direction');
    for (const [expr, d] of ordered) {
      if (column && /^shared\.(row|inlineRow)\./.test(expr)) continue;
      if ([...d].some(([p, v]) => decls.get(p) !== v || covered.has(p))) continue;
      exprs.push(expr);
      for (const p of d.keys()) covered.add(p);
    }
    // In the order the body declares them, so the composition reads like the original.
    const order = [...decls.keys()];
    const first = (expr: string) => order.indexOf([...primitives.get(expr)!.keys()][0]);
    exprs.sort((a, b) => first(a) - first(b));
    return { exprs, rest: new Map([...decls].filter(([p]) => !covered.has(p))) };
  };
}

// Call-site safety ------------------------------------------------------------------------------

const isCnCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  ['cn', 'clsx'].includes(node.expression.text);

const isAnd = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken;

/** Climbs through `&&`, `?:` and parens to the expression that is the class value or a cn() argument. */
function climb(node: ts.Node): ts.Node {
  let cur = node;
  for (;;) {
    const p = cur.parent;
    if (ts.isParenthesizedExpression(p)) cur = p;
    else if (isAnd(p) && p.right === cur) cur = p;
    else if (ts.isConditionalExpression(p) && (p.whenTrue === cur || p.whenFalse === cur)) cur = p;
    else return cur;
  }
}

/** True when the node is the `className={…}` of a plain element (`div`, not `Button`). */
function isPlainElementClass(expr: ts.Node): boolean {
  if (!ts.isJsxExpression(expr) || !ts.isJsxAttribute(expr.parent)) return false;
  if (expr.parent.name.getText() !== 'className') return false;
  const element = expr.parent.parent.parent;
  const tag =
    ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element) ? element.tagName : null;
  return !!tag && ts.isIdentifier(tag) && /^[a-z]/.test(tag.text);
}

/** The styles an argument can evaluate to, as names in the namespace; null if it could be anything. */
function argStyles(arg: ts.Node, ns: string): string[] | null {
  if (ts.isParenthesizedExpression(arg)) return argStyles(arg.expression, ns);
  if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.expression)) {
    return arg.expression.text === ns ? [arg.name.text] : null;
  }
  if (isAnd(arg)) return argStyles(arg.right, ns);
  if (ts.isConditionalExpression(arg)) {
    const a = argStyles(arg.whenTrue, ns);
    const b = argStyles(arg.whenFalse, ns);
    return a && b ? [...a, ...b] : null;
  }
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return [];
  if (arg.kind === ts.SyntaxKind.FalseKeyword || arg.kind === ts.SyntaxKind.NullKeyword) return [];
  if (ts.isIdentifier(arg) && (arg.text === 'undefined' || arg.text === 'className')) return [];
  return null;
}

/**
 * Whether every use of `ns.name` in the source is one where a components-layer primitive renders
 * the same as the local style did: on a plain element, with no sibling in the same class list
 * that sets any of the same properties.
 */
function usesAreSafe(
  src: ts.SourceFile,
  ns: string,
  name: string,
  props: Map<string, Set<string>>,
): boolean {
  let safe = true;
  let uses = 0;
  const visit = (node: ts.Node) => {
    if (!safe) return;
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === ns &&
      node.name.text === name
    ) {
      uses++;
      const top = climb(node);
      const parent = top.parent;
      if (isPlainElementClass(parent)) return;
      if (!isCnCall(parent) || !isPlainElementClass(parent.parent)) {
        safe = false;
        return;
      }
      const mine = props.get(name)!;
      for (const arg of parent.arguments) {
        if (arg === top) continue;
        const others = argStyles(arg, ns);
        if (!others) {
          safe = false;
          return;
        }
        for (const other of others) {
          if (other === name) continue;
          const theirs = props.get(other);
          if (!theirs || [...theirs].some(p => mine.has(p))) {
            safe = false;
            return;
          }
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return safe && uses > 0;
}

// Rewriting -----------------------------------------------------------------------------------

type Edit = { start: number; end: number; text: string };
function apply(text: string, edits: Edit[]): string {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

function listStylesheets(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'gql' && entry.name !== 'styles') out.push(...listStylesheets(full));
    } else if (/\.css\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out.sort();
}

async function main() {
  if (!scopes.length) {
    console.error('Pass at least one --scope <dir relative to packages/web/app/src>');
    process.exit(2);
  }
  const compiled = await compileTokens(
    appDir,
    PRIMITIVES.flatMap(([, c]) => c.split(' ')),
  );
  const primitives = new Map<string, Decls>();
  for (const [expr, classes] of PRIMITIVES) {
    const converted = convert(classes.split(' ').map(t => compiled.tokens.get(t)!));
    const resolved = resolveTree(converted.local);
    if (!isFlat(resolved) || converted.globals.length) {
      throw new Error(`primitive ${expr} is not a flat style: ${classes}`);
    }
    primitives.set(expr, resolved.decls);
  }
  const match = matcher(primitives);
  const tokens = await readContracts();

  const files = listStylesheets(srcDir).filter(f => {
    const rel = path.relative(srcDir, f);
    return scopes.some(s => rel.startsWith(s.replace(/\/$/, '') + '/') || rel === s);
  });
  const totals = { files: 0, blocks: 0, primitive: 0, composed: 0, kept: 0 };
  const written: string[] = [];

  for (const cssPath of files) {
    const cssText = readFileSync(cssPath, 'utf8');
    const layerImport = cssText.match(
      /import \{ (components|utilities) as layer \} from '([^']+)';\n/,
    );
    if (!layerImport) continue;
    const layerName = layerImport[1];
    const cssFile = ts.createSourceFile(cssPath, cssText, ts.ScriptTarget.ES2022, true);
    const wrappers = findWrappers(cssFile);
    if (!wrappers.length) continue;
    const rel = path.relative(srcDir, cssPath);

    // Parse every block once; a block that does not parse is left as it is.
    const raw = new Map<Wrapper, StyleTree>();
    for (const w of wrappers) {
      const tree = treeOf(w.body);
      if (tree) raw.set(w, tree);
      else warn(`${rel}: a block could not be parsed, left as is`);
    }
    const trees = new Map<Wrapper, StyleTree>();
    for (const [w, tree] of raw) {
      const base = w.base ? [...raw].find(([x]) => x.body === w.base)?.[1] : undefined;
      trees.set(w, resolveTree(tree, base ? [base.decls] : []));
    }
    // Variants of one recipe that pass a variable between them cannot be resolved one at a time.
    const byRecipe = new Map<ts.CallExpression, Wrapper[]>();
    for (const w of wrappers)
      if (w.recipe) byRecipe.set(w.recipe, [...(byRecipe.get(w.recipe) ?? []), w]);
    for (const [recipe, parts] of byRecipe) {
      const uses = parts.flatMap(w => (raw.has(w) ? [twVarUse(raw.get(w)!)] : []));
      const setBy = new Map<string, number>();
      uses.forEach((u, i) => u.sets.forEach(v => setBy.set(v, (setBy.get(v) ?? 0) + 1)));
      const shared = [
        ...new Set(
          uses.flatMap((u, i) =>
            [...u.reads].filter(v => [...uses.keys()].some(j => j !== i && uses[j].sets.has(v))),
          ),
        ),
      ];
      if (shared.length) {
        const name =
          recipe.parent && ts.isVariableDeclaration(recipe.parent)
            ? recipe.parent.name.getText()
            : 'recipe';
        warn(`${rel}: variants of ${name} pass ${shared.join(', ')} between them; check by hand`);
      }
    }

    // Which exported styles can become shared primitives.
    const sourcePath = ['.tsx', '.ts']
      .map(ext => cssPath.replace(/\.css\.ts$/, ext))
      .find(p => existsSync(p));
    const srcText = sourcePath ? readFileSync(sourcePath, 'utf8') : '';
    const importRe = new RegExp(
      `import \\* as (\\w+) from '\\./${path.basename(cssPath, '.ts')}';\n`,
    );
    const namespace = srcText.match(importRe)?.[1];
    const exported = exportedStyles(cssFile, wrappers);
    const propsByName = new Map<string, Set<string>>();
    for (const e of exported) {
      const tree = trees.get(e.wrapper);
      if (tree) propsByName.set(e.name, allProps(tree));
    }
    const replacements = new Map<string, string>(); // style → the one primitive its call sites use
    const compositions = new Map<string, Cover>(); // style → what it is composed of
    const srcFile =
      sourcePath && namespace
        ? ts.createSourceFile(sourcePath, srcText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
        : null;
    if (srcFile && namespace) {
      for (const e of exported) {
        const tree = trees.get(e.wrapper);
        if (!tree) continue;
        const cover = match(tree.decls);
        if (!cover.exprs.length) continue;
        // Referenced elsewhere in the stylesheet (an alias, a composition, a globalStyle)?
        const mentions = (cssText.match(new RegExp(`\\b${e.name}\\b`, 'g')) ?? []).length;
        if (mentions > 1) continue;
        if (!usesAreSafe(srcFile, namespace, e.name, propsByName)) continue;
        if (cover.exprs.length === 1 && !cover.rest.size && isFlat(tree)) {
          replacements.set(e.name, cover.exprs[0]);
        } else if (tree.decls.size - cover.rest.size >= 2 || !cover.rest.size) {
          // Pulling a lone `display: flex` out of an otherwise local style would only add noise.
          compositions.set(e.name, cover);
        }
      }
    }

    // Stylesheet edits.
    const used = new Set<string>();
    const cssEdits: Edit[] = [];
    const removed = new Set<Wrapper>();
    for (const e of exported) {
      if (replacements.has(e.name)) {
        cssEdits.push({ start: e.statement.getStart(), end: e.statement.getEnd(), text: '' });
        removed.add(e.wrapper);
      } else if (compositions.has(e.name)) {
        const { exprs, rest } = compositions.get(e.name)!;
        const tree = trees.get(e.wrapper)!;
        const local: StyleTree = { decls: rest, queries: tree.queries, selectors: tree.selectors };
        const parts = [...exprs];
        if (!isEmptyTree(local)) {
          parts.push(`layered.${layerName}({\n${renderTree(local, tokens, used).join('\n')}\n})`);
        }
        const text = `export const ${e.name} = style([${parts.join(', ')}]);`;
        cssEdits.push({ start: e.statement.getStart(), end: e.statement.getEnd(), text });
        removed.add(e.wrapper);
        totals.blocks++;
      }
    }
    for (const w of wrappers) {
      if (removed.has(w)) continue;
      const tree = trees.get(w);
      if (!tree) continue;
      const lines = renderTree(tree, tokens, used);
      const text = `layered.${layerName}({\n${lines.join('\n')}\n})`;
      cssEdits.push({ start: w.node.getStart(), end: w.node.getEnd(), text });
      totals.blocks++;
    }
    if (!cssEdits.length) continue;
    let css = apply(cssText, cssEdits).replaceAll('style([])', 'style({})');
    const stylesDir = path.dirname(layerImport[2]);
    const header: string[] = [];
    if (/layered\.(components|utilities)\(/.test(css)) {
      header.push(`import { layered } from '${stylesDir}/layered';`);
    }
    if (/\bshared\./.test(css)) header.push(`import * as shared from '${stylesDir}/shared.css';`);
    if (used.has('animate')) header.push(`import { animate } from '${stylesDir}/animations.css';`);
    if (used.has('space')) header.push(`import { space } from '${stylesDir}/space';`);
    const theme = ['palette', 'vars'].filter(t => used.has(t));
    if (theme.length) header.push(`import { ${theme.join(', ')} } from '${stylesDir}/theme.css';`);
    css = css.replace(layerImport[0], header.length ? header.join('\n') + '\n' : '');
    css = css.replace(/\n{3,}/g, '\n\n');

    // Call-site edits: a style that was exactly one primitive is referenced as that primitive.
    let src = srcText;
    if (replacements.size && srcFile && namespace) {
      const srcEdits: Edit[] = [];
      const visit = (node: ts.Node) => {
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === namespace &&
          replacements.has(node.name.text)
        ) {
          srcEdits.push({
            start: node.getStart(),
            end: node.getEnd(),
            text: replacements.get(node.name.text)!,
          });
          return;
        }
        ts.forEachChild(node, visit);
      };
      visit(srcFile);
      src = apply(srcText, srcEdits);
      if (!/import \* as shared from '@\/styles\/shared\.css'/.test(src)) {
        const line = `import * as shared from '@/styles/shared.css';`;
        const lastImport = [...src.matchAll(/^import [^\n]+;$/gm)].pop();
        const at = lastImport ? lastImport.index! + lastImport[0].length : 0;
        src = src.slice(0, at) + '\n' + line + src.slice(at);
      }
      if (!new RegExp(`\\b${namespace}\\.`).test(src)) src = src.replace(importRe, '');
      totals.primitive += replacements.size;
      if (verbose) {
        for (const [name, expr] of replacements) console.log(`${rel}: ${name} → ${expr}`);
      }
    }
    totals.composed += compositions.size;
    if (verbose) {
      for (const [name, { exprs, rest }] of compositions) {
        console.log(`${rel}: ${name} = [${exprs.join(', ')}${rest.size ? ', …' : ''}]`);
      }
    }
    totals.kept += exported.length - replacements.size - compositions.size;
    totals.files++;
    if (dry) continue;
    if (/^export (const|function) /m.test(css)) {
      writeFileSync(cssPath, css);
      written.push(cssPath);
    } else {
      execFileSync('git', ['rm', '-q', '--', cssPath], { cwd: repoRoot });
      console.log(`removed ${rel} (every style became a primitive)`);
    }
    if (sourcePath && src !== srcText) {
      writeFileSync(sourcePath, src);
      written.push(sourcePath);
    }
  }

  if (written.length) {
    const prettier = ['exec', 'prettier', '--write', '--log-level', 'warn', ...written];
    execFileSync('pnpm', prettier, { cwd: repoRoot, stdio: 'inherit' });
    try {
      execFileSync('pnpm', ['exec', 'eslint', '--fix', ...written], {
        cwd: repoRoot,
        stdio: 'inherit',
      });
    } catch {
      console.error('ESLint reported problems in the rewritten files (see above).');
    }
  }
  for (const w of [...new Set(warnings)]) console.error(`warning: ${w}`);
  console.log(
    `${dry ? '(dry run) ' : ''}files: ${totals.files}, blocks rewritten: ${totals.blocks}, ` +
      `styles → primitive: ${totals.primitive}, → composition: ${totals.composed}, kept local: ${totals.kept}`,
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

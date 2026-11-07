# tailwind-to-ve

Codemod that moves `packages/web/app` from Tailwind class strings to Vanilla Extract styles. It is
run once per directory during the migration and then deleted with the rest of the Tailwind setup.

```sh
pnpm codemod:tailwind-to-ve --scope components/ui [--scope pages] [--dry --print] [--force]
```

`--scope` is a directory or file under `packages/web/app/src`; pass it more than once for more.
`--dry` changes nothing and `--print` writes what would be generated to stdout. `--force` overwrites
a `.css.ts` that already exists, which otherwise stops the run, since a hand-edited one would be
lost.

`--append` adds to an existing `.css.ts` instead of refusing, for a file converted earlier whose
remaining class strings were restructured by hand into a static shape (a `cva` whose base was a
`cn(...)`, say). A recipe added this way may compose values the same `.css.ts` already exports, by
their source name.

`--sweep` widens the scan to every string literal, outside imports, types, tags and non-class
attributes, whose tokens are all known classes and not a single plain word. That catches props other
than `className` carrying classes (`gap="flex flex-col gap-4"`) and the class maps in data constants
(`{ success: 'text-success' }`) that only Tailwind's source scanner used to see. Run it once, with
`--append`, after the directory passes.

`--candidates-from <git ref>` also counts the class strings at that ref towards
`tailwind-defaults.css`, which is otherwise computed from the current source alone. Pass the
pre-migration commit and `main`: once a directory is converted its source holds no Tailwind classes,
and the defaults would otherwise lose the `@property` registrations the converted styles rely on (an
unregistered `--tw-leading` inherits into children, for one).

## Second pass: `normalize.ts`

```sh
pnpm tsx scripts/tailwind-to-ve/normalize.ts --scope components/ui [--dry] [--verbose]
```

Turns the generated output into what a person would write, one directory at a time, without changing
what renders:

- every `{ '@layer': { [layer]: {...} } }` block becomes `layered.components({...})` (or
  `layered.utilities`), with typed tokens: `vars.color.fg.muted`, `space(4)`, `palette.neutral[4]`,
  `animate.spin`;
- Tailwind's `--tw-*` bookkeeping is resolved to the value it produced: `line-height` from
  `var(--tw-leading, X)`, `border-style: solid`, a `box-shadow` assembled from its ring and shadow
  parts, `translate`/`scale` from their axes, `space-y` margins with the reverse factor applied. A
  variable is looked up in the rule, then its enclosing rules, then Tailwind's `@property` default;
  a `@supports` branch that only overrode a variable gets the property it fed re-emitted;
- an exported `style()` is composed from the shared primitives in `src/styles/shared.css.ts` where
  its declarations allow: `style([shared.row.gap2, shared.fg.muted, layered.components({...})])`,
  with whatever the primitives do not cover kept local. A style that is exactly one primitive goes,
  and its call sites reference the primitive. A composition has to cover at least two declarations,
  so a lone `display: flex` is not pulled out of an otherwise local style. The primitives live in
  the `components` layer, so this is only done where the cascade cannot differ: the style is on
  plain JSX elements and no sibling in the same `cn(...)` sets the same properties;
- a recipe's variants are resolved with the base in scope, since they apply together; variants that
  pass a variable between each other are reported for a look by hand.

A file is skipped once it no longer has the `as layer` import, so the pass is safe to re-run. Names
of the styles that stay local are left alone: the hand pass after this names them by role.

## After the removal

The app no longer depends on Tailwind, so the codemod keeps what it needs here: `index.css` and
`tailwind-plugins.js` are the app's former Tailwind entry stylesheet and plugin, copied unchanged,
and the compiler is resolved through `@graphql-hive/laboratory`, which still uses Tailwind. That
keeps the codemod runnable for any further merge from `main` that brings Tailwind classes with it.
Delete this directory, the root `codemod:tailwind-to-ve` script and `--candidates-from` once the
migration has landed and `main` has no Tailwind classes left.

## How it works

1. **Scan** every source file for class strings: a `className` attribute, any string inside a call
   to `cn`, `clsx`, `cva` or `twMerge`, or a constant whose name ends in `class`, `classes`,
   `className`, `style`, `styles`, `variant` or `variants` (and anything in a `*styles.ts` file). A
   constant counts only if every token is a known class, so prose and paths stay untouched.
2. **Compile** the union of all classes once with Tailwind's own compiler, from the app's
   `index.css`, and index the output by class. The CSS for a class is therefore exactly what ships
   today, and its position in Tailwind's output is kept as its cascade order.
3. **Rewrite** each file in scope. Every class string becomes a `style()` in a sibling `.css.ts`,
   built by merging its classes' declarations in Tailwind's order, so a later utility overrides an
   earlier one just as in the real stylesheet. The string in the source becomes a reference:
   `className="flex gap-2"` → `className={styles.cardRoot}`.
4. **Write** `src/styles/tailwind-defaults.css`: Tailwind's default theme variables (`--spacing`,
   `--text-sm`, `--font-weight-medium`, …), `@property` registrations and keyframes that the
   compiled styles reference, computed over the whole app so it is complete from the first run.
5. **Format** with Prettier and ESLint `--fix`, then print a report.

## Mapping

| Tailwind                                                      | Vanilla Extract                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| plain utilities                                               | properties on the style object                                                                                                                                                                                     |
| `hover:`, `focus-visible:`, `disabled:`, `aria-*:`, `data-*:` | `selectors: { '&:hover': … }`, inside the `@media (hover: hover)` Tailwind wraps them in                                                                                                                           |
| `dark:`                                                       | `selectors: { '&:where(.dark, .dark *)': … }`                                                                                                                                                                      |
| `md:`, `print:`, `motion-safe:`                               | `'@media': { '(width >= 48rem)': … }`                                                                                                                                                                              |
| `group-hover:`, `peer-checked:`                               | the same selector Tailwind emits, keyed on the literal `group`/`peer` class, which stays in the `className` as a string                                                                                            |
| `[&_svg]:`, `*:`, `space-x-*`, `divide-*`                     | a `globalStyle` on the generated class, because the subject is a descendant                                                                                                                                        |
| `--tw-*` variables                                            | `vars` on the style; their `@property` registrations go to `tailwind-defaults.css`                                                                                                                                 |
| `container`, `thin-scrollbar`, `no-scrollbar`, `bg-dot-*`     | the hand-ported exports in `src/styles/utilities.css.ts` and `patterns.css.ts`, composed in                                                                                                                        |
| `cva(base, { variants, compoundVariants, defaultVariants })`  | `recipe({ base, variants, compoundVariants: [{ variants, style }], defaultVariants })`; array selections are expanded; composed constants (`focusRing`) become composition entries with their imports carried over |
| `VariantProps<typeof x>`                                      | `NonNullable<RecipeVariants<typeof x>>`                                                                                                                                                                            |
| unknown classes (`graphiql-*`, `hive-*`)                      | kept as a literal, combined with `cn`/`clsx`, and listed in the report                                                                                                                                             |

## Cascade layers

Styles from `components/ui`, `components/v2` and `components/base` go in the `components` layer;
everything else goes in `utilities`. Both are Tailwind's own layer names (see
`src/styles/layers.css.ts`), so while the two systems coexist a Tailwind utility on a call site
still beats a component's base style, which is what `cn(base, className)` relied on `tailwind-merge`
for. After Tailwind is gone the same two layers keep that relationship.

## What it leaves for a human

The report lists them per file:

- `cva` calls that are not static (a variant computed at runtime, or composing a local value).
- Classes built in template literals, such as `` `hover:${color}` ``.
- Classes Tailwind did not recognise.

Also not handled here: call sites that pass `className` through a variants function
(`buttonVariants({ variant, className })`), which `recipe` does not accept.

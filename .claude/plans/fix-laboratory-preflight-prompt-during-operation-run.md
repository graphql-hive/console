# Preflight `lab.prompt()` hangs when run as part of an operation

Branch: `fix-laboratory-preflight-prompt-during-operation-run`

## Context

In the laboratory, a preflight script that calls `await lab.prompt('Noun')` works from the **Test** button but silently does nothing when the same script runs as part of executing an operation. No modal, no request, no error.

Cause: the two paths call the worker runner with different arguments.

- **Test button** — [preflight.tsx:31-47](packages/libraries/laboratory/src/components/laboratory/preflight.tsx#L31-L47) calls `runIsolatedLabScript(script, env, promptHandler, ...)` and passes a handler that opens `openPreflightPromptModal`.
- **Operation run** — [preflight.ts:63-69](packages/libraries/laboratory/src/lib/preflight.ts#L63-L69) (`usePreflight().runPreflight`) calls `runIsolatedLabScript(script, env, undefined, ...)` — the third argument is hardcoded `undefined`.

Inside the runner, the worker posts `{type:'prompt'}` and then awaits a `prompt:result` message ([preflight.ts:159-164](packages/libraries/laboratory/src/lib/preflight.ts#L159-L164)). The host side does `void prompt?.(...)` ([preflight.ts:263-267](packages/libraries/laboratory/src/lib/preflight.ts#L263-L267)) — with no handler this is a no-op, so `prompt:result` is never posted, `lab.prompt()` never settles, the worker never posts `result`, and the promise returned by `runIsolatedLabScript` never resolves. Every caller that awaits it stalls forever:

- [operation.tsx:485](packages/libraries/laboratory/src/components/laboratory/operation.tsx#L485) — the Run button (the reported symptom; the request is never sent and no loading state is set)
- [operations.ts:392](packages/libraries/laboratory/src/lib/operations.ts#L392) — `runActiveOperation` when no preflight result was passed in
- [endpoint.ts:156](packages/libraries/laboratory/src/lib/endpoint.ts#L156) — introspection when headers contain `{{ }}` placeholders

Not a regression — the `undefined` has been there since the lab lib landed (`1bf05f048`).

Intended outcome: prompts appear during operation runs exactly as they do from Test, and a script can never wedge the lab by awaiting a prompt nobody answers.

## Changes

### 1. Give `usePreflight` the prompt modal — `src/lib/preflight.ts`

`usePreflight` already receives the whole `LaboratoryProps` spread, and `openPreflightPromptModal` is already part of that props type ([context.tsx:143-147](packages/libraries/laboratory/src/components/laboratory/context.tsx#L143-L147)) — it just isn't in the hook's local props type and isn't wired through.

- Add `openPreflightPromptModal?: (props: { placeholder: string; defaultValue?: string; onSubmit?: (value: string | null) => void }) => void` to the `usePreflight` props type (same shape as context.tsx, no new type needed).
- In `runPreflight`, replace the `undefined` third argument with the same bridge the Test button uses:
  ```ts
  (placeholder, defaultValue) =>
    new Promise<string | null>(resolve =>
      props.openPreflightPromptModal?.({ placeholder, defaultValue, onSubmit: resolve }),
    )
  ```
  Add `props.openPreflightPromptModal` to the `useCallback` deps.

This fixes all three call sites at once, including the two in `lib/` that have no access to the React context.

### 2. Pass the modal opener in — `src/components/laboratory/laboratory.tsx`

`openPreflightPromptModal` is currently defined at line 684, after `usePreflight` at line 577. Move the two `useState` calls (`isPreflightPromptModalOpen`, `preflightPromptModalProps`, lines 672-682) and the `openPreflightPromptModal` `useCallback` (lines 684-701) above the `settingsApi`/`envApi`/`preflightApi` block, then:

```ts
const preflightApi = usePreflight({ ...props, envApi, openPreflightPromptModal });
```

Laboratory's own opener wins over a host-supplied one, matching what the provider already does at line 747.

### 3. Never leave a script awaiting — `src/lib/preflight.ts`

In the `data.type === 'prompt'` branch of `runIsolatedLabScript`, when no handler is supplied, post `prompt:result` with `null` instead of dropping the message:

```ts
void (prompt?.(data.placeholder, data.defaultValue) ?? Promise.resolve(null)).then(value => {
  worker.postMessage({ type: 'prompt:result', value });
});
```

So a host that never wires a modal gets `null` from `lab.prompt()` rather than a wedged lab.

### 4. Resolve on dismissal — `PreflightPromptModal` in `laboratory.tsx`

Same silent-hang class, reachable from the fixed path: closing the dialog runs `form.handleSubmit()` ([laboratory.tsx:159-165](packages/libraries/laboratory/src/components/laboratory/laboratory.tsx#L159-L165)), but the zod validator requires `min(1)`, so if the user types then clears the field and hits Escape, validation fails, `onSubmit` never fires, the dialog closes, and the worker waits forever.

In `onOpenChange`, when `open === false`, call `props.onSubmit?.(null)` after the submit attempt. A second `resolve` on an already-settled promise is a no-op, so the happy path is unaffected.

## Tests

New `src/lib/preflight.spec.tsx` (`// @vitest-environment jsdom`), stubbing `globalThis.Worker` with a fake that records `postMessage` calls and lets the test drive `onmessage`, plus a `URL.createObjectURL` stub — the real worker never runs in jsdom:

- `runIsolatedLabScript` forwards a `prompt` message to the handler and posts the answer back as `prompt:result`.
- `runIsolatedLabScript` with no handler still posts `prompt:result` with `null` (regression guard for #3).
- `usePreflight` (via `renderHook`, preflight enabled) calls `openPreflightPromptModal` when the script prompts, and posts back the value passed to `onSubmit` — the actual reported bug.

`PreflightPromptModal` is module-local to `laboratory.tsx` and not exported, so #4 is covered by manual verification rather than a test (noted rather than exporting internals just for a test).

Run: `pnpm --filter @graphql-hive/laboratory test` (add `-- src/lib/preflight.spec.tsx` to narrow).

## Manual verification

1. `pnpm --filter @graphql-hive/laboratory dev`, open the lab.
2. Preflight tab, enable preflight, script:
   ```js
   const value = await lab.prompt('Noun');
   console.log('The', value, 'is nice!');
   ```
3. **Test** → modal appears, submit → log line. (unchanged behavior)
4. Switch to the operation tab and Run (or ⌘↵) → the same modal now appears, submitting runs the operation and the preflight log shows in the history entry.
5. Run again, type into the prompt, clear it, press Escape → the operation completes with `null` instead of hanging.

## Deliberately not doing

- Not deduping the Test button's inline bridge in `preflight.tsx` against `runPreflight` — Test must run even when preflight is disabled (`runPreflight` returns `null` in that case) and also writes `lastTestResult`, so collapsing them is a separate refactor.
- Not adding a loading/pending state to the Run button while the prompt modal is open — the modal itself is the visible signal.
- Not touching the `setTimeout(..., 200)` in `openPreflightPromptModal`.

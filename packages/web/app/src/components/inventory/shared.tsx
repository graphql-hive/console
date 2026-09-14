import { type ReactNode } from 'react';

/**
 * Shared furniture for the inventory previews in this folder.
 *
 * Each preview here transcribes every real call site of a `ui/` or `v2/` component queued for
 * migration to `base/`, rendering the **old** component as it ships today. That gives a "before"
 * to judge a replacement against, and a coverage checklist to migrate through.
 *
 * These live outside `base/` on purpose: they import the old components, and `base/` should not
 * grow edges into `ui/`/`v2/` even in preview files.
 *
 * Not named `*.preview.tsx`, so foundry does not mount it as a preview of its own.
 */

/**
 * One transcribed call site, captioned with where it came from.
 *
 * The caption is rendered rather than left as a source comment because these previews are meant
 * to be read in foundry, where the file itself is not visible.
 */
export function CallSite(props: {
  /** Repo-relative path and line, e.g. `pages/organization.tsx:224`. */
  source: string;
  /** Which legacy folder the component being rendered comes from. */
  origin: Origin;
  /** What makes this call site worth its own entry, when that is not obvious. */
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5">
          <OriginTag origin={props.origin} />
          <code className="text-neutral-10 font-mono text-xs">{props.source}</code>
        </span>
        {props.note ? <p className="text-neutral-11 max-w-prose text-xs">{props.note}</p> : null}
      </div>
      {props.children}
    </div>
  );
}

/** Several call sites that share a shape, shown together under one heading. */
export function CallSiteGroup(props: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h3 className="text-neutral-12 text-sm font-medium">{props.label}</h3>
      {props.children}
    </section>
  );
}

/**
 * Which folder the call site imports from. Several components exist in both legacy folders with
 * different APIs, so the folder is part of identifying what a call site actually uses. `base` marks
 * a site that has already migrated: it is listed so the inventory stays a complete count, and so
 * the preview shows the thing that actually ships there.
 */
export type Origin = 'ui' | 'v2' | 'base';

export type InventoryEntry = {
  /** Repo-relative path and line. */
  source: string;
  /** Which legacy folder the component being used comes from. */
  origin: Origin;
  /** What the call site does, in a few words. */
  what: string;
  /**
   * Set when this entry is represented by another preview rather than one of its own, which is
   * how components with too many instances to transcribe individually are covered.
   */
  coveredBy?: string;
};

/** Folder tag, so a v2 call site is not mistaken for a ui one when skimming the list. */
export function OriginTag(props: { origin: Origin }) {
  return (
    <span
      className={
        {
          ui: 'bg-neutral-4 text-neutral-11 rounded-xs px-1 py-px font-mono text-[10px] leading-none',
          v2: 'bg-neutral-5 text-neutral-12 rounded-xs px-1 py-px font-mono text-[10px] leading-none',
          base: 'bg-success_80/20 text-success_80 rounded-xs px-1 py-px font-mono text-[10px] leading-none',
        }[props.origin]
      }
    >
      {props.origin}
    </span>
  );
}

/**
 * The "where is this used" screen: every call site of the old component, whether or not it has a
 * preview of its own. Read it as a coverage checklist while migrating.
 */
export function InventoryList(props: {
  component: string;
  /** Anything worth knowing before reading the list: instance counts, dead exports, oddities. */
  summary?: ReactNode;
  entries: readonly InventoryEntry[];
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-neutral-12 text-sm font-medium">{props.component}</h3>
        <p className="text-neutral-11 text-xs">{props.entries.length} call sites</p>
        {props.summary ? (
          <div className="text-neutral-11 max-w-prose text-xs">{props.summary}</div>
        ) : null}
      </div>
      <ul className="flex flex-col">
        {props.entries.map(entry => (
          <li
            key={entry.source}
            className="border-neutral-5 flex flex-col gap-0.5 border-b py-2 last:border-b-0"
          >
            <span className="flex items-center gap-1.5">
              <OriginTag origin={entry.origin} />
              <code className="text-neutral-11 font-mono text-xs">{entry.source}</code>
            </span>
            <span className="text-neutral-10 text-xs">
              {entry.what}
              {entry.coveredBy ? ` — covered by "${entry.coveredBy}"` : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

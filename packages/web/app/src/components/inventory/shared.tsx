import { type ReactNode } from 'react';
import * as shared from '@/styles/shared.css';
import { inventorySharedStyles } from './shared.css';

/**
 * Shared furniture for the inventory previews in this folder.
 *
 * Each preview here transcribes every real call site of a legacy `ui/` component queued for
 * migration to `primitives/`, rendering the **old** component as it ships today. That gives a "before"
 * to judge a replacement against, and a coverage checklist to migrate through.
 *
 * These live outside `primitives/` on purpose: they import the old components, and `primitives/`
 * should not grow edges into the legacy `ui/` components even in preview files.
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
    <div className={shared.stack.gap3}>
      <div className={shared.stack.gap1}>
        <span className={inventorySharedStyles.source}>
          <OriginTag origin={props.origin} />
          <code className={inventorySharedStyles.sourcePath}>{props.source}</code>
        </span>
        {props.note ? <p className={inventorySharedStyles.note}>{props.note}</p> : null}
      </div>
      {props.children}
    </div>
  );
}

/** Several call sites that share a shape, shown together under one heading. */
export function CallSiteGroup(props: { label: string; children: ReactNode }) {
  return (
    <section className={shared.stack.gap6}>
      <h3 className={inventorySharedStyles.groupTitle}>{props.label}</h3>
      {props.children}
    </section>
  );
}

/**
 * Where the call site's component comes from. `ui` is the legacy folder still to migrate. `base`
 * marks a site that has already migrated: it is listed so the inventory stays a complete count, and
 * so the preview shows the thing that actually ships there. `raw` is a site that uses no component
 * at all, a hand-built element doing the same job, which a round has to fold in or rule out.
 */
export type Origin = 'ui' | 'base' | 'raw';

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

/** Origin tag, so a migrated or hand-built site is not mistaken for a legacy one when skimming. */
export function OriginTag(props: { origin: Origin }) {
  return (
    <span
      className={
        {
          ui: inventorySharedStyles.origin.ui,
          base: inventorySharedStyles.origin.base,
          raw: inventorySharedStyles.origin.raw,
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
    <div className={inventorySharedStyles.list}>
      <div className={inventorySharedStyles.listHeader}>
        <h3 className={inventorySharedStyles.groupTitle}>{props.component}</h3>
        <p className={inventorySharedStyles.listCount}>{props.entries.length} call sites</p>
        {props.summary ? <div className={inventorySharedStyles.note}>{props.summary}</div> : null}
      </div>
      <ul className={shared.stack.base}>
        {props.entries.map(entry => (
          <li key={entry.source} className={inventorySharedStyles.entry}>
            <span className={inventorySharedStyles.source}>
              <OriginTag origin={entry.origin} />
              <code className={inventorySharedStyles.entryPath}>{entry.source}</code>
            </span>
            <span className={inventorySharedStyles.entryNote}>
              {entry.what}
              {entry.coveredBy ? ` — covered by "${entry.coveredBy}"` : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

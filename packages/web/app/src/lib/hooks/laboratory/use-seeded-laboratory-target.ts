import { useEffect, useState } from 'react';
import { migrateLegacyLaboratoryStorage } from '@/lib/laboratory-legacy-storage';
import { normalizeTargetEnv, prepareSnapshot, seedTarget } from '@/lib/laboratory-snapshot';

let legacyMigrated = false;

/**
 * Seeds the target's lab state from the old shared session before the lab mounts, so a mounted
 * lab can never write over a seed in progress. True once `targetId` is ready to mount.
 * `targetSlug` is `org/project/target`.
 */
export function useSeededLaboratoryTarget(targetId: string | null, targetSlug: string): boolean {
  const [seededTargetId, setSeededTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) {
      return;
    }

    let cancelled = false;

    if (!legacyMigrated) {
      migrateLegacyLaboratoryStorage();
      legacyMigrated = true;
    }
    prepareSnapshot();

    // A failed seed still mounts: the next visit fills whatever is missing.
    void seedTarget(targetId, targetSlug).then(() => {
      if (cancelled) {
        return;
      }

      normalizeTargetEnv(targetId, targetSlug);

      setSeededTargetId(targetId);
    });

    return () => {
      cancelled = true;
    };
  }, [targetId, targetSlug]);

  return targetId !== null && seededTargetId === targetId;
}

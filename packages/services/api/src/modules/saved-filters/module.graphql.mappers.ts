import type { SavedFilter } from '../../shared/entities';

export type SavedFilterMapper = SavedFilter & {
  targetId?: string;
  orgId?: string;
};

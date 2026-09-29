import { z } from 'zod';

// Every key declared: a navigation that writes one of them keeps the rest, where zod would strip
// what it does not know.
export const ExplorerSearch = z.object({
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  meta: z.string().optional().catch(undefined),
  subgraph: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
});

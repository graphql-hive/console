import { z } from 'zod';

const InsightsClientFilter = z.object({
  name: z.string(),
  versions: z.array(z.string()).nullable().default(null),
});

export const InsightsFilterSearch = z.object({
  operations: z.array(z.string()).optional().catch(undefined),
  clients: z.array(InsightsClientFilter).optional().catch(undefined),
  excludeOperations: z.boolean().optional().catch(undefined),
  excludeClients: z.boolean().optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  viewId: z.string().optional().catch(undefined),
});

export type InsightsFilterState = z.infer<typeof InsightsFilterSearch>;

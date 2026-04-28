import { z } from 'zod';

export const AlertActivitySearch = z.object({
  severities: z.array(z.string()).optional().catch(undefined),
  types: z.array(z.string()).optional().catch(undefined),
  createdByIds: z.array(z.string()).optional().catch(undefined),
});

export type AlertActivitySearchState = z.infer<typeof AlertActivitySearch>;

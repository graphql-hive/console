import { z } from 'zod';

/**
 * Webhook payload definition for schema change notifications.
 */
export const SchemaChangeNotification = z.object({
  endpoint: z.string().nonempty(),
  event: z.object({
    organization: z.object({
      id: z.string().nonempty(),
      cleanId: z.string().nonempty(),
      slug: z.string().nonempty(),
      name: z.string().nonempty(),
    }),
    project: z.object({
      id: z.string().nonempty(),
      cleanId: z.string().nonempty(),
      slug: z.string().nonempty(),
      name: z.string().nonempty(),
    }),
    target: z.object({
      id: z.string().nonempty(),
      cleanId: z.string().nonempty(),
      slug: z.string().nonempty(),
      name: z.string().nonempty(),
    }),
    schema: z.object({
      id: z.string().nonempty(),
      valid: z.boolean(),
      commit: z.string().nonempty(),
    }),
    changes: z.array(z.any()),
    errors: z.array(z.any()),
  }),
});

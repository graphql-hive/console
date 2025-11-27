import { z } from 'zod';
import { declareWorkflow, workflow } from '../kit';

export const schemaChangeNotification = declareWorkflow({
  name: 'schemaChangeNotification',
  schema: z.object({
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
  }),
});

export const register = workflow(schemaChangeNotification, async args => {
  await args.step.run({ name: 'send-webhook' }, async () => {});
});

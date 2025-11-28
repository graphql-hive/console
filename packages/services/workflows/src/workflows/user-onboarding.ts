import { z } from 'zod';
import { defineWorkflow, implementWorkflow } from '../workflows.js';

export const UserOnboardingWorkflow = defineWorkflow({
  name: 'userOnboarding',
  schema: z.object({
    organizationId: z.string(),
    userId: z.string(),
  }),
});

export const task = implementWorkflow(UserOnboardingWorkflow, async args => {
  await args.steps.run(
    {
      id: 'step1',
      output: z.void(),
    },
    async () => {
      args.logger.info('STEP 1');
    },
  );

  // await args.steps.sleep('wait-ten-seconds', 10_000);

  // await args.steps.run(
  //   {
  //     id: 'step2',
  //     output: z.void(),
  //   },
  //   async () => {
  //     args.logger.info('foo bars');
  //   },
  // );

  const [a, b] = await Promise.all([
    args.steps.run(
      {
        id: 'step3',
        output: z.object({ email: z.string() }),
      },
      async () => {
        args.logger.info('step 3');
        return { email: 'foo@bars.de' };
      },
    ),
    args.steps.run(
      {
        id: 'step4',
        output: z.object({
          id: z.string(),
        }),
      },
      async () => {
        args.logger.info('step 4');

        return { id: '123' };
      },
    ),
  ]);

  args.logger.info(`YOOO! the workflow run is finished! ${a?.email} -> ${b?.id}`);
});

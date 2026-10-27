import { z } from 'zod';
import { ProjectManager } from '../../../project/providers/project-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

const AlertChannelNameModel = z.string().min(1).max(100);
const SlackChannelNameModel = z.string().min(1).max(80);

export const addAlertChannel: NonNullable<MutationResolvers['addAlertChannel']> = async (
  _,
  { input },
  { injector },
) => {
  const AddAlertChannelModel = z.object({
    slack: z.object({ channel: SlackChannelNameModel }).nullish(),
    webhook: z.object({ endpoint: z.string().url().max(500) }).nullish(),
    name: AlertChannelNameModel,
  });

  const result = AddAlertChannelModel.safeParse(input);

  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;

    return {
      error: {
        message: 'Please check your input.',
        inputErrors: {
          slackChannel: errors.slack?.[0],
          webhookEndpoint: errors.webhook?.[0],
          name: errors.name?.[0],
        },
      },
    };
  }

  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
  ]);

  return {
    ok: {
      updatedProject: await injector.get(ProjectManager).getProject({
        organizationId: organizationId,
        projectId: projectId,
      }),
      addedAlertChannel: await injector.get(AlertsManager).addChannel({
        organizationId,
        projectId,
        name: input.name,
        type: input.type,
        slackChannel: input.slack?.channel,
        webhookEndpoint: input.webhook?.endpoint,
      }),
    },
  };
};

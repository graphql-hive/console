import { z } from 'zod';
import { ProjectManager } from '../../../project/providers/project-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

const AlertChannelNameModel = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters long');
const SlackChannelNameModel = z
  .string()
  .min(1, 'Slack channel is required, e.g. #alerts')
  .max(80, 'Slack channel must be at most 80 characters long');
const WebhookEndpointModel = z
  .url('Must be a valid URL, e.g. https://example.com/webhook')
  .max(500, 'URL must be at most 500 characters long');

export const addAlertChannel: NonNullable<MutationResolvers['addAlertChannel']> = async (
  _,
  { input },
  { injector },
) => {
  const AddAlertChannelModel = z.object({
    slack: z.object({ channel: SlackChannelNameModel }).nullish(),
    webhook: z.object({ endpoint: WebhookEndpointModel }).nullish(),
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

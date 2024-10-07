import { z } from 'zod';
import { createTask } from '../../lib/utils.js';

export const sendSlackMessageTask = createTask(
  z.object({
    channel: z.string(),
    message: z.string(),
  }),
  async function slackTask(payload, helpers) {
    helpers.logger.info('Sending a slack message', {
      channel: payload.channel,
    });
  },
);

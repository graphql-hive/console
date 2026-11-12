import { z } from 'zod';

/** What a channel's name and destination may be; shared by the add and update mutations. */
export const AlertChannelNameModel = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters long');
export const SlackChannelNameModel = z
  .string()
  .min(1, 'Slack channel is required, e.g. #alerts')
  .max(80, 'Slack channel must be at most 80 characters long');
export const WebhookEndpointModel = z
  .url('Must be a valid URL, e.g. https://example.com/webhook')
  .max(500, 'URL must be at most 500 characters long');

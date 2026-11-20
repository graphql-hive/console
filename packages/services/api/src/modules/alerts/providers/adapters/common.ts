import type { SchemaChangeType } from '@hive/storage';
import type * as Types from '../../../../__generated__/types';
import type {
  Alert,
  AlertChannel,
  Organization,
  Project,
  Target,
} from '../../../../shared/entities';
import type { Logger } from '../../../shared/providers/logger';
import {
  deliveryOutcome,
  UNEXPECTED_ERROR,
  type DeliveryOutcome,
  type DescribeDeliveryError,
} from '../delivery-recorder';

interface NotificationIntegrations {
  slack: {
    token: string | null | undefined;
  };
}

export interface SchemaChangeNotificationInput {
  event: {
    organization: Pick<Organization, 'id' | 'slug' | 'name'> & {
      // For backwards compatibility
      // We moved away from cleanId and replaced it with slug
      cleanId: string;
    };
    project: Pick<Project, 'id' | 'slug' | 'name'> & {
      // For backwards compatibility
      // We moved away from cleanId and replaced it with slug
      cleanId: string;
    };
    target: Pick<Target, 'id' | 'slug' | 'name'> & {
      // For backwards compatibility
      // We moved away from cleanId and replaced it with slug
      cleanId: string;
    };
    schema: {
      id: string;
      commit: string;
      valid: boolean;
    };
    changes: Array<SchemaChangeType>;
    messages: string[];
    errors: Types.SchemaError[];
    initial: boolean;
  };
  alert: Alert;
  channel: AlertChannel;
  integrations: NotificationIntegrations;
}

export interface ChannelConfirmationInput {
  event: {
    /** `updated` is a destination change: the new destination is told like a created one. */
    kind: 'created' | 'deleted' | 'updated';
    organization: Pick<Organization, 'id' | 'slug' | 'name'> & {
      // For backwards compatibility
      // We moved away from cleanId and replaced it with slug
      cleanId: string;
    };
    project: Pick<Project, 'id' | 'slug' | 'name'> & {
      // For backwards compatibility
      // We moved away from cleanId and replaced it with slug
      cleanId: string;
    };
  };
  channel: AlertChannel;
  integrations: NotificationIntegrations;
}

export const TEST_NOTIFICATION_TIMEOUT_MS = 10_000;

export interface TestNotificationInput {
  organization: Pick<Organization, 'id' | 'slug' | 'name'>;
  project: Pick<Project, 'id' | 'slug' | 'name'>;
  destination: string;
  idempotencyKey: string | null;
  integrations: NotificationIntegrations;
}

export interface CommunicationAdapter {
  sendSchemaChangeNotification(input: SchemaChangeNotificationInput): Promise<void>;
  sendChannelConfirmation(input: ChannelConfirmationInput): Promise<void>;
  /** Null when the destination accepted the test; otherwise how it failed. */
  sendTestNotification(input: TestNotificationInput): Promise<DeliveryOutcome | null>;
}

/** Masks unrecognised errors, as `DeliveryRecorder.track` does for a recorded delivery. */
export async function attemptTestNotification(
  logger: Logger,
  send: () => Promise<unknown>,
  describeError: DescribeDeliveryError,
): Promise<DeliveryOutcome | null> {
  try {
    await send();
    return null;
  } catch (error) {
    const outcome = describeError(error);
    if (outcome) {
      return outcome;
    }
    logger.warn('Test notification failed unexpectedly (error=%s)', String(error));
    return deliveryOutcome(null, UNEXPECTED_ERROR);
  }
}

export function testNotificationText(projectLink: string): string {
  return `This is a test notification from GraphQL Hive for your ${projectLink} project.`;
}

export function slackCoderize(msg: string): string {
  return quotesTransformer(msg, '`');
}

export function quotesTransformer(msg: string, symbols = '**') {
  const findSingleQuotes = /'([^']+)'/gim;
  const findDoubleQuotes = /"([^"]+)"/gim;

  function transform(_: string, value: string) {
    return `${symbols}${value}${symbols}`;
  }

  return msg.replace(findSingleQuotes, transform).replace(findDoubleQuotes, transform);
}

export const createMDLink = ({ text, url }: { text: string; url: string }) => {
  return `[${text}](${url})`;
};

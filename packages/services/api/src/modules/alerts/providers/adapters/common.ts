import type { SchemaChangeType } from '@hive/storage';
import type * as Types from '../../../../__generated__/types';
import type {
  Alert,
  AlertChannel,
  Organization,
  Project,
  Target,
} from '../../../../shared/entities';

interface NotificationIntegrations {
  slack: {
    token: string | null | undefined;
  };
  teams?: {
    webhookUrl: string;
  };
}

export interface SchemaChangeNotificationInput {
  event: {
    organization: Pick<Organization, 'id' | 'cleanId' | 'name'>;
    project: Pick<Project, 'id' | 'cleanId' | 'name'>;
    target: Pick<Target, 'id' | 'cleanId' | 'name'>;
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
    kind: 'created' | 'deleted';
    organization: Pick<Organization, 'id' | 'cleanId' | 'name'>;
    project: Pick<Project, 'id' | 'cleanId' | 'name'>;
  };
  channel: AlertChannel;
  integrations: NotificationIntegrations;
}

export interface CommunicationAdapter {
  sendSchemaChangeNotification(input: SchemaChangeNotificationInput): Promise<void>;
  sendChannelConfirmation(input: ChannelConfirmationInput): Promise<void>;
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

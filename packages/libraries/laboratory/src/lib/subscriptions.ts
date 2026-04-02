import {
  createClient as createSSEClient,
  type ExecutionResult as SSEExecutionResult,
} from 'graphql-sse';
import { createClient as createGraphQLWSClient, type ExecutionResult } from 'graphql-ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import type { LaboratorySettings } from './settings';

type SubscriptionProtocol = LaboratorySettings['subscriptions']['protocol'];

type SubscriptionRequest = {
  query: string;
  variables?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

type SubscriptionSink = {
  next: (result: ExecutionResult | SSEExecutionResult) => void;
  error: (error: Error) => void;
  complete: () => void;
};

export function getSubscriptionUrl(endpoint: string, protocol: SubscriptionProtocol): string {
  const url = new URL(endpoint);

  if (protocol === 'WS' || protocol === 'LEGACY_WS') {
    if (url.protocol === 'https:') {
      url.protocol = 'wss:';
    } else if (url.protocol === 'http:') {
      url.protocol = 'ws:';
    }
  }

  return url.toString();
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unexpected subscription error.');
}

function createSSESubscriptionExecutor(
  endpoint: string,
  headers: Record<string, string>,
  singleConnection: boolean,
) {
  const client = createSSEClient({
    url: endpoint,
    singleConnection,
    headers,
  });

  return {
    subscribe(request: SubscriptionRequest, sink: SubscriptionSink) {
      const unsubscribe = client.subscribe(request, {
        next: sink.next,
        error: error => sink.error(normalizeError(error)),
        complete: sink.complete,
      });

      return () => {
        unsubscribe();
        client.dispose();
      };
    },
  };
}

function createLegacyWSSubscriptionExecutor(endpoint: string, headers: Record<string, string>) {
  const client = new SubscriptionClient(endpoint, {
    reconnect: false,
    lazy: true,
    connectionParams: headers,
  });

  return {
    subscribe(request: SubscriptionRequest, sink: SubscriptionSink) {
      const subscription = client.request(request).subscribe({
        next: sink.next,
        error: error => sink.error(normalizeError(error)),
        complete: sink.complete,
      });

      return () => {
        subscription.unsubscribe();
        client.close(false, false);
      };
    },
  };
}

function createWSSubscriptionExecutor(endpoint: string, headers: Record<string, string>) {
  const client = createGraphQLWSClient({
    url: endpoint,
    connectionParams: headers,
  });

  return {
    subscribe(request: SubscriptionRequest, sink: SubscriptionSink) {
      const unsubscribe = client.subscribe(request, {
        next: sink.next,
        error: error => sink.error(normalizeError(error)),
        complete: sink.complete,
      });

      return () => {
        unsubscribe();
        void client.dispose();
      };
    },
  };
}

export function createSubscriptionExecutor(args: {
  endpoint: string;
  protocol: SubscriptionProtocol;
  headers: Record<string, string>;
}) {
  const subscriptionUrl = getSubscriptionUrl(args.endpoint, args.protocol);

  switch (args.protocol) {
    case 'SSE':
      return createSSESubscriptionExecutor(subscriptionUrl, args.headers, false);
    case 'GRAPHQL_SSE':
      return createSSESubscriptionExecutor(subscriptionUrl, args.headers, true);
    case 'LEGACY_WS':
      return createLegacyWSSubscriptionExecutor(subscriptionUrl, args.headers);
    case 'WS':
    default:
      return createWSSubscriptionExecutor(subscriptionUrl, args.headers);
  }
}

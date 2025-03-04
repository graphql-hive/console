import type { FastifyInstance } from 'fastify';
import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { env } from '@/env/backend';
import { graphql } from '@/gql';
import { FetchJsonErrors } from '@/lib/fetch-json';
import { Kit } from '@/lib/kit';
import { SlackAPI } from '@/lib/slack-api';
import * as Sentry from '@sentry/node';
import { graphqlRequest } from './utils';

const SlackIntegration_addSlackIntegration = graphql(/* GraphQL */ `
  mutation SlackIntegration_addSlackIntegration($input: AddSlackIntegrationInput!) {
    addSlackIntegration(input: $input)
  }
`);

const sentryTagsComponentLevel = {
  component: 'slack',
};

export function connectSlack(server: FastifyInstance) {
  // ----------------------------------
  // Callback
  // ----------------------------------

  const CallBackQuery = z.object({
    code: z.string({
      required_error: 'Invalid code',
    }),
    state: z.string({
      required_error: 'Invalid state',
    }),
  });

  server.get('/api/slack/callback', async (req, res) => {
    const sentryTagsRouteLevel = {
      ...sentryTagsComponentLevel,
      route: '/api/slack/callback',
    };

    if (env.slack === null) {
      const error = new SlackIntegrationErrors.DisabledError({});
      Sentry.captureException(error, { tags: sentryTagsRouteLevel });
      throw error;
    }

    const queryResult = CallBackQuery.safeParse(req.query);

    if (!queryResult.success) {
      const error = new SlackIntegrationErrors.SlackDefectCallbackSearchParametersError({
        fieldErrors: queryResult.error.flatten().fieldErrors,
      });
      Sentry.captureException(error, {
        level: 'warning',
        tags: sentryTagsRouteLevel,
        extra: error.context,
      });
      req.log.warn(error.context, error.message);
      void res.status(400).send(error.context.fieldErrors);
      return;
    }

    const { code, state: organizationId } = queryResult.data;

    req.log.info('Fetching data from Slack API (orgId=%s)', organizationId);

    const slackResult = await SlackAPI.requestOauth2Access({
      clientId: env.slack.clientId,
      clientSecret: env.slack.clientSecret,
      code,
    });

    if (
      slackResult instanceof FetchJsonErrors.FetchJsonRequestNetworkError ||
      slackResult instanceof FetchJsonErrors.FetchJsonRequestTypeError
    ) {
      const error = new SlackIntegrationErrors.SlackAPIRequestError(
        { organizationId },
        slackResult,
      );
      Sentry.captureException(error, {
        level: 'error',
        tags: sentryTagsRouteLevel,
        extra: error.context,
      });
      throw error;
    }

    if (slackResult instanceof FetchJsonErrors.FetchJsonResponseError) {
      const error = new SlackIntegrationErrors.SlackDefectResponseError(
        { organizationId },
        slackResult,
      );
      Sentry.captureException(error, {
        level: 'warning',
        tags: sentryTagsRouteLevel,
        extra: {
          ...error.context,
          cause: slackResult.cause.message,
        },
      });
      req.log.warn(error.context, error.message);
      void res.status(400).send(error.message);
      return;
    }

    if (!slackResult.ok) {
      const error = new SlackIntegrationErrors.TokenRetrieveError({
        organizationId,
        slackErrorMessage: slackResult.error,
      });
      Sentry.captureException(error, {
        level: 'warning',
        tags: sentryTagsRouteLevel,
        extra: error.context,
      });
      req.log.warn(error.context, error.message);
      void res.status(400).send(slackResult.error);
      return;
    }

    const resultGraphql = await graphqlRequest({
      url: env.graphqlPublicEndpoint,
      headers: {
        ...req.headers,
        'content-type': 'application/json',
        'graphql-client-name': 'Hive App',
        'graphql-client-version': env.release,
      },
      operationName: 'SlackIntegration_addSlackIntegration',
      document: SlackIntegration_addSlackIntegration,
      variables: {
        input: {
          organizationSlug: organizationId,
          token: slackResult.access_token,
        },
      },
    });

    if (resultGraphql.errors) {
      const resultGraphqlAggError = new Kit.Errors.TypedAggregateError([...resultGraphql.errors]);
      const error = new SlackIntegrationErrors.APIRequestError(
        { organizationId },
        resultGraphqlAggError,
      );
      req.log.error(error.context, error.message);
      // todo: add base error type with contextChain property
      for (const errorCause of error.cause.errors) {
        req.log.error(errorCause);
      }
      throw error;
    }

    void res.redirect(`/${organizationId}/view/settings`);
  });

  // ----------------------------------
  // Connect
  // ----------------------------------

  const ConnectParams = z.object({
    organizationSlug: z.string({
      required_error: 'Invalid organizationSlug',
    }),
  });

  server.get('/api/slack/connect/:organizationSlug', async (req, res) => {
    req.log.info('Connect to Slack');

    if (env.slack === null) {
      req.log.error('The Slack integration is not enabled.');
      throw new Error('The Slack integration is not enabled.');
    }

    const paramsResult = ConnectParams.safeParse(req.params);
    if (!paramsResult.success) {
      void res.status(400).send(paramsResult.error.flatten().fieldErrors);
      return;
    }

    const { organizationSlug } = paramsResult.data;
    req.log.info('Connect organization to Slack (id=%s)', organizationSlug);

    void res.redirect(
      SlackAPI.createOauth2AuthorizeUrl({
        clientId: env.slack.clientId,
        redirectUrl: `${env.appBaseUrl}/api/slack/callback`,
        scopes: ['incoming-webhook', 'chat:write', 'chat:write.public', 'commands'],
        state: organizationSlug,
      }),
    );
  });
}

// =================================
// Error Classes
// =================================

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SlackIntegrationErrors {
  export class DisabledError extends Kit.Errors.ContextualError<'DisabledError'> {
    message = 'The Slack integration is not enabled.';
  }

  export class APIRequestError extends Kit.Errors.ContextualError<
    'APIRequestError',
    { organizationId: string },
    Kit.Errors.TypedAggregateError<GraphQLError>
  > {
    message = 'API request to add Slack integration failed.';
  }

  export class SlackDefectCallbackSearchParametersError extends Kit.Errors.ContextualError<
    'SlackDefectCallbackSearchParametersError',
    { fieldErrors: Record<string, string[]> }
  > {
    message = 'Received invalid search parameters from Slack API.';
  }

  export class SlackAPIRequestError extends Kit.Errors.ContextualError<
    'SlackAPIRequestError',
    { organizationId: string },
    FetchJsonErrors.FetchJsonRequestErrors
  > {
    message = 'Request to Slack API failed.';
  }

  export class TokenRetrieveError extends Kit.Errors.ContextualError<
    'TokenRetrieveError',
    {
      organizationId: string;
      slackErrorMessage: string;
    }
  > {
    message = 'Failed to retrieve access token from Slack API.';
  }

  export class SlackDefectResponseError extends Kit.Errors.ContextualError<
    'SlackDefectResponseError',
    { organizationId: string },
    FetchJsonErrors.FetchJsonResponseErrors
  > {
    message = 'Received invalid response from Slack API.';
  }
}

import type { SignatureValidator } from './auth';
import { parseIncomingRequest } from './models';
import { Logger } from './types';

/**
 * gatherResponse awaits and returns a response body as a string.
 */
async function gatherResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('json')) {
    return JSON.stringify(await response.json());
  }
  if (contentType.includes('application/text')) {
    return response.text();
  }
  if (contentType.startsWith('text/')) {
    return response.text();
  }
  return response.text();
}

export async function handleRequest(
  request: Request,
  keyValidator: SignatureValidator,
  logger: Logger,
  requestId: string,
) {
  logger.info(`Received request with id ${requestId}`);
  const parsedRequest = await parseIncomingRequest(request, keyValidator, logger);

  if ('error' in parsedRequest) {
    return parsedRequest.error;
  }

  logger.info(`Forwarding request to ${parsedRequest.method} ${parsedRequest.url}`);

  const init: Parameters<typeof fetch>[1] =
    parsedRequest.method === 'GET'
      ? {
          method: 'GET',
          headers: {
            ...parsedRequest.headers,
            'x-hive-request-id': requestId,
            'user-agent': 'Hive Request Broker',
          },
          signal: request.signal,
          redirect: 'follow',
        }
      : {
          method: 'POST',
          body: parsedRequest.body,
          headers: {
            ...parsedRequest.headers,
            'x-hive-request-id': requestId,
            'user-agent': 'Hive Request Broker',
          },
          signal: request.signal,
          redirect: 'follow',
        };
  const response = await fetch(parsedRequest.url, init).catch(error => {
    logger.error(`Failed to forward request to ${parsedRequest.url}`, error);
    return Promise.reject(error);
  });

  logger.info(
    `Received response from ${parsedRequest.url} with status ${response.status} (${response.statusText}}`,
  );

  const resolveResponseBody =
    'resolveResponseBody' in parsedRequest
      ? parsedRequest.resolveResponseBody // POST requests default to true
      : parsedRequest.method === 'GET'; // GET requests are always true;

  const text = resolveResponseBody
    ? await gatherResponse(response).catch(error => {
        logger.error(`Failed to collect response body from ${parsedRequest.url}`, error);
        return Promise.reject(error);
      })
    : 'No response body as requested by the client (resolveResponseBody: false)';
  logger.info(`Collected response body from ${parsedRequest.url} (length=${text.length})`);
  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'content-type': 'text/plain',
      'user-agent': 'Hive Broker',
    },
  });
}

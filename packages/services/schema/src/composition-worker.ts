import * as crypto from 'node:crypto';
import type { MessagePort } from 'node:worker_threads';
// IMPORTANT: Must use "type" to avoid runtime dependency
import type { FastifyBaseLogger } from 'fastify';
import type { Logger } from '@hive/api';
import { CompositionResponse } from './api';
import { createComposeFederation, type ComposeFederationArgs } from './composition/federation';
import { composeSingle, type ComposeSingleArgs } from './composition/single';
import { composeStitching, type ComposeStitchingArgs } from './composition/stitching';
import type { env } from './environment';

export function createCompositionWorker(args: {
  baseLogger: Logger;
  port: MessagePort;
  env: typeof env;
}) {
  const baseLogger = args.baseLogger.child({
    source: 'CompositionWorker',
  });

  const decrypt = decryptFactory(args.env.encryptionSecret);

  process.on('unhandledRejection', function (err) {
    console.error('unhandledRejection', err);
    throw err;
  });

  args.port.on('message', async (message: CompositionEvent) => {
    const logger = baseLogger.child({
      taskId: message.taskId,
      reqId: message.requestId,
      messageId: message.id,
      event: message.event,
    });
    logger.debug('processing message');

    try {
      if (message.event === 'composition') {
        if (message.data.type === 'federation') {
          const composeFederation = createComposeFederation({
            decrypt,
            logger: baseLogger.child({ reqId: message.data.args.requestId }) as FastifyBaseLogger,
            requestTimeoutMs: args.env.timings.schemaExternalCompositionTimeout,
          });
          const composed = await composeFederation(message.data.args);

          args.port.postMessage({
            event: 'compositionResult',
            id: message.id,
            data: {
              type: message.data.type,
              result: {
                errors: composed.result.errors ?? [],
                sdl: composed.result.sdl ?? null,
                supergraph: composed.result.supergraph ?? null,
                includesNetworkError: composed.result.includesNetworkError === true,
                contracts:
                  composed.result.contracts?.map(contract => ({
                    id: contract.id,
                    errors: 'errors' in contract.result.result ? contract.result.result.errors : [],
                    sdl: contract.result.result.sdl ?? null,
                    supergraph: contract.result.result.supergraph ?? null,
                  })) ?? null,
                tags: composed.result.tags ?? null,
                schemaMetadata: composed.result.schemaMetadata ?? null,
                metadataAttributes: composed.result.metadataAttributes ?? null,
                includesException: composed.result.includesException === true,
              },
            },
          } satisfies CompositionResultEvent);
          return;
        }

        if (message.data.type === 'single') {
          const result = await composeSingle(message.data.args);
          args.port.postMessage({
            event: 'compositionResult',
            id: message.id,
            data: {
              type: message.data.type,
              result,
            },
          } satisfies CompositionResultEvent);
          return;
        }

        if (message.data.type === 'stitching') {
          const result = await composeStitching(message.data.args);
          args.port.postMessage({
            event: 'compositionResult',
            id: message.id,
            data: {
              type: message.data.type,
              result,
            },
          } satisfies CompositionResultEvent);
          return;
        }
        assertAllCasesExhausted(message.data);
        return;
      }
      assertAllCasesExhausted(message.event);
    } catch (err: unknown) {
      baseLogger.error(
        'unexpected error while processing message in worker (messageId=%s)',
        message.id,
      );
      baseLogger.error(String(err));
      args.port.postMessage({
        event: 'error',
        id: message.id,
        err,
      });
    }
  });

  process.on('exit', function (code) {
    console.log('exit', code);
  });
}

export type CompositionEvent = {
  id: string;
  event: 'composition';
  requestId: string;
  taskId: string;
  data:
    | {
        type: 'federation';
        args: ComposeFederationArgs;
      }
    | {
        type: 'single';
        args: ComposeSingleArgs;
      }
    | {
        type: 'stitching';
        args: ComposeStitchingArgs;
      };
};

export type CompositionResultEvent = {
  id: string;
  event: 'compositionResult';
  data: {
    type: 'federation' | 'single' | 'stitching';
    result: CompositionResponse & {
      includesException?: boolean;
    };
  };
};

function decryptFactory(encryptionSecret: string) {
  const ENCRYPTION_SECRET = crypto.createHash('md5').update(encryptionSecret).digest('hex');

  const ALG = 'aes256';
  const IN_ENC = 'utf8';
  const OUT_ENC = 'hex';

  const secretBuffer = Buffer.from(ENCRYPTION_SECRET, 'latin1');

  return function decrypt(text: string) {
    const components = text.split(':');
    const iv = Buffer.from(components.shift() || '', OUT_ENC);
    const decipher = crypto.createDecipheriv(ALG, secretBuffer, iv);

    return decipher.update(components.join(':'), OUT_ENC, IN_ENC) + decipher.final(IN_ENC);
  };
}

function assertAllCasesExhausted(value: never) {
  throw new Error(`Not all cases are exhaused. Value '${value}'.`);
}

import { http, URL } from '@graphql-hive/core';
import { Flags } from '@oclif/core';
import Command from '../../base-command';
import {
  HTTPError,
  isAggregateError,
  MissingCdnEndpointError,
  MissingCdnKeyError,
  NetworkError,
  UnexpectedError,
} from '../../helpers/errors';

export default class ArtifactsFetch extends Command<typeof ArtifactsFetch> {
  static description = 'fetch artifacts from the CDN';
  static flags = {
    'cdn.endpoint': Flags.string({
      description: 'CDN endpoint',
    }),
    'cdn.accessToken': Flags.string({
      description: 'CDN access token',
    }),
    artifact: Flags.string({
      description: 'artifact to fetch (Note: supergraph is only available for federation projects)',
      options: ['sdl', 'supergraph', 'metadata', 'services', 'sdl.graphql', 'sdl.graphqls'],
      required: true,
    }),
    outputFile: Flags.string({
      description: 'whether to write to a file instead of stdout',
    }),
  };

  async run() {
    const { flags } = await this.parse(ArtifactsFetch);

    let cdnEndpoint: string, token: string;
    try {
      cdnEndpoint = this.ensure({
        key: 'cdn.endpoint',
        args: flags,
        env: 'HIVE_CDN_ENDPOINT',
        description: ArtifactsFetch.flags['cdn.endpoint'].description!,
      });
    } catch (e) {
      throw new MissingCdnEndpointError();
    }

    try {
      token = this.ensure({
        key: 'cdn.accessToken',
        args: flags,
        env: 'HIVE_CDN_ACCESS_TOKEN',
        description: ArtifactsFetch.flags['cdn.accessToken'].description!,
      });
    } catch (e) {
      throw new MissingCdnKeyError();
    }

    const requestId = crypto.randomUUID();
    const artifactType = flags.artifact;

    const url = new URL(`${cdnEndpoint}/${artifactType}`);

    let response;
    try {
      response = await http.get(url.toString(), {
        headers: {
          'x-hive-cdn-key': token,
          'User-Agent': `hive-cli/${this.config.version}`,
          'x-request-id': requestId,
        },
        retry: {
          retries: 3,
        },
        logger: {
          info: (...args) => {
            if (this.flags.debug) {
              console.info(...args);
            }
          },
          error: (...args) => {
            if (this.flags.debug) {
              console.error(...args);
            }
          },
        },
      });
    } catch (e: any) {
      const sourceError = e?.cause ?? e;
      if (isAggregateError(sourceError)) {
        throw new NetworkError(sourceError.errors[0]?.message, requestId);
      } else {
        throw new NetworkError(sourceError, requestId);
      }
    }

    if (!response.ok) {
      const responseBody = await response.text();
      throw new HTTPError(
        url.toString(),
        response.status,
        responseBody ?? response.statusText ?? 'Invalid status code for HTTP call',
        requestId,
      );
    }

    try {
      if (flags.outputFile) {
        const fs = await import('fs/promises');
        const contents = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(flags.outputFile, contents);
        this.log(`Wrote ${contents.length} bytes to ${flags.outputFile}`);
        return;
      }

      this.log(await response.text());
    } catch (e) {
      throw new UnexpectedError(e);
    }
  }
}

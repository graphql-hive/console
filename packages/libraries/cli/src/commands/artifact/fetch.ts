import { http, URL } from '@graphql-hive/core';
import { Flags } from '@oclif/core';
import Command from '../../base-command';
import { OutputDefinitions } from '../../output-definitions';
import { Output } from '../../output/__';

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
  static output = [
    OutputDefinitions.SuccessOutputStdout,
    Output.defineSuccess('SuccessOutputFile', {
      data: Output.Types.OutputToFile.properties,
      text(_, data, t) {
        t.line(`Wrote ${data.bytes} bytes to ${data.path}`);
      },
    }),
  ];

  async runResult() {
    const { flags } = await this.parse(ArtifactsFetch);

    const cdnEndpoint = this.ensure({
      key: 'cdn.endpoint',
      args: flags,
      env: 'HIVE_CDN_ENDPOINT',
    });

    const token = this.ensure({
      key: 'cdn.accessToken',
      args: flags,
      env: 'HIVE_CDN_ACCESS_TOKEN',
    });

    const artifactType = flags.artifact;

    const url = new URL(`${cdnEndpoint}/${artifactType}`);

    const response = await http.get(url.toString(), {
      headers: {
        'x-hive-cdn-key': token,
        'User-Agent': `hive-cli/${this.config.version}`,
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
          console.error(...args);
        },
      },
    });

    if (response.status >= 300) {
      const responseBody = await response.text();
      throw new Error(responseBody);
    }

    if (flags.outputFile) {
      const fs = await import('fs/promises');
      const contents = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(flags.outputFile, contents);
      return this.success({
        type: 'SuccessOutputFile',
        path: flags.outputFile,
        bytes: contents.length,
      });
    }

    return this.success({
      type: 'SuccessOutputStdout',
      content: await response.text(),
    });
  }
}

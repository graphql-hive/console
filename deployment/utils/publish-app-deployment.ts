import { local } from '@pulumi/command';
import { Secret } from '@pulumi/kubernetes/core/v1';
import { Resource } from '@pulumi/pulumi';
import * as pulumi from '@pulumi/pulumi';
import { ClickhouseConnectionSecret } from '../services/clickhouse';
import { ServiceDeployment } from './service-deployment';

const dockerImage = 'ghcr.io/graphql-hive/cli:0.49.0';

/** Publish API GraphQL schema to Hive schema registry. */
export function publishAppDeployment(args: {
  appName: string;
  registry: { accessToken: pulumi.Output<string>; endpoint: string; target: string };
  version: {
    commit: string;
  };
  persistedDocumentsPath: string;
  wakeupClickhouse: {
    clickhouse: ClickhouseConnectionSecret;
    dockerSecret: Secret;
  } | null;
  dependsOn?: Array<Resource>;
}) {
  // Step 0: Wake up ClickHouse on staging and dev
  let wakeupCommandJob = args.wakeupClickhouse
    ? new ServiceDeployment(
        'wake-up-clickhouse',
        {
          image: 'alpine/curl',
          imagePullSecret: args.wakeupClickhouse.dockerSecret,
          command: [
            'curl',
            // wait a maximum amount of 40 seconds (according to docs it takes 30 seconds for waking up)
            '--max-time',
            '60',
            '$(CLICKHOUSE_PROTOCOL)://$(CLICKHOUSE_USERNAME):$(CLICKHOUSE_PASSWORD)@$(CLICKHOUSE_HOST):$(CLICKHOUSE_PORT)?query=SELECT%201',
          ],
        },
        args.dependsOn,
      )
        .withSecret('CLICKHOUSE_PROTOCOL', args.wakeupClickhouse.clickhouse, 'protocol')
        .withSecret('CLICKHOUSE_HOST', args.wakeupClickhouse.clickhouse, 'host')
        .withSecret('CLICKHOUSE_PORT', args.wakeupClickhouse.clickhouse, 'port')
        .withSecret('CLICKHOUSE_USERNAME', args.wakeupClickhouse.clickhouse, 'username')
        .withSecret('CLICKHOUSE_PASSWORD', args.wakeupClickhouse.clickhouse, 'password')
        .deployAsJob().job
    : null;

  // Step 1: Create app deployment
  const createCommand = new local.Command(
    `create-app-deployment-${args.appName}`,
    {
      create: args.registry.accessToken.apply(
        accessToken =>
          `docker run --name "create-app-deployment-${args.appName}"` +
          ` --rm -v ${args.persistedDocumentsPath}:/usr/src/app/persisted-documents.json` +
          ` ${dockerImage}` +
          ` app:create` +
          ` --registry.endpoint ${args.registry.endpoint} --registry.accessToken ${accessToken} --target ${args.registry.target}` +
          ` --name ${args.appName} --version ${args.version.commit} ./persisted-documents.json`,
      ),
    },
    {
      dependsOn: [wakeupCommandJob, ...(args.dependsOn || [])].filter(v => v !== null),
    },
  );

  // Step 2: Publish app deployment
  return new local.Command(
    `publish-app-deployment-${args.appName}`,
    {
      create: args.registry.accessToken.apply(
        accessToken =>
          `docker run --rm --name "publish-app-deployment-${args.appName}"` +
          ` ${dockerImage}` +
          ` app:publish` +
          ` --registry.endpoint ${args.registry.endpoint} --registry.accessToken ${accessToken} --target ${args.registry.target} --service graphql --url https://api.graphql-hive.com/graphql` +
          ` --name ${args.appName} --version ${args.version.commit}`,
      ),
    },
    {
      dependsOn: createCommand,
    },
  );
}

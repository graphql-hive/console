import { local } from '@pulumi/command';
import type { GraphQL } from '../services/graphql';

const dockerImage = 'ghcr.io/graphql-hive/cli:0.44.4';

/** Publish API GraphQL schema to Hive schema registry. */
export function publishGraphQLSchema(args: {
  graphql: GraphQL;
  registry: { accessToken: string; endpoint: string };
  version: {
    commit: string;
  };
  schemaPath: string;
}) {
  const command =
    `schema:publish` +
    ` --registry.endpoint ${args.registry.endpoint} --registry.accessToken ${args.registry.accessToken}` +
    ` --commit ${args.version.commit} --author "Hive CD" ./schema.graphqls`;

  return new local.Command(
    'publish-graphql-schema',
    {
      create:
        `docker run --name "publish-graphql-schema" -v ${args.schemaPath}:/usr/src/app/schema.graphqls ${dockerImage} ` +
        command,
    },
    {
      dependsOn: [args.graphql.deployment, args.graphql.service],
    },
  );
}

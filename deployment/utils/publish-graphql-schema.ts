import { local } from '@pulumi/command';
import * as pulumi from '@pulumi/pulumi';
import type { GraphQL } from '../services/graphql';

const dockerImage = 'ghcr.io/graphql-hive/cli:0.49.0';

/** Publish API GraphQL schema to Hive schema registry. */
export function publishGraphQLSchema(args: {
  graphql: GraphQL;
  registry: { accessToken: pulumi.Output<string>; endpoint: string; target: string };
  version: {
    commit: string;
  };
  schemaPath: string;
}) {
  const command = (accessToken: string) =>
    `schema:publish` +
    ` --registry.endpoint ${args.registry.endpoint} --registry.accessToken ${accessToken} --target ${args.registry.target}` +
    ` --commit ${args.version.commit} --author "Hive CD" ./schema.graphqls`;

  return new local.Command(
    'publish-graphql-schema',
    {
      create: args.registry.accessToken.apply(
        accessToken =>
          `docker run --name "publish-graphql-schema" -v ${args.schemaPath}:/usr/src/app/schema.graphqls ${dockerImage} ` +
          command(accessToken),
      ),
    },
    {
      dependsOn: [args.graphql.deployment, args.graphql.service],
    },
  );
}

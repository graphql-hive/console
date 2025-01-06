import { concatAST, print } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';

export * as SchemaHive from '../gql/graphql';

export async function loadSchema(
  file: string,
  options?: {
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
  },
) {
  const sources = await loadTypedefs(file, {
    ...options,
    cwd: process.cwd(),
    loaders: [new CodeFileLoader(), new GraphQLFileLoader(), new JsonFileLoader(), new UrlLoader()],
  });

  return print(concatAST(sources.map(_ => _.document!)));
}

export function minifySchema(schema: string): string {
  return schema.replace(/\s+/g, ' ').trim();
}

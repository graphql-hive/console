/* eslint-disable tailwindcss/no-custom-classname */
import { ReactElement } from 'react';
import { Callout, Code } from '@theguild/components';

type CLIError = {
  code: string;
  title: string;
  example: string;
  exampleOutput: string;
  fix: string;
};

export function ErrorDetails(props: CLIError): ReactElement {
  return (
    <>
      <h3
        id={`errors-${props.code}`}
        className="mt-8 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        {props.code} "{props.title}"{' '}
        <a
          href={`#errors-${props.code}`}
          className="nextra-focus subheading-anchor"
          aria-label="Permalink for this error code"
        />
      </h3>
      <h4 className="mt-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Example: <Code>{props.example}</Code>
      </h4>
      <Callout type="default" emoji=">">
        <pre>{props.exampleOutput}</pre>
      </Callout>
      <h4
        id={`errors-${props.code}-fix`}
        className="mt-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        Suggested Fix
      </h4>
      <p>{props.fix}</p>
    </>
  );
}

export async function getErrorDescriptions(): Promise<CLIError[]> {
  const examples: Array<{
    instance: { code: string; message: string; name: string };
    example: string;
    fix: string;
  }> = [
    // @note: cannot import the actual errors due to missing internal node modules.
    //   But structure it as if we can for the future.

    // { instance: new errors.APIError('Something went wrong', '12345'), ...}
    {
      instance: {
        name: 'InvalidConfigError',
        code: '100',
        message: 'The provided "hive.json" is invalid.',
      },
      example: 'hive schema:fetch',
      fix: 'A configuration file was found but the format does not match what is expected. See https://github.com/graphql-hive/console/blob/main/packages/libraries/cli/README.md#config-file-hivejson for structure details and try updating to the latest version if contents appear valid.',
    },
    {
      instance: {
        name: 'InvalidCommandError',
        code: '101',
        message: 'The command, "badcommand", does not exist.',
      },
      example: 'hive badcommand',
      fix: 'Use "hive help" for a list of available commands.',
    },
    {
      instance: {
        name: 'MissingArgumentsError',
        code: '102',
        message: 'Missing 1 required argument:\nSERVICE  name of the service',
      },
      example: 'hive schema:delete',
      fix: 'Use "hive help [command]" for usage details.',
    },
    {
      instance: {
        name: 'MissingRegistryTokenError',
        code: '103',
        message:
          'A registry token is required to perform the action. For help generating an access token, see https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens',
      },
      example: "HIVE_TOKEN='' hive schema:fetch",
      fix: 'A registry token can be set using the environment variable "HIVE_TOKEN", argument "--registry.accessToken", or config file "hive.json". For help generating a token, see https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens',
    },
    {
      instance: {
        name: 'MissingCdnKeyError',
        code: '104',
        message:
          'A CDN key is required to perform the action. For help generating a CDN key, see https://the-guild.dev/graphql/hive/docs/management/targets#cdn-access-tokens',
      },
      example: 'hive artifact:fetch --artifact sdl',
      fix: 'A CDN key can be set using the argument "--cdn.accessToken" or config file "hive.json". For help generating a CDN key, see https://the-guild.dev/graphql/hive/docs/management/targets#cdn-access-tokens',
    },
    {
      instance: {
        name: 'MissingEndpointError',
        code: '105',
        message: 'A registry endpoint is required to perform the action.',
      },
      example: 'hive schema:delete --registry.endpoint= foo-service',
      fix: 'A registry endpoint is used when self hosting Hive, otherwise, use the default. The registry endpoint can be set using the environment variable "HIVE_REGISTRY", or argument "--registry.endpoint".',
    },
    {
      instance: {
        name: 'InvalidRegistryTokenError',
        code: '106',
        message:
          'A valid registry token is required to perform the action. The registry token used does not exist or has been revoked.',
      },
      example: 'HIVE_TOKEN=badtoken hive schema:fetch',
      fix: 'A registry token can be set using the environment variable "HIVE_TOKEN", argument "--registry.accessToken", or config file "hive.json". For help generating a token, see https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens',
    },
    {
      instance: {
        name: 'InvalidCdnKeyError',
        code: '107',
        message:
          'A valid CDN key is required to perform the action. The CDN key used does not exist or has been revoked.',
      },
      example: 'hive artifact:fetch --artifact sdl',
      fix: 'A CDN key can be set using the argument "--cdn.accessToken" or config file "hive.json". For help generating a CDN key, see https://the-guild.dev/graphql/hive/docs/management/targets#cdn-access-tokens',
    },
    {
      instance: {
        name: 'MissingCdnEndpointError',
        code: '108',
        message: 'A CDN endpoint is required to perform the action.',
      },
      example: "HIVE_CDN_ENDPOINT='' hive artifact:fetch",
      fix: 'A registry endpoint is used when self hosting Hive, otherwise, use the default. This error can happen if the CDN endpoint is set to an empty string. To set the CDN endpoint, use the argument "--cdn.endpoint" or environment variable "HIVE_CDN_ENDPOINT"',
    },
    {
      instance: {
        name: 'MissingEnvironmentError',
        code: '109',
        message:
          'Missing required environment variable:\nGITHUB_REPOSITORY  Github repository full name, e.g. graphql-hive/console',
      },
      example: "GITHUB_REPOSITORY='' hive schema:publish --author=username --commit=sha",
      fix: 'If using the github integration, then a github repository must be set. This is provided by the default Github workflow and typically does not need manually set. For more information about the Github integration, see https://the-guild.dev/graphql/hive/docs/other-integrations/ci-cd',
    },
    {
      instance: {
        name: 'SchemaFileNotFoundError',
        code: '200',
        message: 'Error reading the schema file "${fileName}"',
      },
      example: 'hive schema:check FILE',
      fix: "Verify the file path is correct. For help generating a schema file, see your implemented GraphQL library's documentation.",
    },
    {
      instance: {
        name: 'SchemaFileEmptyError',
        code: '201',
        message: 'The schema file "schema.graphql" is empty.',
      },
      example: 'hive schema:check schema.graphql',
      fix: "Verify the file path and file contents are correct. For help generating a schema file, see your implemented GraphQL library's documentation.",
    },
    {
      instance: {
        name: 'GithubCommitRequiredError',
        code: '110',
        message: "Couldn't resolve commit sha required for GitHub Application.",
      },
      example: 'hive schema:check FILE --github',
      fix: 'Make sure the command is called within a valid git project. To use the Github integration, there must be at a commit in the history to reference. The commit sha is set as the schema version in the registry and is used for change approvals and other features. See https://the-guild.dev/graphql/hive/docs/management/organizations#github for more details about this integration.',
    },
    {
      instance: {
        name: 'GithubRepositoryRequiredError',
        code: '111',
        message: "Couldn't resolve git repository required for GitHub Application.",
      },
      example: 'hive schema:check FILE --github',
      fix: 'Make sure the command is called within a valid git project. See https://the-guild.dev/graphql/hive/docs/management/organizations#github for more details about this integration.',
    },
    {
      instance: {
        name: 'GithubAuthorRequiredError',
        code: '112',
        message: "Couldn't resolve commit author required for GitHub Application.",
      },
      example: 'hive schema:check FILE --github',
      fix: 'Make sure the command is called within a valid git project. See https://the-guild.dev/graphql/hive/docs/management/organizations#github for more details about this integration.',
    },
    {
      instance: {
        name: 'SchemaPublishFailedError',
        code: '300',
        message: 'Schema publish failed.',
      },
      example: 'hive schema:publish schema.graphql',
      fix: 'The schema failed checks during publish. If this is an older project, you may still be able to publish using the "--force" flag. "--force" is enabled by default for new projects. For more details about the schema registry behavior, see https://the-guild.dev/graphql/hive/docs/schema-registry',
    },
    {
      instance: {
        name: 'HTTPError',
        code: '113',
        message:
          'A server error occurred while performing the action. A call to "${endpoint}" failed with Status: 500, Text: Server Unavailable.',
      },
      example: 'hive schema:fetch',
      fix: 'Check your network connection and verify the value if using a custom CDN or registry endpoint. If the error status is >= 500, then there may be an issue with the Hive servers. Check the Hive service status for available details https://status.graphql-hive.com/ and if the issue persists then contact The Guild support.',
    },
    {
      instance: {
        name: 'NetworkError',
        code: '114',
        message:
          'A network error occurred while performing the action: "${cause instanceof Error ? `${cause.name}: ${cause.message}` : cause}"',
      },
      example: 'hive schema:fetch',
      fix: 'Check your network connection and verify the value if using a custom CDN or registry endpoint.',
    },
    {
      instance: {
        name: 'APIError',
        code: '115',
        message: 'Something went wrong. (Request ID: "12345678")',
      },
      example: 'hive schema:check --service foo schema.graphql',
      fix: 'The operation was executed but an error response was returned from the API call. Follow the recommendation in the returned error message.',
    },
    {
      instance: {
        name: 'IntrospectionError',
        code: '116',
        message:
          'Could not get introspection result from the service. Make sure introspection is enabled by the server.',
      },
      example: 'hive dev --remote --service reviews --url http://localhost:3001/graphql',
      fix: 'Schema contents are required to perform composition. Either the URL provided must respond to to the request: "query { _service { sdl } }" to provide its schema, or a the SDL can be provided locally using the "--schema" argument.',
    },
    {
      instance: {
        name: 'InvalidSDLError',
        code: '301',
        message: "The SDL is not valid at line 0, column 1:\n Unexpected token '{'",
      },
      example: 'hive schema:publish schema.graphql',
      fix: 'There is a syntax error in the SDL. Correct the syntax error mentioned and try again. If there are multiple syntax errors, only one may be mentioned at a time.',
    },
    {
      instance: {
        name: 'SchemaPublishMissingServiceError',
        code: '302',
        message: 'The schema failed to publish. Please use the "--service <name>" parameter.',
      },
      example: 'hive schema:publish schema.graphql --url https://foo.service',
      fix: 'A service name and url are required when publishing a subgraph schema.',
    },
    {
      instance: {
        name: 'SchemaPublishMissingUrlError',
        code: '303',
        message: 'The schema failed to publish. Please use the "--url <url>" parameter.',
      },
      example: 'hive schema:publish schema.graphql --service foo',
      fix: 'A service name and url are required when publishing a subgraph schema.',
    },
    {
      instance: {
        name: 'InvalidDocumentsError',
        code: '700',
        message: 'Invalid operation syntax:\n - [reason]',
      },
      example: 'hive operations:check operations/*.gql',
      fix: 'Operations must be valid graphql. Address the operation syntax errors and then try again.',
    },
    {
      instance: {
        name: 'ServiceAndUrlLengthMismatch',
        code: '600',
        message: 'Not every services has a matching url. Got 2 services and 1 url.',
      },
      example:
        'hive dev \n--service reviews --url http://localhost:3001/graphql \n--service products',
      fix: 'Composition requires a service and url pair per subgraph. Make sure both are provided for every subgraph using the "--service" and "--url" arguments. ',
    },
    {
      instance: {
        name: 'LocalCompositionError',
        code: '601',
        message: 'Local composition failed:\n[reason]',
      },
      example:
        'hive dev \n--service reviews --url http://localhost:3001/graphql \n--service products --url http://localhost:3002/graphql',
      fix: 'The provided schemas are not composable. This means that there are conflicting types between the two subgraphs. Review the provided reason to help determine the best path forward for the subgraph(s).',
    },
    {
      instance: {
        name: 'RemoteCompositionError',
        code: '602',
        message: 'Remote composition failed:\nDetected 1 error\n- [reason]',
      },
      example:
        'hive dev --remote\n--service reviews --url http://localhost:3001/graphql \n--service products --url http://localhost:3002/graphql',
      fix: 'The provided schemas are not composable. This means that there are conflicting types between the two subgraphs. Review the provided reason to help determine the best path forward for the subgraph(s).',
    },
    {
      instance: {
        name: 'InvalidCompositionResultError',
        code: '603',
        message: 'Composition resulted in an invalid supergraph: [supergraph]',
      },
      example:
        'hive dev --remote\n--service reviews --url http://localhost:3001/graphql \n--service products --url http://localhost:3002/graphql',
      fix: 'Composition passed but the resulting supergraph SDL was invalid. If using an external schema composer, verify the logic and make sure the version of federation being used is supported by Hive.',
    },
    {
      instance: {
        name: 'PersistedOperationsMalformedError',
        code: '400',
        message: 'Persisted Operations file "operations.json" is malformed.',
      },
      example: 'hive app:create --name ios --version 1.0.0 operations.json',
      fix: 'The operations JSON could not be parsed and validated. Check for and address any syntax errors in this file.',
    },
    {
      instance: {
        name: 'UnsupportedFileExtensionError',
        code: '117',
        message: 'Got unsupported file extension: ".foo"',
      },
      example: 'hive introspect LOCATION --write schema.foo',
      fix: 'The file extension indicates the format to write. Try specifying one of the supported formats. Use "hive [command] help" for more information about the command\'s input.',
    },
    {
      instance: {
        name: 'FileMissingError',
        code: '118',
        message: 'Failed to load file "undefined"',
      },
      example: 'hive app:create undefined',
      fix: 'The file specified does not exist or cannot be read. Check that the path is correct.',
    },
    {
      instance: {
        name: 'InvalidFileContentsError',
        code: '119',
        message:
          'File "schema.json" could not be parsed. Please make sure the file is readable and contains a valid [expectedFormat].',
      },
      example: 'hive app:create schema.json',
      fix: 'The file specified may not be valid JSON. Check that the file specified is correct and valid.',
    },
    {
      instance: { name: 'SchemaNotFoundError', code: '500', message: 'No schema found.' },
      example: 'hive schema:fetch --registry.accessToken=*** 12345',
      fix: 'The actionId does not have a schema associated with it. Verify the action ID or do not provide an action ID to fetch the latest version.',
    },
    {
      instance: { name: 'InvalidSchemaError', code: '501', message: 'Schema is invalid.' },
      example: 'hive schema:fetch --registry.accessToken=*** 12345',
      fix: 'The action ID is associated with an invalid schema. Try another action ID.',
    },
    {
      instance: {
        name: 'UnexpectedError',
        code: '199',
        message: 'An unexpected error occurred: ${message}\n> Enable DEBUG=* for more details.',
      },
      example: 'hive schema:fetch --registry.accessToken=*** 12345',
      fix: 'An issue occurred during execution that was not expected. Enable DEBUG=* to view debug logs which may provide more insight into the cause.',
    },
  ];
  return examples
    .sort((a, b) => a.instance.code?.localeCompare(b.instance.code!) ?? 0)
    .map(
      (e): CLIError => ({
        title: e.instance.name.replace(/([a-z])([A-Z])/g, '$1 $2'),
        code: e.instance.code ?? 'n/a',
        exampleOutput: e.instance.message,
        example: e.example,
        fix: e.fix,
      }),
    );
}

export async function CLIErrorsSection() {
  const cliErrors = await getErrorDescriptions();
  return (
    <>
      {cliErrors.map(item => (
        <ErrorDetails key={item.code} {...item} />
      ))}
    </>
  );
}

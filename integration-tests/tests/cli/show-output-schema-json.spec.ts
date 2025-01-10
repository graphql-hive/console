import { exec, ExecArgs, ExecCommandPath, execFormat } from '../../testkit/cli';
import { cliOutputSnapshotSerializer } from '../../testkit/cli-snapshot-serializer';

expect.addSnapshotSerializer(cliOutputSnapshotSerializer);

interface TestCase {
  command: ExecCommandPath;
  args?: ExecArgs;
}

// prettier-ignore
const testCases: TestCase[] = [
  { command: 'whoami' },
  // todo: future PRs
  // { command: 'schema:publish' },
  // { command: 'schema:check' },
  // { command: 'schema:delete' },
  // { command: 'schema:fetch' },
  // { command: 'app:create' },
  // { command: 'app:publish' },
];

test.each(testCases)('--show-output-schema-json - %s', async ({ command, args }) => {
  const cmdFormatted = execFormat(command, { ...args, 'show-output-schema-json': '' });
  const [outputText, outputJson] = await Promise.all([
    exec(cmdFormatted),
    exec(`${cmdFormatted} --json`),
  ]);

  // The --json flag should not change the output when viewing the schema.
  //
  expect(outputText).toMatch(outputJson);

  // Parse and capture the output as a nicely
  // formatted JSON file for easier viewing.
  //
  const schema = JSON.parse(outputText);
  await expect(JSON.stringify(schema, null, 2)).toMatchFileSnapshot(
    `./__snapshots__/show-output-schema-json/${command.replace(':', '__')}.json`,
  );
});

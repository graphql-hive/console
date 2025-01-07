import { argsToExecFormat, exec, ExecCommandPath } from '../../testkit/cli';
import { test } from '../../testkit/test';
import { SnapshotSerializers } from './__snapshot_serializers__/__';

expect.addSnapshotSerializer(SnapshotSerializers.cliOutput);

interface TestCase {
  command: ExecCommandPath;
  args?: Record<string, string>;
}

// prettier-ignore
const testCases: TestCase[] = [
  { command: 'whoami' },
  { command: 'schema:publish' },
  { command: 'schema:check' },
  { command: 'schema:delete' },
  { command: 'schema:fetch' },
  { command: 'app:create' },
  { command: 'app:publish' },
];

test.each(testCases)('--show-output-schema-json - %s', async ({ command, args }) => {
  const preparedCommand = `${command} ${argsToExecFormat(args)} --show-output-schema-json`;
  const [outputText, outputJson] = await Promise.all([
    exec(preparedCommand),
    exec(`${preparedCommand} --json`),
  ]);
  expect(outputText).toMatch(outputJson); // --json flag does not change the output
  const schema = JSON.parse(outputText);
  await expect(outputText).toMatchSnapshot();
  await expect(JSON.stringify(schema, null, 2)).toMatchFileSnapshot(
    `./__snapshots__/show-output-schema-json/${command.replace(':', '__')}.json`,
  );
});

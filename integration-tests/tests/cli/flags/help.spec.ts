import { ExecCommandPath, execHive } from '../../../testkit/cli';
import { CliOutputSnapshot } from '../../../testkit/cli-output-snapshot';

expect.addSnapshotSerializer(CliOutputSnapshot.serializer);

interface TestCase {
  command: ExecCommandPath;
}

// prettier-ignore
const testCases: TestCase[] = [
  { command: 'whoami' },
  { command: 'artifact:fetch' },
  { command: 'operations:check' },
  { command: 'dev' },
  { command: 'introspect' },
  { command: 'schema:publish' },
  { command: 'schema:check' },
  { command: 'schema:delete' },
  { command: 'schema:fetch' },
  { command: 'app:create' },
  { command: 'app:publish' },
];

test.each(testCases)('--help - %s', async ({ command }) => {
  const [text, json] = await Promise.all([
    execHive(command, { help: true }),
    execHive(command, { help: true, json: true }),
  ]);

  // The --json flag should not change the output when viewing help.
  //
  expect(text).toMatch(json);

  expect(text).toMatchSnapshot();
});

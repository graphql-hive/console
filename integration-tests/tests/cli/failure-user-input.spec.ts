import { ExecCommandPath, execHive } from '../../testkit/cli';
import { cliOutputSnapshotSerializer } from '../../testkit/cli-snapshot-serializer';

expect.addSnapshotSerializer(cliOutputSnapshotSerializer);

interface TestCase {
  command: ExecCommandPath;
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

test.each(testCases)('FailureUserInput - %s', async ({ command }) => {
  const [text, json] = await Promise.allSettled([
    execHive(command, {}),
    execHive(command, { json: true }),
  ]);
  expect(text).toMatchSnapshot('OUTPUT FORMAT: TEXT');
  expect(json).toMatchSnapshot('OUTPUT FORMAT: JSON');
});

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

test.each(testCases)('FailureUserInput - %s', async ({ command, args }) => {
  const cmdFormatted = execFormat(command, args);
  await expect(exec(cmdFormatted)).rejects.toMatchSnapshot('OUTPUT FORMAT: TEXT');

  const cmdJsonFormatted = `${cmdFormatted} --json`;
  await expect(exec(cmdJsonFormatted)).rejects.toMatchSnapshot('OUTPUT FORMAT: JSON');
});

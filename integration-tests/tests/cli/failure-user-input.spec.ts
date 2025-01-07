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

test.each(testCases)('FailureUserInput - %s', async ({ command, args }) => {
  const preparedCommand = `${command} ${argsToExecFormat(args)}`;
  await expect(exec(preparedCommand)).rejects.toMatchSnapshot('OUTPUT FORMAT: TEXT');
  const preparedCommandJson = `${preparedCommand} --json`;
  await expect(exec(preparedCommandJson)).rejects.toMatchSnapshot('OUTPUT FORMAT: JSON');
});

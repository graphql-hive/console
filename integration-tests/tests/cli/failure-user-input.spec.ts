import { exec } from '../../testkit/cli';
import { test } from '../../testkit/test';
import { SnapshotSerializers } from './__snapshot_serializers__/__';

expect.addSnapshotSerializer(SnapshotSerializers.cliOutput);

interface TestCase {
  command:
    | 'whoami'
    | 'schema:publish'
    | 'schema:check'
    | 'schema:delete'
    | 'schema:fetch'
    | 'app:create'
    | 'app:publish';
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
  const preparedArgs = args
    ? Object.entries(args)
        .map(([key, value]) => `--${key}=${value}`)
        .join(' ')
    : '';
  const preparedCommand = `${command} ${preparedArgs}`;
  await expect(exec(preparedCommand)).rejects.toMatchSnapshot('OUTPUT FORMAT: TEXT');
  const preparedCommandJson = `${preparedCommand} --json`;
  await expect(exec(preparedCommandJson)).rejects.toMatchSnapshot('OUTPUT FORMAT: JSON');
});

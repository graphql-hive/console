import { ExecCommandPath, execHive } from '../../../testkit/cli';
import { cliOutputSnapshotSerializer } from '../../../testkit/cli-output-snapshot';

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

test.each(testCases)('--show-output-schema-json - %s', async ({ command }) => {
  const [text, json] = await Promise.all([
    execHive(command, { 'show-output-schema-json': true }),
    execHive(command, { 'show-output-schema-json': true, json: true }),
  ]);

  // The --json flag should not change the output when viewing the schema.
  //
  expect(text).toMatch(json);

  // The output should be valid JSON.
  //
  expect(() => JSON.parse(text)).not.toThrow();

  // Snapshot a nicely formatted JSON file for easy review.
  //
  const fileName = `${command.replace(':', '__')}.schema.json`;
  const fileContent = JSON.stringify(JSON.parse(text), null, 2);
  await expect(fileContent).toMatchFileSnapshot(
    `./__snapshots__/show-output-schema-json/${fileName}`,
  );
});

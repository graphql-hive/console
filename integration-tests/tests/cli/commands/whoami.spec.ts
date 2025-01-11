import { execHive } from 'testkit/cli';
import { CliOutputSnapshot } from '../../../testkit/cli-output-snapshot';
import { initSeed } from '../../../testkit/seed';

CliOutputSnapshot.valueCleaners.push(
  /((?:name|target|project|organization): +)[a-z]+/gi,
  /((?:name|slug)": ")[a-z]+(")/gi,
);

expect.addSnapshotSerializer(CliOutputSnapshot.serializer);

const command = 'whoami';
let args = {};

beforeEach(async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret } = await createTargetAccessToken({});
  args = {
    'registry.accessToken': secret,
  };
});

test('shows viewer info', async ({ expect }) => {
  const [text, json] = await Promise.allSettled([
    execHive(command, args),
    execHive(command, { ...args, json: true }),
  ]);
  expect(text).toMatchSnapshot('OUTPUT FORMAT: TEXT');
  expect(json).toMatchSnapshot('OUTPUT FORMAT: JSON');
});

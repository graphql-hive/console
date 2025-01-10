import { execHive } from 'testkit/cli';
import { cliOutputSnapshotSerializer } from '../../../testkit/cli-snapshot-serializer';
import { initSeed } from '../../../testkit/seed';

expect.addSnapshotSerializer(cliOutputSnapshotSerializer);

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

import { updateSchemaComposition, waitFor } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { getServiceHost } from 'testkit/utils';
import { initSeed } from '../../testkit/seed';

const TEST_SCHEMA_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const WAIT_TIME_GC = 3000; // 3 seconds
const TEST_TIMEOUT = 60000;

async function getServerMemoryStats(): Promise<{ heapUsed: number }> {
  const registryAddress = await getServiceHost('server', 8082);
  const response = await fetch(`http://${registryAddress}/memory-stats`);
  return await response.json();
}

async function serverForceGc(): Promise<void> {
  const registryAddress = await getServiceHost('server', 8082);
  await fetch(`http://${registryAddress}/gc`, { method: 'POST' });
  await waitFor(WAIT_TIME_GC);
}

function makeLargeSchemaSDL(existingSchema: string, targetBytes: number): string {
  const parts: string[] = [existingSchema];
  let size = parts[0].length;
  let i = 0;
  while (size < targetBytes) {
    const line =
      `type Pad${i} { a: String b: String c: String d: String e: String ` +
      `f: String g: String h: String i: String j: String }`;
    parts.push(line);
    size += line.length + 1; // +1 for the join newline
    i++;
  }
  return parts.join('\n');
}

describe.sequential('Memory Leak tests (sequential)', { concurrent: false }, () => {
  test(
    'Should not retain memory when SINGLE schema check fails',
    async () => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken } = await createProject(ProjectType.Single);
      const { publishSchema, checkSchema } = await createTargetAccessToken({});

      // Start from a clean slate
      await serverForceGc();

      const initialSchema = /* GraphQL */ `
        type Query {
          me: String
        }
      `;

      const publishResult = await publishSchema({
        sdl: initialSchema,
      }).then(r => r.expectNoGraphQLErrors());
      expect(publishResult.schemaPublish.__typename).toBe('SchemaPublishSuccess');

      // Warm up for schema checks
      let checkResult = await checkSchema(initialSchema).then(r => r.expectNoGraphQLErrors());
      expect(checkResult.schemaCheck.__typename).toBe('SchemaCheckSuccess');

      // Force GC, wait a bit, check memory usage before
      await serverForceGc();
      const statsBefore = await getServerMemoryStats();
      console.log('container memory usage before schema check:', statsBefore.heapUsed, 'bytes');

      // Create super large schema and check it
      const largeSdl = makeLargeSchemaSDL(initialSchema, TEST_SCHEMA_SIZE_BYTES);
      console.log('schema size:', largeSdl.length, 'bytes');
      checkResult = await checkSchema(largeSdl).then(r => r.expectNoGraphQLErrors());
      // the reason for this failure is because the schema-service rejects it as it's too big
      // we don't really care about the issue, we just need a promise rejection while doing a schema check
      // and this is a nice way to trigger it
      expect(checkResult.schemaCheck.__typename).toBe('SchemaCheckError');

      // Check memory after schema check and GC
      await serverForceGc();
      const statsAfter = await getServerMemoryStats();
      console.log('container memory usage after schema check:', statsAfter.heapUsed, 'bytes');

      const diff = statsAfter.heapUsed - statsBefore.heapUsed;
      console.log('memory usage diff:', diff, 'bytes');

      // minor data retained is ok, but we expect it to be super low
      expect(diff).toBeLessThan(largeSdl.length);
      expect(diff).toBeLessThan(1024 * 500); // 500kb
    },
    TEST_TIMEOUT,
  );
});

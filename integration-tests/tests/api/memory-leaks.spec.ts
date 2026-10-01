import { waitFor } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { getServiceHost } from 'testkit/utils';
import { initSeed } from '../../testkit/seed';

const TEST_SCHEMA_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ITERATIONS = 3;
const WAIT_TIME_SETTLE = 3000; // 3 seconds
const TEST_TIMEOUT = 5 * 60_000;

type ServerMemoryStats = {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  passes: number;
};

/**
 * Lets async work that outlives a response settle, then makes the server collect garbage until
 * its heap stops shrinking and returns the memory usage measured right after the final pass.
 */
async function settleAndMeasure(): Promise<ServerMemoryStats> {
  await waitFor(WAIT_TIME_SETTLE);
  const registryAddress = await getServiceHost('server', 8082);
  const response = await fetch(`http://${registryAddress}/gc`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(
      `Failed to force GC on the server (status ${response.status}): ${await response.text()}. ` +
        'Is the server running with --expose-gc and EXPOSE_MEMORY_UTILS=1?',
    );
  }
  return await response.json();
}

function makeLargeSchemaSDL(existingSchema: string, targetBytes: number, variant: number): string {
  const parts: string[] = [existingSchema];
  let size = parts[0].length;
  let i = 0;
  while (size < targetBytes) {
    const line =
      `type Pad${variant}_${i} { a: String b: String c: String d: String e: String ` +
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
      const warmUpCheckResult = await checkSchema(initialSchema).then(r =>
        r.expectNoGraphQLErrors(),
      );
      expect(warmUpCheckResult.schemaCheck.__typename).toBe('SchemaCheckSuccess');

      // The schema-service rejects a schema this big.
      // We don't really care about the issue, we just need a promise rejection while doing a schema check
      // and this is a nice way to trigger it.
      async function checkLargeSchemaAndExpectFailure(variant: number) {
        // A distinct schema per check, because the schema-service caches failed compositions.
        const largeSdl = makeLargeSchemaSDL(initialSchema, TEST_SCHEMA_SIZE_BYTES, variant);
        console.log(`schema size (variant ${variant}):`, largeSdl.length, 'bytes');
        const checkResult = await checkSchema(largeSdl).then(r => r.expectNoGraphQLErrors());
        expect(checkResult.schemaCheck.__typename).toBe('SchemaCheckError');
        // Checking the same schema again makes the schema-service replay the cached failure as a
        // plain error, which rejects the composition promise inside the schema check.
        const errors = await checkSchema(largeSdl).then(r => r.expectGraphQLErrors());
        expect(errors).toHaveLength(1);
      }

      // Warm up the failing path too: its first execution allocates memory that is never released
      // but is not a leak (lazily compiled and optimized code, metric label sets), so it must not
      // land inside the measured window.
      await checkLargeSchemaAndExpectFailure(0);

      const statsBefore = await settleAndMeasure();
      console.log('server memory usage before failing schema checks:', statsBefore);

      let statsAfter = statsBefore;
      for (let i = 1; i <= ITERATIONS; i++) {
        await checkLargeSchemaAndExpectFailure(i);
        statsAfter = await settleAndMeasure();
        console.log(
          `server memory usage after failing schema check ${i}/${ITERATIONS}:`,
          statsAfter,
        );
      }

      const diff = statsAfter.heapUsed - statsBefore.heapUsed;
      console.log('heap usage diff:', diff, 'bytes');

      // Retaining the checked schemas grows the heap by at least ITERATIONS * TEST_SCHEMA_SIZE_BYTES,
      // while GC and JIT jitter stays far below a single schema. Minor retained data is ok.
      expect(diff).toBeLessThan(TEST_SCHEMA_SIZE_BYTES);
    },
    TEST_TIMEOUT,
  );
});

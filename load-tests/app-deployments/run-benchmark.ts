import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENDPOINT = process.env.REGISTRY_ENDPOINT ?? 'http://localhost:3001/graphql';
const TOKEN = process.env.REGISTRY_TOKEN ?? 'd43544cd1400e177c280afdce6876e7f';
const TARGET = process.env.TARGET ?? 'the-guild/hive/demo';
const TIMESTAMP = Math.floor(Date.now() / 1000);
const DOC_COUNTS = process.env.DOC_COUNT
  ? [parseInt(process.env.DOC_COUNT, 10)]
  : [1000];

const operations = [
  'query GetUsers { users { id name } }',
  'query GetWorld { world }',
  'query GetUsersWithAlias { allUsers: users { id name } }',
  '{ users { id } }',
  'query UsersAndWorld { users { id } world }',
];

function generateRandomHash(): string {
  return randomBytes(16).toString('hex');
}

function generateSha256Hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function generateManifest(count: number, useSha256: boolean): Record<string, string> {
  const manifest: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const baseOp = operations[i % operations.length];
    const op = `# op-${i}\n${baseOp}`;
    const hash = useSha256 ? generateSha256Hash(op) : generateRandomHash();
    manifest[hash] = op;
  }
  return manifest;
}

interface GeneratedFixtures {
  v1: { path: string; manifest: Record<string, string> };
  v2: { path: string; manifest: Record<string, string> };
  v2Delta: { path: string; manifest: Record<string, string> };
}

function generateFixtures(docCount: number): GeneratedFixtures {
  const outputDir = join(__dirname, 'fixtures');

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating fixtures for ${docCount} documents...`);

  const v1Manifest = generateManifest(docCount, false);
  const v1Path = join(outputDir, `${docCount}-docs-v1.json`);
  writeFileSync(v1Path, JSON.stringify(v1Manifest, null, 2));
  console.log(`  v1 (random hashes): ${v1Path}`);

  const v2Manifest = generateManifest(docCount, true);
  const v2Path = join(outputDir, `${docCount}-docs-v2.json`);
  writeFileSync(v2Path, JSON.stringify(v2Manifest, null, 2));
  console.log(`  v2 (sha256 hashes): ${v2Path}`);

  const NEW_DOCS = 50;
  const existingCount = docCount - NEW_DOCS;
  const v2DeltaManifest: Record<string, string> = {};

  const v2Entries = Object.entries(v2Manifest);
  for (let i = 0; i < existingCount; i++) {
    const [hash, body] = v2Entries[i];
    v2DeltaManifest[hash] = body;
  }

  for (let i = 0; i < NEW_DOCS; i++) {
    const baseOp = operations[i % operations.length];
    const op = `# op-${docCount + i}\n${baseOp}`;
    const hash = generateSha256Hash(op);
    v2DeltaManifest[hash] = op;
  }

  const v2DeltaPath = join(outputDir, `${docCount}-docs-v2-delta.json`);
  writeFileSync(v2DeltaPath, JSON.stringify(v2DeltaManifest, null, 2));
  console.log(`  v2-delta (${existingCount} existing + ${NEW_DOCS} new): ${v2DeltaPath}`);
  console.log('');

  return {
    v1: { path: v1Path, manifest: v1Manifest },
    v2: { path: v2Path, manifest: v2Manifest },
    v2Delta: { path: v2DeltaPath, manifest: v2DeltaManifest },
  };
}

interface TimingResult {
  docsUploaded: number;
  docsSkipped: number;
  totalMs: number;
  parseMs: number;
  validateMs: number;
  coordsMs: number;
  clickhouseMs: number;
  s3Ms: number;
}

const CLI_PATH = join(__dirname, '../../packages/libraries/cli/bin/dev');

function runCommand(args: string[]): Promise<TimingResult | null> {
  return new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(CLI_PATH, args, {
      stdio: ['inherit', 'pipe', 'inherit'],
      shell: true,
    });

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.on('close', code => {
      if (code === 0) {
        const timingRegex =
          /Batch timing: (\d+)ms total \((\d+) docs, parse: (\d+)ms, validate: (\d+)ms, coords: (\d+)ms, ch: (\d+)ms, s3: (\d+)ms\)/g;
        const timingMatches = [...output.matchAll(timingRegex)];

        const docsMatch = output.match(/\((\d+) new, (\d+) skipped\)/);

        if (timingMatches.length > 0 && docsMatch) {
          const totals = timingMatches.reduce(
            (acc, match) => ({
              totalMs: acc.totalMs + parseInt(match[1], 10),
              parseMs: acc.parseMs + parseInt(match[3], 10),
              validateMs: acc.validateMs + parseInt(match[4], 10),
              coordsMs: acc.coordsMs + parseInt(match[5], 10),
              clickhouseMs: acc.clickhouseMs + parseInt(match[6], 10),
              s3Ms: acc.s3Ms + parseInt(match[7], 10),
            }),
            { totalMs: 0, parseMs: 0, validateMs: 0, coordsMs: 0, clickhouseMs: 0, s3Ms: 0 },
          );

          resolve({
            docsUploaded: parseInt(docsMatch[1], 10),
            docsSkipped: parseInt(docsMatch[2], 10),
            ...totals,
          });
        } else {
          resolve(null);
        }
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

function runPublishCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLI_PATH, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `**${(ms / 1000).toFixed(1)}s**`;
  }
  return `${ms}ms`;
}

function printResultsTable(
  docCount: number,
  results: { v1: TimingResult; v2: TimingResult; v2Delta: TimingResult },
) {
  console.log('');
  console.log(`### ${docCount} Documents`);
  console.log('');
  console.log(
    '| Scenario | Docs Uploaded | Parse | Validate | Coords | ClickHouse | S3 | **Total** |',
  );
  console.log(
    '|----------|---------------|-------|----------|--------|------------|-----|-----------|',
  );

  const { v1, v2, v2Delta } = results;

  console.log(
    `| V1 Initial | ${v1.docsUploaded} | ${v1.parseMs}ms | ${v1.validateMs}ms | ${v1.coordsMs}ms | ${v1.clickhouseMs}ms | ${v1.s3Ms}ms | ${formatMs(v1.totalMs)} |`,
  );
  console.log(
    `| V2 Initial | ${v2.docsUploaded} | ${v2.parseMs}ms | ${v2.validateMs}ms | ${v2.coordsMs}ms | ${v2.clickhouseMs}ms | ${v2.s3Ms}ms | ${formatMs(v2.totalMs)} |`,
  );
  console.log(
    `| V2 Delta | ${v2Delta.docsUploaded} (${v2Delta.docsSkipped} skipped) | ${v2Delta.parseMs}ms | ${v2Delta.validateMs}ms | ${v2Delta.coordsMs}ms | ${v2Delta.clickhouseMs}ms | ${v2Delta.s3Ms}ms | ${formatMs(v2Delta.totalMs)} |`,
  );
}

async function runBenchmarkForDocCount(
  docCount: number,
): Promise<{ v1: TimingResult; v2: TimingResult; v2Delta: TimingResult } | null> {
  console.log('');
  console.log(`##########################################`);
  console.log(`#    Benchmark for ${docCount} Documents`);
  console.log(`##########################################`);
  console.log('');

  const fixtures = generateFixtures(docCount);

  const APP_NAME_V1 = `bench-v1-${docCount}-${TIMESTAMP}`;
  const APP_NAME_V2 = `bench-v2-${docCount}-${TIMESTAMP}`;

  console.log('==========================================');
  console.log('  V1 Format (Legacy, random hashes)');
  console.log('==========================================');
  console.log(`App: ${APP_NAME_V1}`);
  console.log(`Documents: ${Object.keys(fixtures.v1.manifest).length}`);
  console.log('');

  console.log('--- Initial deployment (v1) ---');
  const v1Result = await runCommand([
    'app:create',
    fixtures.v1.path,
    '--name',
    APP_NAME_V1,
    '--version',
    'v1',
    '--target',
    TARGET,
    '--registry.endpoint',
    ENDPOINT,
    '--registry.accessToken',
    TOKEN,
    '--format',
    'v1',
    '--showTiming',
  ]);

  console.log('');
  console.log('--- Publishing (v1) ---');
  await runPublishCommand([
    'app:publish',
    '--name',
    APP_NAME_V1,
    '--version',
    'v1',
    '--target',
    TARGET,
    '--registry.endpoint',
    ENDPOINT,
    '--registry.accessToken',
    TOKEN,
  ]);

  console.log('');

  console.log('==========================================');
  console.log('  V2 Format (SHA256, cross-version dedup)');
  console.log('==========================================');
  console.log(`App: ${APP_NAME_V2}`);
  console.log(`Documents: ${Object.keys(fixtures.v2.manifest).length}`);
  console.log('');

  console.log('--- Initial deployment (v2) ---');
  const v2Result = await runCommand([
    'app:create',
    fixtures.v2.path,
    '--name',
    APP_NAME_V2,
    '--version',
    'v1',
    '--target',
    TARGET,
    '--registry.endpoint',
    ENDPOINT,
    '--registry.accessToken',
    TOKEN,
    '--format',
    'v2',
    '--showTiming',
  ]);

  console.log('');
  console.log('--- Publishing (v2) ---');
  await runPublishCommand([
    'app:publish',
    '--name',
    APP_NAME_V2,
    '--version',
    'v1',
    '--target',
    TARGET,
    '--registry.endpoint',
    ENDPOINT,
    '--registry.accessToken',
    TOKEN,
  ]);

  console.log('');
  console.log('Waiting for ClickHouse sync...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('==========================================');
  console.log('  V2 Delta Upload (50 new, rest skipped)');
  console.log('==========================================');
  console.log(`App: ${APP_NAME_V2} (version v2)`);
  console.log(`Documents: ${Object.keys(fixtures.v2Delta.manifest).length}`);
  console.log('');

  console.log('--- Delta deployment (v2, 50 new + rest skipped) ---');
  const v2DeltaResult = await runCommand([
    'app:create',
    fixtures.v2Delta.path,
    '--name',
    APP_NAME_V2,
    '--version',
    'v2',
    '--target',
    TARGET,
    '--registry.endpoint',
    ENDPOINT,
    '--registry.accessToken',
    TOKEN,
    '--format',
    'v2',
    '--showTiming',
  ]);

  if (v1Result && v2Result && v2DeltaResult) {
    return { v1: v1Result, v2: v2Result, v2Delta: v2DeltaResult };
  }
  return null;
}

async function main(): Promise<void> {
  console.log('==========================================');
  console.log('    App Deployment Benchmark: v1 vs v2');
  console.log('==========================================');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Target: ${TARGET}`);
  console.log(`Document counts: ${DOC_COUNTS.join(', ')}`);

  const allResults: Array<{
    docCount: number;
    results: { v1: TimingResult; v2: TimingResult; v2Delta: TimingResult };
  }> = [];

  for (const docCount of DOC_COUNTS) {
    const results = await runBenchmarkForDocCount(docCount);
    if (results) {
      allResults.push({ docCount, results });
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('         Benchmark Complete');
  console.log('==========================================');

  if (allResults.length > 0) {
    console.log('');
    console.log('## Benchmark Results');
    for (const { docCount, results } of allResults) {
      printResultsTable(docCount, results);
    }
  } else {
    console.log('');
    console.log('Warning: Could not parse timing results from commands.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

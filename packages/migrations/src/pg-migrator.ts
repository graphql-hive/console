import {
  CommonQueryMethods,
  sql,
  type DatabasePool,
  type DatabaseTransactionConnection,
  type SqlTaggedTemplate,
  type TaggedTemplateLiteralInvocation,
} from 'slonik';

export type MigrationExecutor = {
  name: string;
  /**
   * Run the database migration outside a transaction.
   * E.g. if you want to set a costly index or need to run any other costly SQL that would block the database users too long.
   **/
  noTransaction?: true;
  /**
   * You can either return a SQL query to run or instead use the connection within the function to run custom logic.
   * You can also return an array of named steps so you can see the progress in the logs.
   */
  run: (args: { connection: CommonQueryMethods; sql: SqlTaggedTemplate }) =>
    | Promise<void>
    | TaggedTemplateLiteralInvocation
    | Array<{
        name: string;
        query: TaggedTemplateLiteralInvocation;
      }>;
};

const seedMigrationsIfNotExists = async (args: { connection: DatabaseTransactionConnection }) => {
  await args.connection.query(sql`
    CREATE TABLE IF NOT EXISTS "public"."migration" (
      "name" text NOT NULL,
      "hash" text NOT NULL,
      "date" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "migration_pkey" PRIMARY KEY (name)
    );
  `);
};

async function runMigration(connection: CommonQueryMethods, migration: MigrationExecutor) {
  const exists = await connection.maybeOneFirst(sql`
    SELECT true
    FROM
      "public"."migration"
    WHERE
      "name" = ${migration.name}
  `);

  if (exists === true) {
    return;
  }

  const startTime = Date.now();
  console.log(`Running migration: ${migration.name}`);

  const result = await migration.run({ connection, sql });
  if (Array.isArray(result)) {
    for (const item of result) {
      console.log(`  Starting step ${item.name}`);
      const startTime = Date.now();
      await connection.query(item.query);
      const finishTime = Date.now();
      const delta = finishTime - startTime;
      console.log(`  Finished in ${convertMsToTime(delta)}`);
    }
  } else if (result) {
    await connection.query(result);
  }

  // TODO: hash verification (but tbh nobody cares about that)
  await connection.query(sql`
    INSERT INTO "public"."migration" ("name", "hash")
    VALUES (${migration.name}, ${migration.name});
  `);
  const finishTime = Date.now();
  const delta = finishTime - startTime;

  console.log(`Finished in ${convertMsToTime(delta)}`);
}

export async function runMigrations(args: {
  slonik: DatabasePool;
  migrations: Array<MigrationExecutor>;
  runTo?: string;
}) {
  console.log('Running PG migrations.');

  await seedMigrationsIfNotExists({ connection: args.slonik });

  for (const migration of args.migrations) {
    if (migration.noTransaction === true) {
      await runMigration(args.slonik, migration);
    } else {
      await args.slonik.transaction(connection => runMigration(connection, migration));
    }

    if (args.runTo && args.runTo === migration.name) {
      console.log(`reached migration '${migration.name}'. Stopping.`);
      break;
    }
  }

  console.log('Done.');
}

function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}

function convertMsToTime(milliseconds: number) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  if (hours === 0) {
    if (minutes === 0) {
      return `${padTo2Digits(seconds)}s`;
    }

    return `${padTo2Digits(minutes)}:${padTo2Digits(seconds)}min`;
  }

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}h`;
}

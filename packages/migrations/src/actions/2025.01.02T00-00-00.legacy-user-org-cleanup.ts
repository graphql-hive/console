import { z } from 'zod';
import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.01.02T00-00-00.legacy-user-org-cleanup.ts',
  // we do not run this in a transaction as each user processing delete takes around 300ms.
  // and we do not want to mess with live traffic.
  noTransaction: true,
  async run({ sql, connection }) {
    const userIds = await connection
      .anyFirst(
        sql`
          SELECT
            "id"
          FROM
            "users"
          WHERE
            "supertoken_user_id" IS NULL  
        `,
      )
      .then(value => z.array(z.string()).parse(value));
    console.log(`${userIds.length} legacy user(s) found.`);

    const total = userIds.length;
    const padAmount = String(total).length;
    let counter = 0;

    for (const userId of userIds) {
      const start = Date.now();
      console.log(
        `processing userId="${userId}" (${counter.toPrecision().padStart(padAmount, '0')}/${total})`,
      );
      // ON DELETE SET null constraint is missing, so we need to first update it manually
      await connection.query(sql`
        UPDATE
          "organizations"
        SET
          "ownership_transfer_user_id" = NULL
        WHERE
          "ownership_transfer_user_id" = ${userId}
      `);
      // Delete the organizations of these users
      await connection.query(sql`
        DELETE
        FROM
          "organizations"
        WHERE
          "user_id" = ${userId}
      `);
      await connection.query(sql`
        DELETE
        FROM
          "users"
        WHERE
          "id" = ${userId}
      `);
      console.log(`finished after ${msToTime(Date.now() - start)}`);
      counter++;
    }
  },
} satisfies MigrationExecutor;

function msToTime(duration: number) {
  let milliseconds: string | number = Math.floor((duration % 1000) / 100),
    seconds: string | number = Math.floor((duration / 1000) % 60),
    minutes: string | number = Math.floor((duration / (1000 * 60)) % 60),
    hours: string | number = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  return hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
}

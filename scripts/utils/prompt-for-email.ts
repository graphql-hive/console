import * as readline from 'node:readline/promises';

/**
 * Interactive stdin prompt used by seed scripts to optionally accept an
 * existing developer's email. Returns an empty string on a bare-Enter so
 * the caller can fall back to an auto-generated email.
 *
 * Paired with `getOrCreateAuth` in `./get-or-create-auth.ts`: the
 * combination lets a dev run a seed script and have the resulting org
 * owned by a user they're already signed in as in the browser.
 */
export async function promptForEmail(
  label = 'Enter owner email (or press Enter to auto-generate): ',
): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = await rl.question(label);
    return email.trim();
  } finally {
    rl.close();
  }
}

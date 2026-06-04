/** returns the directory where the user invoked the cli, even when run via npx */
export function getCwd(): string {
  return process.env['INIT_CWD'] ?? process.cwd();
}

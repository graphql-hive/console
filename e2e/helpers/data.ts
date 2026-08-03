export type TestUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export function generateRandomSlug() {
  return Math.random().toString(36).substring(2);
}

export function getUserData(): TestUser {
  return {
    email: `${crypto.randomUUID()}@local.host`,
    password: 'Loc@l.h0st',
    firstName: 'Local',
    lastName: 'Host',
  };
}

export function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = strings.raw;
  let result = '';

  for (let i = 0; i < raw.length; i++) {
    let next = raw[i];

    next = next
      .replace(/\\\n[ \t]*/g, '')
      .replace(/\\`/g, '`')
      .replace(/\\\$/g, '$')
      .replace(/\\\{/g, '{');

    result += next;

    if (i < values.length) {
      result += values[i];
    }
  }

  const lines = result.split('\n');
  let mindent: null | number = null;

  for (const line of lines) {
    const match = line.match(/^(\s+)\S+/);

    if (match) {
      const indent = match[1].length;
      mindent = mindent === null ? indent : Math.min(mindent, indent);
    }
  }

  if (mindent !== null) {
    result = lines
      .map(line => (line[0] === ' ' || line[0] === '\t' ? line.slice(mindent) : line))
      .join('\n');
  }

  return result.trim().replace(/\\n/g, '\n');
}

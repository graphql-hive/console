export function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  // Took from https://github.com/dmnd/dedent
  // Couldn't use the package because I had some issues with moduleResolution.
  const raw = strings.raw;

  // first, perform interpolation
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    let next = raw[i];

    // handle escaped newlines, backticks, and interpolation characters
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

  // now strip indentation
  const lines = result.split('\n');
  let mindent: null | number = null;
  for (const l of lines) {
    const m = l.match(/^(\s+)\S+/);
    if (m) {
      const indent = m[1].length;
      if (!mindent) {
        // this is the first indented line
        mindent = indent;
      } else {
        mindent = Math.min(mindent, indent);
      }
    }
  }

  if (mindent !== null) {
    const m = mindent; // appease TypeScript
    result = lines.map(l => (l[0] === ' ' || l[0] === '\t' ? l.slice(m) : l)).join('\n');
  }

  // dedent eats leading and trailing whitespace too
  result = result.trim();
  // handle escaped newlines at the end to ensure they don't get stripped too
  result = result.replace(/\\n/g, '\n');

  return result;
}

export type MJMLValue = {
  readonly kind: 'mjml';
  readonly content: string;
};

type RawValue = {
  readonly kind: 'raw';
  readonly content: string;
};
type SpecialValues = RawValue;
type ValueExpression = string | SpecialValues | MJMLValue;

export function mjml(parts: TemplateStringsArray, ...values: ValueExpression[]): MJMLValue {
  let content = '';
  let index = 0;

  for (const part of parts) {
    const token = values[index++];

    content += part;

    if (index >= parts.length) {
      continue;
    }

    if (token === undefined) {
      throw new Error('MJML tag cannot be bound an undefined value.');
    } else if (isRawValue(token)) {
      content += token.content;
    } else if (typeof token === 'string') {
      content += escapeHtml(token);
    } else if (token.kind === 'mjml') {
      content += token.content;
    } else {
      throw new TypeError('mjml: Unexpected value expression.');
    }
  }

  return {
    kind: 'mjml',
    content: content,
  };
}

mjml.raw = (content: string): RawValue => ({
  kind: 'raw',
  content,
});

/**
 * @source https://github.com/component/escape-html
 */

function escapeHtml(input: string): string {
  const matchHtmlRegExp = /["'<>]/;
  const match = matchHtmlRegExp.exec(input);

  if (!match) {
    return input;
  }

  let escapeSequence;
  let html = '';
  let index = 0;
  let lastIndex = 0;

  for (index = match.index; index < input.length; index++) {
    switch (input.charCodeAt(index)) {
      case 34: // "
        escapeSequence = '&quot;';
        break;
      case 39: // '
        escapeSequence = '&#39;';
        break;
      case 60: // <
        escapeSequence = '&lt;';
        break;
      case 62: // >
        escapeSequence = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += input.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escapeSequence;
  }

  return lastIndex !== index ? html + input.substring(lastIndex, index) : html;
}

function isOfKind<T extends SpecialValues>(value: unknown, kind: T['kind']): value is T {
  return !!value && typeof value === 'object' && 'kind' in value && value.kind === kind;
}

function isRawValue(value: unknown): value is RawValue {
  return isOfKind<RawValue>(value, 'raw');
}

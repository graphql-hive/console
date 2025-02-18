import { inspect as nodeInspect } from 'node:util';
import colors from 'colors';

export * from './table';

export { colors };

export const space = ' ';

export const indent = space.repeat(3);

export const newline = '\n';

export const header = (value: string) => colors.dim('=== ') + colors.bold(value);

export const plural = (value: unknown[]) => (value.length > 1 ? 's' : '');

export const trimEnd = (value: string) => value.replace(/\s+$/g, '');

/**
 * Convert quoted text to bolded text. Quotes are stripped.
 */
export const boldQuotedWords = (value: string) => {
  const singleQuotedTextRegex = /'([^']+)'/gim;
  const doubleQuotedTextRegex = /"([^"]+)"/gim;
  return value
    .replace(singleQuotedTextRegex, (_, capturedValue: string) => colors.bold(capturedValue))
    .replace(doubleQuotedTextRegex, (_, capturedValue: string) => colors.bold(capturedValue));
};

export const prefixedInspect =
  (prefix: string) =>
  (...values: unknown[]) => {
    const body = values.map(inspect).join(' ');
    return [prefix, body].join(' ');
  };

export const inspect = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  return nodeInspect(value);
};

export const success = (...values: unknown[]) => prefixedInspect(colors.green('✔'))(...values);

export const failure = (...values: unknown[]) => prefixedInspect(colors.red('✖'))(...values);

export const info = (...values: unknown[]) => prefixedInspect(colors.yellow('ℹ'))(...values);

export const warning = (...values: unknown[]) => prefixedInspect(colors.yellow('⚠'))(...values);

/**
 * A text builder. Its methods mutate an internal string value.
 * Useful for quickly building up content.
 */
export interface Builder {
  /**
   * When another builder is passed its value is appended _without_ a newline at the end
   * since builders already supply newlines to their content.
   */
  line: (value?: string | Builder) => Builder;
  /**
   * Add a header line.
   */
  header: (value: string) => Builder;
  /**
   * Add a "success" line.
   */
  success: (...values: unknown[]) => Builder;
  /**
   * Add a "failure" line.
   */
  failure: (...values: unknown[]) => Builder;
  /**
   * Add an "info" line.
   */
  info: (...values: unknown[]) => Builder;
  /**
   * Add a "warning" line.
   */
  warning: (...values: unknown[]) => Builder;
  /**
   * Add an indented line.
   */
  indent: (value: string) => Builder;
  /**
   * The current state of this builder.
   */
  state: BuilderState;
}

interface BuilderState {
  /**
   * The current string value of this builder.
   */
  value: string;
}

export const createBuilder = (): Builder => {
  const state: BuilderState = {
    value: '',
  };

  const builder: Builder = {
    line: value => {
      if (value === undefined) {
        state.value = state.value + newline;
      } else if (typeof value === 'string') {
        state.value = state.value + value + newline;
      } else {
        state.value = state.value + value.state.value;
      }
      return builder;
    },
    header: value => {
      state.value = state.value + header(value) + newline;
      return builder;
    },
    indent: value => {
      state.value = state.value + indent + value + newline;
      return builder;
    },
    success: (...values) => {
      state.value = state.value + success(...values) + newline;
      return builder;
    },
    failure: (...values) => {
      state.value = state.value + failure(...values) + newline;
      return builder;
    },
    info: (...values) => {
      state.value = state.value + info(...values) + newline;
      return builder;
    },
    warning: (...values) => {
      state.value = state.value + warning(...values) + newline;
      return builder;
    },
    state,
  };

  return builder;
};

export * as Texture from './texture';

import type { LineProps } from './lines';
import type { WordProps } from './words';

export function createBuilder() {
  const lines: LineProps[] = [];
  let currentLine: LineProps | undefined;

  return {
    newLine(props: { type: 'removal' | 'addition' | 'no change' | 'mutual'; indent?: number }) {
      currentLine = {
        change: props.type,
        indent: props.indent ?? 0,
        words: [],
      };
      lines.push(currentLine);
    },

    write(...words: WordProps[]) {
      currentLine?.words.push(...words);
    },

    getLines(): ReadonlyArray<LineProps> {
      return lines;
    },
  };
}
export type Builder = ReturnType<typeof createBuilder>;

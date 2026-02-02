import type { LineProps } from './lines';
import type { WordProps } from './words';

export function createBuilder() {
  const lines: LineProps[] = [];
  let currentLine: LineProps | undefined;

  return {
    newLine(props: { type: 'removal' | 'addition' | 'mutual'; indent?: number }) {
      // dont add a newline for the very first line
      if (lines.length === 1 && currentLine && currentLine.words.length === 0) {
        currentLine.change = props.type;
        currentLine.indent = props.indent ?? 0;
        return;
      }
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
      for (const line of lines) {
        // it would be better to calculate the line change type as we go but it's difficult to know when
        // a line has no change vs inline changes at that time. Looping over the lines once here is an acceptable
        // cost and this can be revisited later.
        const noChange =
          line.change === 'mutual' && line.words.every(w => !w.change || w.change === 'no change');
        if (noChange) {
          line.change = 'no change';
        }
      }
      return lines;
    },
  };
}
export type Builder = ReturnType<typeof createBuilder>;

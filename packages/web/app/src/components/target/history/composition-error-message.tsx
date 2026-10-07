import { ReactNode } from 'react';
import reactStringReplace from 'react-string-replace';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { SubgraphName } from '@/components/ui/subgraph-name/subgraph-name';

const QUERY_HEAD = 'The following supergraph API query:';
const QUERY_TAIL = 'cannot be satisfied by the subgraphs because:';

export type CompositionErrorSegment = { kind: 'prose' | 'code'; text: string };

// Apollo's top-level mutation wrapper nests whole errors two spaces in, hence the trimmed match
// and the dedent by the head line's indentation.
export function splitCompositionErrorMessage(message: string): CompositionErrorSegment[] {
  const lines = message.split('\n');
  const segments: CompositionErrorSegment[] = [];
  let prose: string[] = [];
  const flush = () => {
    if (prose.length) {
      segments.push({ kind: 'prose', text: prose.join('\n') });
      prose = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const tail = lines[i].trim() === QUERY_HEAD ? findTail(lines, i + 1) : -1;
    if (tail === -1) {
      prose.push(lines[i]);
      continue;
    }
    const indent = lines[i].slice(0, lines[i].length - lines[i].trimStart().length);
    prose.push(lines[i]);
    flush();
    segments.push({
      kind: 'code',
      text: lines
        .slice(i + 1, tail)
        .map(line => (line.startsWith(indent) ? line.slice(indent.length) : line))
        .join('\n'),
    });
    i = tail - 1;
  }
  flush();
  return segments;
}

function findTail(lines: string[], from: number) {
  for (let i = from + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === QUERY_TAIL) {
      return i;
    }
    if (line === QUERY_HEAD) {
      return -1;
    }
  }
  return -1;
}

// One level per two spaces or one tab.
export function layoutProseLine(line: string) {
  const trimmed = line.trimStart();
  const lead = line.slice(0, line.length - trimmed.length);
  const depth = (lead.match(/\t/g)?.length ?? 0) + Math.floor((lead.match(/ /g)?.length ?? 0) / 2);
  const bullet = trimmed.startsWith('- ');
  return { depth, bullet, text: bullet ? trimmed.slice(2) : trimmed };
}

// Subgraph names get SubgraphName, schema coordinates and directives get badges. The composers
// spell a subgraph either as a leading [name] or as `subgraph "name"` (lists: `subgraphs "a" and "b"`).
const SUBGRAPH_PHRASE = /(\bsubgraphs? "[^"]+"(?:(?:, | and | or )"[^"]+")*)/g;

function renderCompositionErrorText(message: string): ReactNode[] {
  const subgraph = (name: string, key: string) => <SubgraphName key={key} name={name} />;
  return reactStringReplace(
    reactStringReplace(
      reactStringReplace(
        reactStringReplace(
          reactStringReplace(message, /^\[([^\]\n]+)\]/g, (match, index) =>
            subgraph(match, match + index),
          ),
          SUBGRAPH_PHRASE,
          (match, index) => (
            <span key={match + index}>
              {reactStringReplace(match, /"([^"]+)"/g, (name, nameIndex) =>
                subgraph(name, name + nameIndex),
              )}
            </span>
          ),
        ),
        /"([^"]+)"/g,
        (match, index) => <Chip key={match + index} content={match} />,
      ),
      /(@[^. ]+)/g,
      (match, index) => <Chip key={match + index} content={match} />,
    ),
    /Unknown type ([A-Za-z_0-9]+)/g,
    (match, index) => (
      <span key={match + index}>
        Unknown type <Chip content={match} />
      </span>
    ),
  );
}

export function CompositionErrorMessage(props: { message: string }) {
  return (
    <div className="text-fg min-w-0 whitespace-pre-wrap text-sm">
      {splitCompositionErrorMessage(props.message).map((segment, index) =>
        segment.kind === 'code' ? (
          <pre
            key={index}
            className="bg-surface-inset my-2 overflow-x-auto whitespace-pre rounded-md border px-3 py-2 font-mono text-xs leading-5"
          >
            {segment.text}
          </pre>
        ) : (
          segment.text.split('\n').map((line, lineIndex) => {
            const { depth, bullet, text } = layoutProseLine(line);
            return (
              <span
                key={`${index}-${lineIndex}`}
                className="flex"
                style={depth ? { marginLeft: `${depth}em` } : undefined}
              >
                {/* A gutter cell rather than a negative text-indent, which badges inherit and clip. */}
                {bullet ? <span className="w-[1em] shrink-0 select-none">-</span> : null}
                <span className="min-w-0">{renderCompositionErrorText(text)}</span>
              </span>
            );
          })
        ),
      )}
    </div>
  );
}

function Chip(props: { content: string }) {
  return <Badge content={props.content} variants={{ variant: 'warning', padding: 'tight' }} />;
}

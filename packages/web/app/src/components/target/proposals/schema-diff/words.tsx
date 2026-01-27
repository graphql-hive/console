import { DirectiveLocation } from 'graphql';
import { cn } from '@/lib/utils';
import { Change } from './components';

export type WordProps = {
  /** If this word is associated with a coordinate */
  coordinate?: string;
  text: string;
  /**
   * What type of change this is. If left undefined, then it's considered "no change".
   */
  change?: 'removal' | 'addition' | 'no change' | undefined;
  // The type of text contained. This determines the color and potentially more than that in the future.
  kind: 'keyword' | 'type' | 'field' | 'description' | 'location' | 'literal';
};

export function Word(props: WordProps) {
  return (
    <Change type={props.change}>
      <span
        className={cn(
          props.kind === 'description' && 'text-gray-500',
          props.kind === 'field' && 'text-white',
          props.kind === 'keyword' && 'text-gray-400',
          props.kind === 'literal' && 'text-white',
          props.kind === 'location' && 'text-orange-400',
          props.kind === 'type' && 'text-orange-400',
        )}
      >
        {props.text}
      </span>
    </Change>
  );
}

/** Utility functions to make generatic these words easier and more declarative */

export function keyword(text: string, change?: WordProps['change']): WordProps {
  return {
    text,
    change,
    kind: 'keyword',
  };
}

export function type(name: string, coordinate: string, change?: WordProps['change']): WordProps {
  return {
    text: name,
    change,
    coordinate,
    kind: 'type',
  };
}

export function typeName(name: string, change?: WordProps['change']): WordProps {
  return {
    text: name,
    change,
    kind: 'type',
  };
}

export function location(loc: DirectiveLocation, change?: WordProps['change']): WordProps {
  return {
    text: loc.toString(),
    change,
    kind: 'location',
  };
}

export function literal(text: string, change?: WordProps['change']): WordProps {
  return {
    text,
    change,
    kind: 'literal',
  };
}

export function description(text: string, change?: WordProps['change']): WordProps {
  return {
    text,
    change,
    kind: 'description',
  };
}

export function field(name: string, coordinate: string, change?: WordProps['change']): WordProps {
  return {
    coordinate,
    text: name,
    change,
    kind: 'field',
  };
}

export const SPACE: WordProps = literal(' ');

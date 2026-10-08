import {
  createContext,
  Fragment,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CheckIcon, TriangleAlert, XIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { SeverityLevelType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { ChangeRowContext } from './context';

const TAB = <>&nbsp;&nbsp;</>;

export const AnnotatedContext = createContext({
  annotatedCoordinates: null,
} as Readonly<{
  /**
   * As annotations are rendered, this tracks coordinates used. This is used internally to
   * show annotations that are not resolved but that are not tied to a coordinate that exists anymore.
   *
   * Note that adding a value to this Set does not trigger a rerender.
   * Special care must be taken to ensure the render order is correct
   */
  annotatedCoordinates: Set<string> | null;
}>);

export function AnnotatedProvider(props: { children: ReactNode }) {
  // eslint-disable-next-line react/hook-use-state
  const [context, _] = useState({ annotatedCoordinates: new Set<string>() });
  return <AnnotatedContext.Provider value={context}>{props.children}</AnnotatedContext.Provider>;
}

export function ChangeDocument(props: { children: ReactNode; className?: string }) {
  return (
    <ScrollArea axis="horizontal">
      <table
        aria-label="change-document"
        className={cn(
          'min-w-full cursor-default font-mono text-sm whitespace-pre text-fg',
          props.className,
        )}
      >
        {props.children}
      </table>
    </ScrollArea>
  );
}

export function ChangeRow(props: {
  children?: ReactNode;
  className?: string;
  /** Default is mutual */
  type?: 'removal' | 'addition' | 'mutual';
  severityLevel?: SeverityLevelType;
  indent?: boolean | number;
  coordinates?: string[];
  beforeLine?: number;
  afterLine?: number;
  annotations?: (coordinate: string) => ReactElement | null;
}) {
  const ctx = useContext(AnnotatedContext);
  const annotations =
    props.coordinates
      ?.map(c => {
        const annotation = props.annotations?.(c);
        if (annotation) {
          ctx.annotatedCoordinates?.add(c);
        }
        return annotation;
      })
      .filter(a => a !== undefined) ?? [];

  // if the children include any additions or subtractions
  const [added, setAdded] = useState(false);
  const [removed, setRemoved] = useState(false);

  return (
    <ChangeRowContext.Provider
      value={{ change: { addition: added, removal: removed }, setAdded, setRemoved }}
    >
      <tr>
        <td
          className={cn(
            'w-[42px] min-w-fit bg-surface-card pr-3 text-right text-fg-subtle select-none',
            props.className,
            (props.type === 'removal' || removed) && 'bg-diff-removed-gutter',
            props.type === 'addition' && 'invisible',
          )}
        >
          {props.beforeLine}
        </td>
        <td
          className={cn(
            'w-[42px] min-w-fit bg-surface-card pr-3 text-right text-fg-subtle select-none',
            props.className,
            props.type === 'removal' && 'invisible',
            (props.type === 'addition' || added) && 'bg-diff-added-gutter',
          )}
        >
          {props.afterLine}
        </td>
        <td
          className={cn(
            'bg-surface-inset px-2',
            props.className,
            props.type === 'removal' && 'bg-diff-removed',
            props.type === 'addition' && 'bg-diff-added',
          )}
        >
          <span
            className={cn(
              'bg-surface-inset',
              props.type === 'removal' &&
                'bg-diff-removed line-through decoration-diff-removed-strike',
              props.type === 'addition' && 'bg-diff-added',
            )}
          >
            {!!props.indent &&
              Array.from({ length: Number(props.indent) }).map((_, i) => (
                <Fragment key={i}>{TAB}</Fragment>
              ))}
            {props.severityLevel === SeverityLevelType.Breaking && (
              <span title="Breaking Change">
                <XIcon className="inline-block text-critical" />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Dangerous && (
              <span title="Dangerous Change">
                <TriangleAlert className="mr-1 inline-block size-4 text-warning" />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Safe && (
              <span title="Safe Change">
                <CheckIcon className="mr-1 inline-block text-success" />
              </span>
            )}
            {props.children}
          </span>
        </td>
      </tr>
      {annotations.map((annotation, i) => (
        <tr key={`annotation-${i}`}>
          <td colSpan={3}>{annotation}</td>
        </tr>
      ))}
    </ChangeRowContext.Provider>
  );
}

function Removal(props: { children: ReactNode | string; className?: string }): ReactNode {
  const { setRemoved, change } = useContext(ChangeRowContext);
  useEffect(() => {
    if (!change.removal) {
      setRemoved(true);
    }
  }, [change.removal]);

  return (
    <span
      className={cn(
        'bg-diff-removed line-through decoration-diff-removed-strike hover:bg-diff-removed-hover',
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}

function Addition(props: { children: ReactNode; className?: string }): ReactNode {
  const { setAdded, change } = useContext(ChangeRowContext);
  useEffect(() => {
    if (!change.addition) {
      setAdded(true);
    }
  }, [change.addition]);
  return (
    <span className={cn('bg-diff-added hover:bg-diff-added-hover', props.className)}>
      {props.children}
    </span>
  );
}

export function Change({
  type,
  children,
}: {
  children: ReactNode;
  type?: 'addition' | 'removal' | 'no change';
}): ReactNode {
  const Klass = type === 'addition' ? Addition : type === 'removal' ? Removal : Fragment;
  return <Klass>{children}</Klass>;
}

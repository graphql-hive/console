import {
  createContext,
  Fragment,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CheckIcon, XIcon } from '@/components/ui/icon';
import { SeverityLevelType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
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
    <div className="w-full overflow-x-auto">
      <table
        aria-label="change-document"
        className={cn(
          'text-neutral-12 min-w-full cursor-default whitespace-pre font-mono text-sm',
          props.className,
        )}
      >
        {props.children}
      </table>
    </div>
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
            'w-[42px] min-w-fit select-none bg-gray-900 pr-3 text-right text-gray-600',
            props.className,
            (props.type === 'removal' || removed) && 'bg-red-900/30',
            props.type === 'addition' && 'invisible',
          )}
        >
          {props.beforeLine}
        </td>
        <td
          className={cn(
            'w-[42px] min-w-fit select-none bg-gray-900 pr-3 text-right text-gray-600',
            props.className,
            props.type === 'removal' && 'invisible',
            (props.type === 'addition' || added) && 'bg-green-900/30',
          )}
        >
          {props.afterLine}
        </td>
        <td
          className={cn(
            'bg-neutral-2 px-2',
            props.className,
            props.type === 'removal' && 'bg-[#561c1d]',
            props.type === 'addition' && 'bg-[#11362b]',
          )}
        >
          <span
            className={cn(
              'bg-neutral-2',
              props.type === 'removal' && 'bg-[#561c1d] line-through decoration-[#998c8b]',
              props.type === 'addition' && 'bg-[#11362b]',
            )}
          >
            {!!props.indent &&
              Array.from({ length: Number(props.indent) }).map((_, i) => (
                <Fragment key={i}>{TAB}</Fragment>
              ))}
            {props.severityLevel === SeverityLevelType.Breaking && (
              <span title="Breaking Change">
                <XIcon className="inline-block text-red-600" />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Dangerous && (
              <span title="Dangerous Change">
                <ExclamationTriangleIcon className="mr-1 inline-block text-yellow-600" />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Safe && (
              <span title="Safe Change">
                <CheckIcon className="mr-1 inline-block text-green-500" />
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
        'bg-[#561c1d] line-through decoration-[#998c8b] hover:bg-red-800',
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
    <span className={cn('bg-neutral-3 hover:bg-green-900', props.className)}>{props.children}</span>
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

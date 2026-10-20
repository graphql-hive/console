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
import * as styles from './components.css';

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
        className={cn(styles.changeDocumentTable, props.className)}
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
            styles.changeRowTd,
            props.className,
            (props.type === 'removal' || removed) && styles.changeRowTd2,
            props.type === 'addition' && styles.changeRowTd3,
          )}
        >
          {props.beforeLine}
        </td>
        <td
          className={cn(
            styles.changeRowTd4,
            props.className,
            props.type === 'removal' && styles.changeRowTd5,
            (props.type === 'addition' || added) && styles.changeRowTd6,
          )}
        >
          {props.afterLine}
        </td>
        <td
          className={cn(
            styles.changeRowTd7,
            props.className,
            props.type === 'removal' && styles.changeRowTd8,
            props.type === 'addition' && styles.changeRowTd9,
          )}
        >
          <span
            className={cn(
              styles.changeRowSpan,
              props.type === 'removal' && styles.changeRowSpan2,
              props.type === 'addition' && styles.changeRowSpan3,
            )}
          >
            {!!props.indent &&
              Array.from({ length: Number(props.indent) }).map((_, i) => (
                <Fragment key={i}>{TAB}</Fragment>
              ))}
            {props.severityLevel === SeverityLevelType.Breaking && (
              <span title="Breaking Change">
                <XIcon className={styles.changeRowXIcon} />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Dangerous && (
              <span title="Dangerous Change">
                <TriangleAlert className={styles.changeRowTriangleAlert} />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Safe && (
              <span title="Safe Change">
                <CheckIcon className={styles.changeRowCheckIcon} />
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

  return <span className={cn(styles.removalSpan, props.className)}>{props.children}</span>;
}

function Addition(props: { children: ReactNode; className?: string }): ReactNode {
  const { setAdded, change } = useContext(ChangeRowContext);
  useEffect(() => {
    if (!change.addition) {
      setAdded(true);
    }
  }, [change.addition]);
  return <span className={cn(styles.additionSpan, props.className)}>{props.children}</span>;
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

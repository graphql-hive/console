import { useQuery } from 'urql';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import type { TabbedViewItem } from '@/components/ui/tabbed-view/tabbed-view';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import * as styles from './check-sdl.css';

const CheckSdlQuery = graphql(`
  query CheckSdlQuery($selector: TargetSelectorInput!, $schemaCheckId: ID!) {
    target(reference: { bySelector: $selector }) {
      id
      schemaCheck(id: $schemaCheckId) {
        id
        schemaSDL
        baseline {
          sdl
          publicSdl
          supergraphSdl
        }
        ... on SuccessfulSchemaCheck {
          compositeSchemaSDL
          supergraphSDL
        }
        ... on FailedSchemaCheck {
          compositeSchemaSDL
          supergraphSDL
        }
      }
    }
  }
`);

const ContractCheckSdlQuery = graphql(`
  query ContractCheckSdlQuery(
    $selector: TargetSelectorInput!
    $schemaCheckId: ID!
    $contractCheckId: ID!
  ) {
    target(reference: { bySelector: $selector }) {
      id
      schemaCheck(id: $schemaCheckId) {
        id
        contractCheck(id: $contractCheckId) {
          id
          compositeSchemaSDL
          supergraphSDL
          baseline {
            publicSdl
            supergraphSdl
          }
        }
      }
    }
  }
`);

/** The tabs that show SDL; Details and the rest of the page never wait for it. */
export const SDL_TABS = new Set(['service', 'schema', 'supergraph', 'policy']);

type SdlState<T> = { data: T | null; error: boolean };

function useSelector() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  return { organizationSlug, projectSlug, targetSlug };
}

/**
 * A check's six SDLs, loaded the first time a tab that shows them is open. They are megabytes on
 * a large schema, so the check itself is fetched without them.
 */
export function useCheckSdl(args: { schemaCheckId: string; pause: boolean }) {
  const [result] = useQuery({
    query: CheckSdlQuery,
    variables: { selector: useSelector(), schemaCheckId: args.schemaCheckId },
    pause: args.pause,
  });
  return {
    data: result.data?.target?.schemaCheck ?? null,
    error: !!result.error,
  };
}

/** One contract's SDLs, as `useCheckSdl`. */
export function useContractCheckSdl(args: {
  schemaCheckId: string;
  contractCheckId: string | undefined;
  pause: boolean;
}) {
  const [result] = useQuery({
    query: ContractCheckSdlQuery,
    variables: {
      selector: useSelector(),
      schemaCheckId: args.schemaCheckId,
      contractCheckId: args.contractCheckId ?? '',
    },
    pause: args.pause || !args.contractCheckId,
  });
  return {
    data: result.data?.target?.schemaCheck?.contractCheck ?? null,
    error: !!result.error,
  };
}

type CheckSdl = NonNullable<ReturnType<typeof useCheckSdl>['data']>;
type ContractCheckSdl = NonNullable<ReturnType<typeof useContractCheckSdl>['data']>;

/** The check with its SDLs filled in, empty until they arrive. */
export function withCheckSdl<T extends { baseline: Record<string, unknown> | null | undefined }>(
  check: T,
  sdl: CheckSdl | null,
) {
  return {
    ...check,
    schemaSDL: sdl?.schemaSDL ?? '',
    compositeSchemaSDL: sdl?.compositeSchemaSDL ?? null,
    supergraphSDL: sdl?.supergraphSDL ?? null,
    baseline: check.baseline
      ? {
          ...check.baseline,
          sdl: sdl?.baseline?.sdl ?? null,
          publicSdl: sdl?.baseline?.publicSdl ?? null,
          supergraphSdl: sdl?.baseline?.supergraphSdl ?? null,
        }
      : null,
  };
}

/** The contract check with its SDLs filled in, as `withCheckSdl`. */
export function withContractCheckSdl<
  T extends { baseline: Record<string, unknown> | null | undefined },
>(check: T, sdl: ContractCheckSdl | null) {
  return {
    ...check,
    compositeSchemaSDL: sdl?.compositeSchemaSDL ?? null,
    supergraphSDL: sdl?.supergraphSDL ?? null,
    baseline: check.baseline
      ? {
          ...check.baseline,
          publicSdl: sdl?.baseline?.publicSdl ?? null,
          supergraphSdl: sdl?.baseline?.supergraphSdl ?? null,
        }
      : null,
  };
}

function TabMessage(props: { children: React.ReactNode }) {
  return <div className={styles.tabMessageDiv2}>{props.children}</div>;
}

// The body fills the viewport below the tab strip and toolbar (5rem), whatever it holds, so the
// page is never shorter than one screen while a tab loads and the strip stays where it was.
export function SdlPane(props: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sdlPaneDiv6}>
      <div className={styles.sdlPaneDiv7}>
        <div className={styles.sdlPaneDiv8}>{props.title}</div>
        <div className={styles.sdlPaneDiv9}>{props.actions}</div>
      </div>
      <div className={styles.sdlPaneDiv10}>{props.children}</div>
    </div>
  );
}

/**
 * An SDL tab waits for its SDLs. Tab state comes from flags on the check, so a check that composed
 * should always have them; if one did not, the tab says so instead of rendering an empty diff.
 */
export function withSdlState<T>(
  item: TabbedViewItem,
  state: SdlState<T>,
  missing?: (data: T, tab: string) => string | null,
): TabbedViewItem {
  if (!SDL_TABS.has(item.value)) {
    return item;
  }
  const message = state.error
    ? 'The schema could not be loaded.'
    : state.data
      ? missing?.(state.data, item.value)
      : null;
  if (state.data && !message) {
    return item;
  }
  return {
    ...item,
    content: (
      <SdlPane>
        {message ? (
          <TabMessage>{message}</TabMessage>
        ) : (
          <div className={styles.withSdlStateDiv2}>
            <Spinner variants={{ size: 'lg' }} label="Loading schema" />
            Loading schema…
          </div>
        )}
      </SdlPane>
    ),
  };
}

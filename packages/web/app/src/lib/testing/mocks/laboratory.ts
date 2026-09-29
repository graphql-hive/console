/**
 * Stand-in for `@graphql-hive/laboratory`, whose bundled Monaco calls
 * `document.queryCommandSupported` at import and does not load under jsdom. The app imports only
 * these two components at runtime; everything else it takes from the package is a type.
 * `vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'))`.
 */
export const Editor = () => null;
export const Laboratory = () => null;

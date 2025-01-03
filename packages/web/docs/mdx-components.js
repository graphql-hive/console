/**
 * We have an error while using `mdx-components` with `.tsx` extension:
 *
 * createContext only works in Client Components. Add the "use client" directive at the top of the file to use it
 *
 * Using `.js` to avoid this error for now
 */
export { useMDXComponents } from './src/mdx-components';

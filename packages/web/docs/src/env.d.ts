interface Window {
  $crisp?: {
    push: (args: any[]) => void;
  };
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof import('../mdx-components').useMDXComponents>;
}

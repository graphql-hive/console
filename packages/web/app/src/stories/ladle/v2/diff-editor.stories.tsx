import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Diff Editor',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Diff Editor Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Monaco-based diff viewer for comparing two versions of GraphQL schemas or code. Shows
        side-by-side or inline diff with syntax highlighting.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Key Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>@monaco-editor/react - Monaco editor wrapper for React</li>
        <li>monaco-editor - Microsoft's code editor (powers VS Code)</li>
        <li>GraphQL language support for syntax highlighting</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Side-by-side or inline diff view</li>
        <li>GraphQL syntax highlighting</li>
        <li>Line-by-line change indicators (additions, deletions, modifications)</li>
        <li>Read-only mode (typically for viewing diffs)</li>
        <li>Dark theme integration (vs-dark)</li>
        <li>Automatic formatting via prettier/graphql</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Common Use Cases</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Comparing schema versions</li>
        <li>Reviewing breaking changes</li>
        <li>Schema migration preview</li>
        <li>Pull request diffs</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface DiffEditorProps {
  original: string;      // Original version
  modified: string;      // Modified version
  language?: string;     // Default: 'graphql'
  theme?: string;        // Default: 'vs-dark'
  options?: {
    readOnly?: boolean;
    renderSideBySide?: boolean;
    // ... other Monaco diff options
  };
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Monaco DiffEditor component from @monaco-editor/react</li>
        <li>Original and modified props contain the two versions to compare</li>
        <li>Automatic syntax highlighting for GraphQL</li>
        <li>Read-only by default (viewing diffs, not editing)</li>
        <li>Theme matches application dark mode (vs-dark)</li>
        <li>Options passed through to Monaco's diff editor</li>
        <li>Height typically set via container or explicit height prop</li>
      </ul>
    </div>
  </div>
);

import type { Story } from '@ladle/react';

export default {
  title: 'Common / GraphQL SDL Block',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Common GraphQL SDL Block Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        GraphQL syntax highlighter using SchemaEditor (Monaco-based) with automatic prettifying.
        Read-only editor for displaying formatted GraphQL SDL.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`import { GraphQLHighlight } from '@/components/common/GraphQLSDLBlock';

<GraphQLHighlight
  code={graphqlCode}
  height="400px"
  theme="vs-dark"
/>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>SchemaEditor component (Monaco editor wrapper)</li>
        <li>usePrettify hook - Auto-formats GraphQL code</li>
        <li>Monaco editor theme: vs-dark (default)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props extends Omit<SchemaEditorProps, 'schema'> {
  code: string;  // GraphQL SDL code to display
  // Inherited props:
  // - height?: string
  // - theme?: string
  // - options?: MonacoEditorOptions
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Default Configuration</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">theme: "vs-dark"</code>
          <span className="text-neutral-11 text-xs">- Monaco dark theme</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">readOnly: true</code>
          <span className="text-neutral-11 text-xs">- Editor is read-only</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">height: "100vh"</code>
          <span className="text-neutral-11 text-xs">- Default full viewport height</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Automatic GraphQL code formatting via usePrettify hook</li>
        <li>Syntax highlighting for GraphQL SDL</li>
        <li>Read-only display (no editing allowed)</li>
        <li>Monaco editor with dark theme by default</li>
        <li>Customizable height and editor options</li>
        <li>Graceful handling of prettify errors (shows original code)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Example</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`const schema = \`
type Query {
  users: [User!]!
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String!
}
\`;

<GraphQLHighlight code={schema} height="500px" />`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Wraps SchemaEditor component with GraphQL-specific defaults</li>
        <li>usePrettify hook formats code asynchronously</li>
        <li>Falls back to original code if prettify fails</li>
        <li>Monaco editor provides rich GraphQL syntax support</li>
        <li>Pass-through of SchemaEditor props for customization</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component relies on Monaco editor and SchemaEditor,
        which require complex setup. See the actual component usage in schema explorer and
        documentation pages.
      </p>
    </div>
  </div>
);

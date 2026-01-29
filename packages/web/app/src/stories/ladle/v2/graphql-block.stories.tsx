import type { Story } from '@ladle/react';

export default {
  title: 'V2 / GraphQL Block',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 GraphQL Block Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Read-only GraphQL code viewer using Monaco editor with syntax highlighting. Displays SDL
        (Schema Definition Language) with optional title and URL.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Components</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-sm font-medium">GraphQLHighlight</p>
          <p className="text-neutral-10 text-xs">
            Core Monaco editor component with GraphQL syntax highlighting. Read-only, fixed height
            (60vh), vs-dark theme.
          </p>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm font-medium">GraphQLBlock</p>
          <p className="text-neutral-10 text-xs">
            Complete block with Card wrapper, Heading, and GraphQLHighlight. Includes optional
            title and URL display.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Key Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>GraphQL syntax highlighting via Monaco</li>
        <li>Automatic code prettification (usePrettify hook)</li>
        <li>Line numbers enabled</li>
        <li>Read-only mode (non-editable)</li>
        <li>Fixed height container (60vh)</li>
        <li>Dark theme (vs-dark)</li>
        <li>Card wrapper with Heading component</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// GraphQLBlock props
interface Props {
  sdl: string;                    // GraphQL SDL to display
  title?: string | ReactNode;     // Optional heading
  url?: string;                   // Optional URL (shown italic)
  editorProps?: SchemaEditorProps; // Pass-through to editor
  className?: string;
}

// GraphQLHighlight props
interface HighlightProps {
  code: string;                   // GraphQL code
  // + all SchemaEditorProps except 'schema'
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>SchemaEditor component (Monaco wrapper)</li>
        <li>usePrettify hook for code formatting</li>
        <li>Card component (V2)</li>
        <li>Heading component (UI)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`import { GraphQLBlock, GraphQLHighlight } from '@/components/v2/graphql-block';

// Full block with card
<GraphQLBlock
  sdl={schemaSDL}
  title="Schema Definition"
  url="https://example.com/schema"
/>

// Just the highlight (no card)
<GraphQLHighlight code={schemaSDL} />`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>GraphQLHighlight uses usePrettify to format code before display</li>
        <li>SchemaEditor receives formatted code as 'schema' prop</li>
        <li>Fixed height set both via style prop and SchemaEditor height</li>
        <li>GraphQLBlock wraps highlight in Card with optional title/URL heading</li>
        <li>URL shown in italic text with left margin</li>
        <li>editorProps spread to SchemaEditor for customization</li>
        <li>Read-only ensures code cannot be modified</li>
      </ul>
    </div>
  </div>
);

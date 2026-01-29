import type { Story } from '@ladle/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PromptProvider, PromptManager, usePromptManager } from '@/components/ui/prompt';

function PromptDemo({ title, description, defaultValue }: { title: string; description?: string; defaultValue?: string }) {
  const { openPrompt } = usePromptManager();
  const [result, setResult] = useState<string | null>(null);
  const [promptId, setPromptId] = useState(1);

  const handleOpenPrompt = async () => {
    const id = promptId;
    setPromptId(prev => prev + 1);

    const value = await openPrompt({
      id,
      title,
      description,
      defaultValue,
    });

    setResult(value);
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleOpenPrompt}>Open Prompt</Button>
      {result !== null && (
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm mb-1">Result:</p>
          <p className="text-neutral-12 text-sm font-mono">
            {result === '' ? '(empty string)' : result || '(cancelled)'}
          </p>
        </div>
      )}
    </div>
  );
}

export const Simple: Story = () => (
  <PromptProvider>
    <div className="p-4">
      <PromptDemo title="Enter your name" />
      <PromptManager />
    </div>
  </PromptProvider>
);

Simple.meta = {
  description: 'Simple prompt with title only',
};

export const WithDescription: Story = () => (
  <PromptProvider>
    <div className="p-4">
      <PromptDemo
        title="Create new collection"
        description="Enter a name for your new collection. This will be visible to all team members."
      />
      <PromptManager />
    </div>
  </PromptProvider>
);

WithDescription.meta = {
  description: 'Prompt with title and description',
};

export const WithDefaultValue: Story = () => (
  <PromptProvider>
    <div className="p-4">
      <PromptDemo
        title="Rename operation"
        description="Enter a new name for this GraphQL operation"
        defaultValue="MyQuery"
      />
      <PromptManager />
    </div>
  </PromptProvider>
);

WithDefaultValue.meta = {
  description: 'Prompt with default value pre-filled',
};

export const RenameOperation: Story = () => (
  <PromptProvider>
    <div className="p-4 max-w-2xl">
      <div className="mb-4">
        <p className="text-neutral-11 text-sm mb-2">
          Usage example from GraphQL Laboratory page:
        </p>
        <p className="text-neutral-10 text-xs">
          When renaming a saved GraphQL operation, the prompt asks for a new name with the current
          name as the default value.
        </p>
      </div>
      <PromptDemo
        title="Rename operation"
        description="Enter a new name for this operation"
        defaultValue="getUserById"
      />
      <PromptManager />
    </div>
  </PromptProvider>
);

RenameOperation.meta = {
  description: 'Real usage: Renaming a GraphQL operation in Laboratory',
};

export const CreateCollection: Story = () => (
  <PromptProvider>
    <div className="p-4 max-w-2xl">
      <div className="mb-4">
        <p className="text-neutral-11 text-sm mb-2">
          Usage example from GraphQL Laboratory page:
        </p>
        <p className="text-neutral-10 text-xs">
          When creating a new operation collection, the prompt asks for a collection name.
        </p>
      </div>
      <PromptDemo
        title="Create collection"
        description="Enter a name for the new collection"
      />
      <PromptManager />
    </div>
  </PromptProvider>
);

CreateCollection.meta = {
  description: 'Real usage: Creating a new collection in Laboratory',
};

export const MultiplePrompts: Story = () => {
  const [results, setResults] = useState<string[]>([]);

  function MultipleDemoInner() {
    const { openPrompt } = usePromptManager();
    const [promptId, setPromptId] = useState(1);

    const handleOpenMultiple = async () => {
      const results: string[] = [];

      // Open first prompt
      const id1 = promptId;
      setPromptId(prev => prev + 1);
      const result1 = await openPrompt({
        id: id1,
        title: 'First prompt',
        description: 'Enter first value',
      });
      results.push(result1 || '(cancelled)');

      // Open second prompt
      const id2 = promptId + 1;
      setPromptId(prev => prev + 1);
      const result2 = await openPrompt({
        id: id2,
        title: 'Second prompt',
        description: 'Enter second value',
      });
      results.push(result2 || '(cancelled)');

      // Open third prompt
      const id3 = promptId + 2;
      setPromptId(prev => prev + 1);
      const result3 = await openPrompt({
        id: id3,
        title: 'Third prompt',
        description: 'Enter third value',
      });
      results.push(result3 || '(cancelled)');

      setResults(results);
    };

    return (
      <div className="space-y-4">
        <Button onClick={handleOpenMultiple}>Open Multiple Prompts</Button>
        {results.length > 0 && (
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm mb-2">Results:</p>
            <ul className="text-neutral-12 text-sm font-mono space-y-1">
              {results.map((result, i) => (
                <li key={i}>
                  {i + 1}. {result === '' ? '(empty string)' : result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <PromptProvider>
      <div className="p-4">
        <div className="mb-4">
          <p className="text-neutral-11 text-sm mb-2">
            Prompts are queued and shown one at a time:
          </p>
          <p className="text-neutral-10 text-xs">
            Click the button to open 3 prompts in sequence. Each prompt waits for the previous one
            to be closed.
          </p>
        </div>
        <MultipleDemoInner />
        <PromptManager />
      </div>
    </PromptProvider>
  );
};

MultiplePrompts.meta = {
  description: 'Multiple prompts queued in sequence',
};

export const ColorPaletteShowcase: Story = () => (
  <PromptProvider>
    <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Prompt Component</h2>
        <p className="text-neutral-11 mb-4">
          Modal prompt dialog for asking users for text input. Uses a context provider and queue
          system for managing multiple prompts. Commonly used in GraphQL Laboratory for renaming
          operations and creating collections.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Basic Prompt</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <PromptDemo title="Enter value" />
            </div>
            <p className="text-xs text-neutral-10">
              Modal: Uses Dialog component with{' '}
              <code className="text-neutral-12">hideCloseButton</code>
              <br />
              Input: Single text input with <code className="text-neutral-12">className="mt-4"</code>
              <br />
              Buttons: Cancel (outline variant) + OK (default)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Prompt Structure</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <ul className="text-xs text-neutral-10 space-y-1">
                <li>
                  1. <strong className="text-neutral-12">DialogHeader:</strong> Title + optional
                  description
                </li>
                <li>
                  2. <strong className="text-neutral-12">Form:</strong> Wraps input and buttons
                </li>
                <li>
                  3. <strong className="text-neutral-12">Input:</strong> Controlled input with value
                  state
                </li>
                <li>
                  4. <strong className="text-neutral-12">DialogFooter:</strong> Cancel + OK buttons
                  with <code className="text-neutral-12">mt-4</code>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Queue System</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <p className="text-xs text-neutral-10 mb-2">
                PromptManager renders all prompts in queue but only shows first one:
              </p>
              <ul className="text-xs text-neutral-10 space-y-1">
                <li>
                  • <code className="text-neutral-12">isVisible={'{index === 0}'}</code> shows only
                  first prompt
                </li>
                <li>
                  • When first prompt closes, next prompt becomes visible automatically
                </li>
                <li>
                  • Each prompt returns a <code className="text-neutral-12">Promise</code> resolved
                  on close
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Interactive Example</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <PromptDemo
                title="Test prompt"
                description="Try entering a value and clicking OK, or click Cancel to see null result"
                defaultValue="default text"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
        <div className="space-y-4">
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Prompt (internal)</p>
            <ul className="text-xs space-y-1 text-neutral-10">
              <li>
                <code className="text-neutral-12">id</code>: number - Unique identifier
              </li>
              <li>
                <code className="text-neutral-12">onClose</code>: (id, value | null) =&gt; void -
                Called on submit/cancel
              </li>
              <li>
                <code className="text-neutral-12">title</code>: string - Dialog title
              </li>
              <li>
                <code className="text-neutral-12">description</code>: string (optional) - Dialog
                description
              </li>
              <li>
                <code className="text-neutral-12">defaultValue</code>: string (optional) - Pre-filled
                input value
              </li>
              <li>
                <code className="text-neutral-12">isVisible</code>: boolean - Whether to render
                DialogContent
              </li>
            </ul>
          </div>

          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">openPrompt (from hook)</p>
            <ul className="text-xs space-y-1 text-neutral-10">
              <li>
                <code className="text-neutral-12">id</code>: number - Unique identifier for this
                prompt
              </li>
              <li>
                <code className="text-neutral-12">title</code>: string - Dialog title
              </li>
              <li>
                <code className="text-neutral-12">description</code>: string (optional) - Dialog
                description
              </li>
              <li>
                <code className="text-neutral-12">defaultValue</code>: string (optional) - Pre-filled
                value
              </li>
              <li>
                Returns: <code className="text-neutral-12">Promise&lt;string | null&gt;</code> -
                Resolves with input value or null if cancelled
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Pattern</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-xs text-neutral-10 mb-2">Typical usage in components:</p>
          <pre className="text-xs text-neutral-12 bg-neutral-3 p-3 rounded overflow-x-auto">
            {`// 1. Wrap app with PromptProvider
<PromptProvider>
  <YourApp />
  <PromptManager />
</PromptProvider>

// 2. Use in components
const { openPrompt } = usePromptManager();
const [promptId, setPromptId] = useState(1);

const handleRename = async () => {
  const result = await openPrompt({
    id: promptId,
    title: 'Rename operation',
    description: 'Enter new name',
    defaultValue: currentName,
  });

  if (result !== null) {
    // User clicked OK
    setPromptId(prev => prev + 1);
    await renameOperation(result);
  } else {
    // User clicked Cancel
  }
};`}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Implementation Details</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <ul className="text-xs space-y-2 text-neutral-10">
            <li>
              <strong className="text-neutral-12">Context-based:</strong> Uses React Context for
              state management
            </li>
            <li>
              <strong className="text-neutral-12">Promise-based API:</strong> Each{' '}
              <code className="text-neutral-12">openPrompt</code> returns a Promise
            </li>
            <li>
              <strong className="text-neutral-12">Queue system:</strong> Multiple prompts queued,
              shown one at a time
            </li>
            <li>
              <strong className="text-neutral-12">No close button:</strong> Uses{' '}
              <code className="text-neutral-12">hideCloseButton</code> on DialogContent
            </li>
            <li>
              <strong className="text-neutral-12">Form submission:</strong> Enter key submits form
              (OK button)
            </li>
            <li>
              <strong className="text-neutral-12">Cancel returns null:</strong> Distinguish between
              empty string and cancellation
            </li>
            <li>
              <strong className="text-neutral-12">Unique IDs:</strong> Caller must provide unique ID
              for each prompt
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
        <div className="space-y-4">
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">
              GraphQL Laboratory Operations
            </p>
            <p className="text-neutral-10 text-xs">
              Rename operations, create collections, duplicate operations - any action requiring a
              text input
            </p>
          </div>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Resource Naming</p>
            <p className="text-neutral-10 text-xs">
              Quick text input for naming/renaming resources without complex form modals
            </p>
          </div>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Sequential Inputs</p>
            <p className="text-neutral-10 text-xs">
              Collect multiple text inputs in sequence using the queue system
            </p>
          </div>
        </div>
      </div>
    </div>
    <PromptManager />
  </PromptProvider>
);

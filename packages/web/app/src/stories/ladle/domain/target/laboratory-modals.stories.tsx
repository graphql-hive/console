import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Target / Laboratory Modals',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Target Laboratory Modal Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Modal dialogs for managing GraphQL Laboratory collections and operations. Includes modals
        for connecting to lab, creating/editing/deleting collections and operations.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Modal Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>connect-lab-modal.tsx - Instructions for using lab schema externally</li>
        <li>create-collection-modal.tsx - Create new operation collection</li>
        <li>create-operation-modal.tsx - Add operation to collection</li>
        <li>edit-operation-modal.tsx - Edit existing operation</li>
        <li>delete-collection-modal.tsx - Confirm collection deletion</li>
        <li>delete-operation-modal.tsx - Confirm operation deletion</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">ConnectLabModal</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<ConnectLabModal
  isOpen={true}
  close={() => {}}
  endpoint="https://api.hive.com/lab/..."
  isCDNEnabled={fragmentData}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows lab GraphQL endpoint URL</li>
          <li>InputCopy for easy copying</li>
          <li>Authentication header instructions (X-Hive-Key)</li>
          <li>Callout about CDN alternative (if enabled)</li>
          <li>Link to registry access tokens docs</li>
          <li>Uses GraphQL fragment for isCDNEnabled flag</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">CreateCollectionModal</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Form fields:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Collection name (required, 3-100 characters)</li>
          <li>Description (optional)</li>
          <li>GraphQL mutation: CreateDocumentCollection</li>
          <li>Form validation with Formik + Yup</li>
          <li>Redirects to collection page on success</li>
          <li>Toast notification for errors</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">CreateOperationModal</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Form fields:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Operation name (required)</li>
          <li>GraphQL query/mutation/subscription (required)</li>
          <li>Variables (JSON, optional)</li>
          <li>Headers (JSON, optional)</li>
          <li>Collection selection dropdown</li>
          <li>GraphQL mutation: CreateDocumentCollectionOperation</li>
          <li>Validates GraphQL syntax</li>
          <li>Validates JSON for variables/headers</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">EditOperationModal</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Similar to CreateOperationModal with:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Pre-filled form with existing operation data</li>
          <li>Operation ID for targeting update</li>
          <li>GraphQL mutation: UpdateDocumentCollectionOperation</li>
          <li>Can move operation to different collection</li>
          <li>Updates cache on success</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">DeleteCollectionModal</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<DeleteCollectionModal
  isOpen={true}
  close={() => {}}
  collectionId="collection-id"
  collectionName="My Collection"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Confirmation dialog with collection name</li>
          <li>Warning about deleting all operations in collection</li>
          <li>GraphQL mutation: DeleteDocumentCollection</li>
          <li>Destructive action styling (red button)</li>
          <li>Redirects to collections list after deletion</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">DeleteOperationModal</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<DeleteOperationModal
  isOpen={true}
  close={() => {}}
  operationId="operation-id"
  operationName="GetUser"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Confirmation dialog with operation name</li>
          <li>GraphQL mutation: DeleteDocumentCollectionOperation</li>
          <li>Destructive action styling</li>
          <li>Updates collection cache on success</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Laboratory Workflow</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Typical user flow:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Create collection (CreateCollectionModal)</li>
          <li>Add operations to collection (CreateOperationModal)</li>
          <li>Test operations in GraphQL playground</li>
          <li>Edit operations as needed (EditOperationModal)</li>
          <li>Delete operations/collections when done</li>
          <li>Connect external tools via ConnectLabModal</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateDocumentCollection - Create new collection</li>
        <li>UpdateDocumentCollection - Update collection details</li>
        <li>DeleteDocumentCollection - Delete collection and operations</li>
        <li>CreateDocumentCollectionOperation - Add operation</li>
        <li>UpdateDocumentCollectionOperation - Edit operation</li>
        <li>DeleteDocumentCollectionOperation - Remove operation</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Form Validation</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Using Formik + Yup:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Collection name: 3-100 characters</li>
          <li>Operation name: required, non-empty</li>
          <li>GraphQL query: required, valid GraphQL syntax</li>
          <li>Variables: optional, valid JSON</li>
          <li>Headers: optional, valid JSON</li>
          <li>Inline error messages</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Common Modal Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<Dialog open={isOpen} onOpenChange={close}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>

    {/* Form or content */}

    <DialogFooter>
      <Button variant="outline" onClick={close}>Cancel</Button>
      <Button onClick={submit}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL mutations</li>
        <li>Formik - Form state management</li>
        <li>Yup - Schema validation</li>
        <li>@tanstack/react-router - Navigation</li>
        <li>Dialog components (Radix UI)</li>
        <li>InputCopy for endpoint copying</li>
        <li>Toast notifications for errors/success</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>All modals controlled by isOpen prop</li>
        <li>Close callback for dismissing modals</li>
        <li>Form submission triggers GraphQL mutations</li>
        <li>Success results in navigation or cache update</li>
        <li>Error handling with toast notifications</li>
        <li>Destructive actions use warning styling</li>
        <li>Collections organize related operations</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These modals use GraphQL mutations, form validation, and
        router navigation. See actual usage in target laboratory pages.
      </p>
    </div>
  </div>
);

import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Transfer Organization Ownership',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        V2 Transfer Organization Ownership Modal
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Specialized modal for transferring organization ownership to another member. Uses GraphQL
        mutations, form validation, and headless UI combobox for member selection.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Key Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL client (useQuery, useMutation)</li>
        <li>formik - Form state management</li>
        <li>yup - Form validation schema</li>
        <li>@headlessui/react - Combobox for member selection</li>
        <li>Modal component (V2)</li>
        <li>Input component (V2)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>GraphQL query to fetch organization members</li>
        <li>Filters out current owner from member list</li>
        <li>Searchable combobox for member selection</li>
        <li>Email confirmation input</li>
        <li>Form validation (selected member, email match)</li>
        <li>GraphQL mutation to request ownership transfer</li>
        <li>Success/error notifications</li>
        <li>Modal closes on successful transfer request</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Operations</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-sm font-medium">
            TransferOrganizationOwnership_Members (Query)
          </p>
          <p className="text-neutral-10 text-xs">
            Fetches organization members with user details (fullName, displayName, email). Filters
            by isOwner to exclude current owner.
          </p>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm font-medium">
            TransferOrganizationOwnership_Request (Mutation)
          </p>
          <p className="text-neutral-10 text-xs">
            Submits transfer request with organization slug and target user email. Returns ok/error
            response.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Form Validation</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`const validationSchema = Yup.object().shape({
  user: Yup.mixed().required('Please select a member'),
  email: Yup.string()
    .email('Invalid email')
    .required('Please confirm email'),
});`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Headless UI Combobox</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Member selection features:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Search/filter members by name or email</li>
            <li>Keyboard navigation (arrow keys, enter)</li>
            <li>Visual feedback for selected member (CheckIcon)</li>
            <li>Transition animations for dropdown</li>
            <li>Empty state when no matches</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">User Flow</h4>
      <ol className="text-neutral-11 ml-4 list-inside list-decimal space-y-2 text-sm">
        <li>User opens modal via trigger button</li>
        <li>Modal queries organization members</li>
        <li>User searches and selects target member from combobox</li>
        <li>User enters target member's email for confirmation</li>
        <li>Form validates: member selected, email matches</li>
        <li>On submit: mutation requests ownership transfer</li>
        <li>Success: notification shown, modal closes</li>
        <li>Error: error message displayed, modal stays open</li>
      </ol>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  organizationSlug: string;      // Organization to transfer
  isOpen: boolean;              // Modal open state
  toggleModalOpen: () => void;  // Close modal callback
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses formik for form state and validation</li>
        <li>Yup schema ensures data integrity before submission</li>
        <li>GraphQL fragments (MemberFields) for data requirements</li>
        <li>useNotifications hook for toast messages</li>
        <li>HeadlessUI Combobox for accessible selection</li>
        <li>Filters current owner from selectable members</li>
        <li>Email confirmation prevents accidental transfers</li>
        <li>Modal size: large (800px)</li>
        <li>Includes help text and warning messages</li>
      </ul>
    </div>
  </div>
);

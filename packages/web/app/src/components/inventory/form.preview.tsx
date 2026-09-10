import { createPreview, type NavPath } from 'react-foundry';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Form';

/**
 * `ui/form` as it ships today, across 24 files and 76 `FormField`s.
 *
 * `base/form` already exists and is a near-port of this, but only one file uses it
 * (`target/alerts/alert-form.tsx`). The two differ in ways that matter to a migration and are
 * shown side by side below: `ui/FormControl` is a Radix `Slot` that clones its child to inject
 * `id`/`aria-*`/`className`, while `base/FormControl` wraps the child in a plain `div`. That
 * single difference is why the three access-token sheets cannot move without a decision.
 *
 * The pages cannot be imported: they mount react-hook-form against real GraphQL mutations. Each
 * preview runs its own local `useForm`.
 */

const ENTRIES = [
  {
    source: 'pages/auth-sign-in.tsx:207 and ~30 more',
    origin: 'ui',
    what: 'FormItem > FormLabel + FormControl(Input) + FormMessage',
    coveredBy: 'Standard field',
  },
  {
    source: 'pages/organization-support.tsx:201 and 6 more',
    origin: 'ui',
    what: 'The same plus a FormDescription between control and message',
    coveredBy: 'With description',
  },
  {
    source: 'components/organization/settings/access-tokens/create-access-token-sheet-content.tsx',
    origin: 'ui',
    what: 'Namespace import, so every part is written Form.FormItem',
    coveredBy: 'Namespace import',
  },
  {
    source:
      'create-personal-access-token-sheet-content.tsx, create-project-access-token-sheet-content.tsx',
    origin: 'ui',
    what: 'Same namespace style, same four fields',
    coveredBy: 'Namespace import',
  },
  {
    source: 'connect-single-sign-on-provider-sheet.tsx ×8',
    origin: 'ui',
    what: 'The densest form in the app, eight fields in one sheet',
    coveredBy: 'Standard field',
  },
  {
    source: 'pages/project-settings.tsx:276, pages/target-settings.tsx:1471',
    origin: 'ui',
    what: 'FormItem with no FormLabel, the control is a joined slug field',
    coveredBy: 'No label',
  },
  {
    source: 'pages/organization-support-ticket.tsx:92',
    origin: 'ui',
    what: 'FormItem holding only a control and a message',
    coveredBy: 'No label',
  },
  {
    source: 'components/organization/members/roles.tsx ×4',
    origin: 'ui',
    what: 'Input and Textarea fields in a create/edit pair',
    coveredBy: 'Standard field',
  },
  {
    source: 'Any field in an error state',
    origin: 'ui',
    what: 'FormControl injects border-red-500 onto the child; FormMessage reserves min-h-[1.25rem]',
    coveredBy: 'Error state',
  },
  {
    source: 'components/target/alerts/alert-form.tsx:24',
    origin: 'ui',
    what: 'Already migrated to base/form: FormLabel takes a label prop, FormControl wraps in a div',
    coveredBy: 'ui vs base',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/form"
      summary={
        <>
          <strong>76 FormFields across 24 files.</strong> Only 55 use <code>FormItem</code>, so 21
          fields are laid out by hand. <code>FormDescription</code> appears just 7 times against 53{' '}
          <code>FormMessage</code>s. Three sheets import the module as a namespace (
          <code>Form.FormItem</code>) while the other 21 files use named imports — two styles for
          one component. <code>base/form</code> already exists and is used by exactly one file, so
          the migration is mostly call-site work, not component work.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The shape ~30 fields share.
// ---------------------------------------------------------------------------

export const StandardField = createPreview({
  label: 'Standard field',
  render: () => <StandardFieldForm />,
});

function StandardFieldForm() {
  const form = useForm({ defaultValues: { email: '', password: '' } });

  return (
    <CallSite
      source="pages/auth-sign-in.tsx:207"
      origin="ui"
      note="FormItem is space-y-2; FormLabel is text-neutral-11 mb-2 inline-block, so the label's own margin stacks on top of that gap. FormMessage reserves min-h-[1.25rem] even when empty, which is the blank strip under each field."
    >
      <Form {...form}>
        <form className="grid w-[24rem] gap-4">
          <FormField
            control={form.control}
            name="email"
            render={() => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="m@example.com" type="email" {...form.register('email')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={() => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...form.register('password')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Sign in</Button>
        </form>
      </Form>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// FormDescription, which only 7 of 76 fields use.
// ---------------------------------------------------------------------------

export const WithDescription = createPreview({
  label: 'With description',
  render: () => <WithDescriptionForm />,
});

function WithDescriptionForm() {
  const form = useForm({ defaultValues: { description: '' } });

  return (
    <CallSite
      source="pages/organization-support.tsx:201"
      origin="ui"
      note="Description sits between control and message, at text-neutral-10 text-sm. Only 7 fields in the app have one, against 53 that have a message."
    >
      <Form {...form}>
        <form className="w-[24rem]">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter a short description of your issue" {...field} />
                </FormControl>
                <FormDescription>Help us understand it better.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// The error state, which is the only thing FormControl's Slot cloning is visible for.
// ---------------------------------------------------------------------------

export const ErrorState = createPreview({
  label: 'Error state',
  render: () => <ErrorStateForm />,
});

function ErrorStateForm() {
  const form = useForm({ defaultValues: { slug: '' } });

  // Set once so the field renders in its invalid state without needing a submit.
  if (!form.formState.errors.slug) {
    form.setError('slug', { message: 'Slug must be at least 2 characters.' });
  }

  return (
    <CallSite
      source="Any field with a validation error"
      origin="ui"
      note="FormControl is a Radix Slot: it clones its child and injects id, aria-describedby, aria-invalid and border-red-500. The red border on the input is not the input's doing. That cloning is exactly what a non-DOM child cannot receive."
    >
      <Form {...form}>
        <form className="w-[24rem]">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="slug" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// 21 of 76 fields skip FormItem, or skip the label.
// ---------------------------------------------------------------------------

export const NoLabel = createPreview({
  label: 'No label',
  render: () => <NoLabelForm />,
});

function NoLabelForm() {
  const form = useForm({ defaultValues: { slug: 'graphql-api', body: '' } });

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/project-settings.tsx:276"
        origin="ui"
        note="FormItem with no FormLabel at all: the control is a joined prefix + slug field, and the surrounding card supplies the heading."
      >
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid max-w-xl grid-cols-1 md:grid-cols-2">
                      <div className="border-neutral-5 text-neutral-10 bg-neutral-2 h-10 overflow-hidden text-nowrap rounded-md border px-3 py-2 text-sm md:rounded-r-none md:border-r-0">
                        app.graphql-hive.com/the-guild/
                      </div>
                      <Input placeholder="slug" className="rounded-l-none" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CallSite>
      <CallSite
        source="pages/organization-support-ticket.tsx:92"
        origin="ui"
        note="Control and message only. The reply box sits under a ticket thread that already names it."
      >
        <Form {...form}>
          <form className="w-[24rem]">
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Type your comment here." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The three access-token sheets import the module as a namespace.
// ---------------------------------------------------------------------------

export const NamespaceImport = createPreview({
  label: 'Namespace import',
  render: () => <NamespaceForm />,
});

function NamespaceForm() {
  const form = useForm({ defaultValues: { title: '' } });

  return (
    <CallSite
      source="create-access-token-sheet-content.tsx and the personal + project sheets"
      origin="ui"
      note="import * as Form, so every part reads Form.FormItem, Form.FormLabel and so on. Functionally identical to the named-import style above; it just makes these three files grep differently from the other 21."
    >
      <Form {...form}>
        <form className="w-[24rem]">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Short title" {...field} />
                </FormControl>
                <FormDescription>Name of the access token.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// ui/form against base/form. base/form already ships in one file.
// ---------------------------------------------------------------------------

export const UiVsBase = createPreview({
  label: 'ui vs base',
  render: () => (
    <div className="flex max-w-3xl flex-col gap-4 text-sm">
      <p className="text-neutral-11">
        <code>base/form</code> already exists and is a near-port. Only{' '}
        <code>target/alerts/alert-form.tsx</code> uses it. The differences that matter:
      </p>
      <ul className="text-neutral-11 flex flex-col gap-3">
        <li>
          <strong className="text-neutral-12">FormControl.</strong> ui uses a Radix{' '}
          <code>Slot</code>, cloning the child to inject <code>id</code>,{' '}
          <code>aria-describedby</code>, <code>aria-invalid</code> and <code>border-red-500</code>.
          base wraps the child in a plain <code>div</code> carrying those attributes instead. So
          base never reaches the control itself, and an invalid field gets no red border unless the
          control opts in.
        </li>
        <li>
          <strong className="text-neutral-12">FormLabel.</strong> ui takes children; base takes a{' '}
          <code>label</code> prop. Every one of the 45 <code>FormLabel</code>s changes shape.
        </li>
        <li>
          <strong className="text-neutral-12">FormDescription.</strong> ui takes children at{' '}
          <code>text-sm</code>; base takes a <code>description</code> prop at{' '}
          <code>text-[13px]</code>.
        </li>
        <li>
          <strong className="text-neutral-12">Why it matters.</strong> The three access-token sheets
          spread a react-hook-form field onto a base <code>Select</code>, which is not a DOM node.
          Under ui/form the <code>Slot</code> has nothing to clone onto; under base/form the wrapper
          div sidesteps it. That is the open question for stage 4.5, and this is the preview to
          judge it against.
        </li>
      </ul>
    </div>
  ),
});

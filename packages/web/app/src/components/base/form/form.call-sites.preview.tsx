import { useEffect, useState } from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/base/button/button';
import { Popover } from '@/components/base/floating/popover/popover';
import { Select } from '@/components/base/floating/select/select';
import { Input } from '@/components/base/input/input';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Switch } from '@/components/base/switch/switch';
import { Textarea } from '@/components/base/textarea/textarea';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Heading } from '@/components/ui/heading';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';

export const nav: NavPath = 'Base/FormControls/Form/Component Examples';

/**
 * The forms of the app as they ship on `ui/form` (the shadcn field parts over react-hook-form)
 * and the standalone labels on `ui/label`. Twenty-six files use the form parts, all with
 * react-hook-form; seven use the label on its own. Too many to transcribe one by one, so each
 * preview is one shape, with the sites it stands for listed in the inventory.
 *
 * Read with `base/form`, which exists on the same react-hook-form plumbing with props-based
 * parts, and is on one call site, the alert rule form. What these shapes need that it does not
 * offer is the round's API work.
 */

const ENTRIES = [
  {
    source: 'pages/auth-sign-in.tsx:200',
    origin: 'ui',
    what: 'Sign in: label, input, message; a link beside the password label',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/auth-sign-up.tsx:220',
    origin: 'ui',
    what: 'Sign up: four plain fields',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/auth-reset-password.tsx:154',
    origin: 'ui',
    what: 'Reset password: one plain field',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/organization-new.tsx:143',
    origin: 'ui',
    what: 'New organization: slug field',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/organization-settings.tsx:280',
    origin: 'ui',
    what: 'Organization settings: slug field',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/project-settings.tsx:246',
    origin: 'ui',
    what: 'Project settings: slug field',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/target-settings.tsx:1477',
    origin: 'ui',
    what: 'Target settings: slug and endpoint fields',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/organization-support-ticket.tsx:94',
    origin: 'ui',
    what: 'Support ticket reply: one textarea',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/organization/members/roles.tsx:183',
    origin: 'ui',
    what: 'Role form: name, description, permissions',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/organization/members/invitations.tsx:178',
    origin: 'ui',
    what: 'Invite member: email and role',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/layouts/project.tsx:299',
    origin: 'ui',
    what: 'New target: slug field',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/target/laboratory/create-collection-modal.tsx:266',
    origin: 'ui',
    what: 'Collection: name and description',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/target/laboratory/edit-operation-modal.tsx:198',
    origin: 'ui',
    what: 'Edit operation: name',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/target/laboratory/create-operation-modal.tsx:216',
    origin: 'ui',
    what: 'Save operation: name, a long question label over a Select',
    coveredBy: 'Plain fields',
  },
  {
    source:
      'components/organization/settings/access-tokens/create-access-token-sheet-content.tsx:276',
    origin: 'ui',
    what: 'Access token sheet, namespace import: descriptions, an invalid item, a heading as label',
    coveredBy: 'With descriptions',
  },
  {
    source:
      'components/organization/settings/personal-access-tokens/create-personal-access-token-sheet-content.tsx:264',
    origin: 'ui',
    what: 'Personal token sheet: the same shape',
    coveredBy: 'With descriptions',
  },
  {
    source:
      'components/project/settings/access-tokens/create-project-access-token-sheet-content.tsx:288',
    origin: 'ui',
    what: 'Project token sheet: the same shape',
    coveredBy: 'With descriptions',
  },
  {
    source:
      'components/organization/settings/single-sign-on/connect-single-sign-on-provider-sheet.tsx:133',
    origin: 'ui',
    what: 'OIDC provider: seven fields, one with a description',
    coveredBy: 'With descriptions',
  },
  {
    source: 'components/organization/settings/single-sign-on/oidc-registered-domain-sheet.tsx:349',
    origin: 'ui',
    what: 'OIDC domain: field with a description',
    coveredBy: 'With descriptions',
  },
  {
    source: 'components/project/settings/external-composition.tsx:329',
    origin: 'ui',
    what: 'External composition: endpoint and secret with descriptions',
    coveredBy: 'With descriptions',
  },
  {
    source: 'pages/organization-support.tsx:140',
    origin: 'ui',
    what: 'Support: a radio group outside FormControl with wider spacing, subject and description',
    coveredBy: 'Control outside FormControl',
  },
  {
    source: 'components/layouts/organization.tsx:359',
    origin: 'ui',
    what: 'New project: slug, then a radio group outside FormControl, items with margin overrides',
    coveredBy: 'Control outside FormControl',
  },
  {
    source: 'pages/auth-sso.tsx:143',
    origin: 'ui',
    what: 'SSO sign in: a label with a help popover',
    coveredBy: 'Label with help',
  },
  {
    source: 'components/target/settings/registry-access-token.tsx:206',
    origin: 'ui',
    what: 'Registry token: an input with no label, a placeholder and a message',
    coveredBy: 'No label',
  },
  {
    source: 'components/base/input/input.spec.tsx:14',
    origin: 'ui',
    what: 'Input spec: FormControl cloning regression',
    coveredBy: 'Plain fields',
  },
  {
    source: 'components/base/textarea/textarea.spec.tsx:11',
    origin: 'ui',
    what: 'Textarea spec: the same',
    coveredBy: 'Plain fields',
  },
  {
    source: 'pages/target-proposals-new.tsx:685',
    origin: 'ui',
    what: 'Proposal title and description: standalone labels with padding',
    coveredBy: 'Standalone labels',
  },
  {
    source: 'pages/target-checks-single.tsx:150',
    origin: 'ui',
    what: 'Toggle Diff: a small label beside a switch',
    coveredBy: 'Standalone labels',
  },
  {
    source: 'components/v2/diff-editor.tsx:113',
    origin: 'ui',
    what: 'Toggle Diff: the same',
    coveredBy: 'Standalone labels',
  },
  {
    source: 'components/layouts/target.tsx:364',
    origin: 'ui',
    what: 'CDN dialog: two labels over selects',
    coveredBy: 'Standalone labels',
  },
  {
    source: 'pages/target-checks.tsx:421',
    origin: 'ui',
    what: 'Checks filters: two regular-weight labels beside switches, in rows',
    coveredBy: 'Standalone labels',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/form + ui/label"
      summary={
        <>
          Twenty-six form files and seven label files. Every form is react-hook-form; the parts used
          are Form, FormField, FormItem, FormControl and FormMessage everywhere, FormLabel in
          sixteen files, FormDescription in seven. Three sheets import the parts as a namespace.
          Only four class overrides exist, all spacing. Base has a Form on the same plumbing, on one
          call site, and no Label.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-sign-in.tsx:200 and the thirteen plain-label sites
// ---------------------------------------------------------------------------

const SignInSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

function SignIn(props: { invalid?: boolean }) {
  const form = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: props.invalid
      ? { email: 'ada@', password: 'short' }
      : { email: '', password: '' },
  });
  useEffect(() => {
    if (props.invalid) void form.trigger();
  }, [props.invalid]);
  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="email"
          render={() => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="m@example.com"
                  type="email"
                  onSurface="raised"
                  {...form.register('email')}
                />
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
              <div className="flex items-center">
                <FormLabel>Password</FormLabel>
                <a href="#" className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </a>
              </div>
              <FormControl>
                <Input type="password" onSurface="raised" {...form.register('password')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" width="full">
          Sign in
        </Button>
      </form>
    </Form>
  );
}

export const PlainFields = createPreview({
  label: 'Plain fields',
  render: () => (
    <div className="flex flex-col gap-10">
      <CallSite
        source="pages/auth-sign-in.tsx:200"
        origin="ui"
        note="The shape of thirteen sites: a 13px label, the control, a message line that reserves its height even when empty. The password label shares its row with a link."
      >
        <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[24rem] rounded-md border p-6">
          <SignIn />
        </div>
      </CallSite>
      <CallSite
        source="pages/auth-sign-in.tsx:200"
        origin="ui"
        note="The same form after a failed submit. The message is red text under the field; the field itself turns its border critical from aria-invalid, which FormControl clones onto it."
      >
        <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[24rem] rounded-md border p-6">
          <SignIn invalid />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/settings/access-tokens/create-access-token-sheet-content.tsx:276
// ---------------------------------------------------------------------------

const TokenSchema = z.object({
  title: z.string().min(1, 'Name is required.'),
  description: z.string(),
  expirationPeriod: z.string().min(1, 'Pick an expiration.'),
  permissions: z.array(z.string()).min(1, 'Pick at least one permission.'),
});

function TokenSheet() {
  const form = useForm({
    resolver: zodResolver(TokenSchema),
    defaultValues: { title: '', description: '', expirationPeriod: '', permissions: [] },
  });
  useEffect(() => {
    void form.trigger('expirationPeriod');
  }, []);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <Heading>General</Heading>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="My access token" onSurface="raised" {...field} />
                </FormControl>
                <FormDescription>Name of the access token.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-6 grid w-full max-w-sm items-center gap-1.5">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Short description" onSurface="raised" {...field} />
                </FormControl>
                <FormDescription>Description of the access token.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <FormField
            control={form.control}
            name="expirationPeriod"
            render={({ field, fieldState }) => (
              <FormItem aria-invalid={fieldState.invalid}>
                <FormLabel>Expiration</FormLabel>
                <FormControl>
                  <Select
                    options={[
                      { value: '7', label: '7 days' },
                      { value: '30', label: '30 days' },
                      { value: 'never', label: 'Never' },
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    width="full"
                    onSurface="raised"
                  />
                </FormControl>
                <FormDescription>
                  Expire the token automatically after a period of time.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-6 grid w-full items-center gap-1.5">
          <FormField
            control={form.control}
            name="permissions"
            render={() => (
              <FormItem>
                <FormLabel>
                  <Heading>Permissions</Heading>
                </FormLabel>
                <FormControl>
                  {/* PermissionSelector runs on fragments; a box stands in for it. */}
                  <div className="border-neutral-5 text-neutral-10 rounded-md border p-4 text-sm">
                    The permission selector, an accordion of groups with a Select per permission.
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}

export const WithDescriptions = createPreview({
  label: 'With descriptions',
  render: () => (
    <CallSite
      source="components/organization/settings/access-tokens/create-access-token-sheet-content.tsx:276"
      origin="ui"
      note="Three token sheets share this shape through a namespace import: label, control, description, message. The Expiration item carries aria-invalid from the field state, which nothing styles. The Permissions step puts a Heading inside a FormLabel over a selector that is not a form control at all, so the label points at nothing."
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[32rem] rounded-md border p-6">
        <TokenSheet />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-sso.tsx:143
// ---------------------------------------------------------------------------

function SsoSignIn() {
  const form = useForm({ defaultValues: { slug: '' } });
  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="slug"
          render={() => (
            <FormItem>
              <FormLabel className="flex flex-row items-center gap-x-2">
                Organization slug{' '}
                <Popover
                  trigger={
                    <button type="button" aria-label="What the organization slug is">
                      <CircleHelpIcon className="size-4" />
                    </button>
                  }
                  openOnHover
                  content={
                    <div className="text-neutral-11 text-sm">
                      <p>
                        The organization slug is the unique identifier used in your organization's
                        URLs.
                      </p>
                      <p>For instance, in app.graphql-hive.com/acme, "acme" is the slug.</p>
                    </div>
                  }
                />
              </FormLabel>
              <FormControl>
                <Input placeholder="acme" onSurface="raised" {...form.register('slug')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" width="full">
          Sign in
        </Button>
      </form>
    </Form>
  );
}

export const LabelWithHelp = createPreview({
  label: 'Label with help',
  render: () => (
    <CallSite
      source="pages/auth-sso.tsx:143"
      origin="ui"
      note="The one label with more than text: a help icon that opens a popover on hover, laid out by a class override on the label."
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[24rem] rounded-md border p-6">
        <SsoSignIn />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization-support.tsx:140 and components/layouts/organization.tsx:359
// ---------------------------------------------------------------------------

function SupportForm() {
  const form = useForm({ defaultValues: { priority: 'normal', subject: '' } });
  return (
    <Form {...form}>
      <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Priority level</FormLabel>
              <RadioGroup
                variant="as-card"
                onSurface="raised"
                orientation="vertical"
                value={field.value}
                onValueChange={field.onChange}
                items={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Enter a subject of your issue" onSurface="raised" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export const ControlOutsideFormControl = createPreview({
  label: 'Control outside FormControl',
  render: () => (
    <CallSite
      source="pages/organization-support.tsx:140"
      origin="ui"
      note="A radio group is not one input, so it sits in the item without a FormControl: the label points at nothing and the item widens its spacing by class. The new project form does the same with margin overrides on its two items."
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[28rem] rounded-md border p-6">
        <SupportForm />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/target/settings/registry-access-token.tsx:206
// ---------------------------------------------------------------------------

function RegistryTokenForm() {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        tokenDescription: z.string().min(2, 'Token description must be at least 2 characters long'),
      }),
    ),
    defaultValues: { tokenDescription: 'x' },
  });
  useEffect(() => {
    void form.trigger();
  }, []);
  return (
    <Form {...form}>
      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="tokenDescription"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Token description"
                  autoComplete="off"
                  onSurface="raised"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export const NoLabel = createPreview({
  label: 'No label',
  render: () => (
    <CallSite
      source="components/target/settings/registry-access-token.tsx:206"
      origin="ui"
      note="A field with no label at all: the placeholder does the naming, which vanishes once typed into. Shown with its message."
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[28rem] rounded-md border p-6">
        <RegistryTokenForm />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// ui/label on its own
// ---------------------------------------------------------------------------

function StandaloneLabels() {
  const [showDiff, setShowDiff] = useState(true);
  const [graph, setGraph] = useState('DEFAULT_GRAPH');
  return (
    <div className="flex flex-col gap-10">
      <CallSite
        source="pages/target-proposals-new.tsx:685"
        origin="ui"
        note="Proposal title and description: labels with a padding override over an input and a textarea."
      >
        <div className="flex w-[28rem] flex-col gap-4">
          <div>
            <Label htmlFor="proposal-title" className="p-1">
              Title
            </Label>
            <Input id="proposal-title" placeholder="A title for the proposal" />
          </div>
          <div>
            <Label className="p-1" htmlFor="proposal-description">
              Description
            </Label>
            <Textarea id="proposal-description" placeholder="What changes and why" />
          </div>
        </div>
      </CallSite>
      <CallSite
        source="pages/target-checks-single.tsx:150"
        origin="ui"
        note="Toggle Diff: a small, regular-weight label beside a switch in an SDL view's header bar. The diff editor has the same pair."
      >
        <div className="border-neutral-3 flex h-[36px] items-center justify-end border-b px-2">
          <div className="ml-2 flex items-center space-x-2">
            <Label htmlFor="toggle-diff-mode" className="text-xs font-normal">
              Toggle Diff
            </Label>
            <Switch id="toggle-diff-mode" checked={showDiff} onCheckedChange={setShowDiff} />
          </div>
        </div>
      </CallSite>
      <CallSite
        source="pages/target-checks.tsx:421"
        origin="ui"
        note="The checks list filters: a regular-weight label and a switch at each end of a row, twice."
      >
        <div className="flex w-72 flex-col gap-5">
          <div className="flex h-9 flex-row items-center justify-between">
            <Label
              htmlFor="filter-toggle-has-changes"
              className="text-neutral-11 text-sm font-normal"
            >
              Show only changed schemas
            </Label>
            <Switch
              id="filter-toggle-has-changes"
              checked={showDiff}
              onCheckedChange={setShowDiff}
            />
          </div>
          <div className="flex h-9 flex-row items-center justify-between">
            <Label
              htmlFor="filter-toggle-status-failed"
              className="text-neutral-11 text-sm font-normal"
            >
              Show only failed checks
            </Label>
            <Switch
              id="filter-toggle-status-failed"
              checked={!showDiff}
              onCheckedChange={v => setShowDiff(!v)}
            />
          </div>
        </div>
      </CallSite>
      <CallSite
        source="components/layouts/target.tsx:364"
        origin="ui"
        note="The CDN dialog: a plain label over each select, pointing at the trigger."
      >
        <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex w-[32rem] gap-3 rounded-md border p-6">
          <div>
            <Label htmlFor="cdn-graph">Graph Variant</Label>
            <Select
              id="cdn-graph"
              options={[
                { value: 'DEFAULT_GRAPH', label: 'Default Graph' },
                { value: 'mobile', label: 'mobile' },
              ]}
              value={graph}
              onValueChange={setGraph}
              width="lg"
              onSurface="raised"
            />
          </div>
          <div>
            <Label htmlFor="cdn-artifact">Artifact</Label>
            <Select
              id="cdn-artifact"
              options={[
                { value: 'sdl', label: 'GraphQL SDL' },
                { value: 'supergraph', label: 'Supergraph' },
              ]}
              value="sdl"
              width="lg"
              onSurface="raised"
            />
          </div>
        </div>
      </CallSite>
    </div>
  );
}

export const StandaloneLabelsPreview = createPreview({
  label: 'Standalone labels',
  render: () => <StandaloneLabels />,
});

import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Miscellaneous / Navigation, Theme, Admin, Apps, User',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Miscellaneous Components</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Collection of navigation, theme, admin, apps, and user settings components. These are shared
        across the application for layout navigation, theme switching, admin dashboards, app
        integrations, and user preferences.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Components by Category</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Navigation - Header, breadcrumb links, secondary nav</li>
        <li>Theme - Dark mode provider and switcher</li>
        <li>Admin - Admin dashboard statistics</li>
        <li>Apps - Application filter/selector</li>
        <li>User - User settings and preferences</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>header.tsx - Top navigation header</li>
        <li>primary-navigation-link.tsx - Breadcrumb link component</li>
        <li>secondary-navigation.tsx - Tab navigation below header</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Header Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Main application header:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Fixed position at top of page</li>
          <li>Hive logo/home link (left)</li>
          <li>Breadcrumb navigation (center)</li>
          <li>User menu and actions (right)</li>
          <li>Responsive layout (mobile hamburger menu)</li>
          <li>z-index layering for dropdowns</li>
          <li>Background with border bottom</li>
        </ul>
      </div>
      <pre className="text-neutral-12 bg-neutral-3 mt-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<Header>
  <HiveLogo />
  <Breadcrumbs>
    <OrganizationSelector />
    <ProjectSelector />
    <TargetSelector />
  </Breadcrumbs>
  <UserMenu />
</Header>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Primary Navigation Link</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<PrimaryNavigationLink
  linkProps={{
    to: "/$organizationSlug",
    params: { organizationSlug: "my-org" }
  }}
  linkText="My Organization"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>TanStack Router Link wrapper</li>
          <li>Breadcrumb-style link</li>
          <li>Hover/active states</li>
          <li>Type-safe routing props</li>
          <li>Consistent styling across app</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Secondary Navigation</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Tab navigation below header:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Tabs component for page sections</li>
          <li>Active tab indicator</li>
          <li>Links to different sections</li>
          <li>Right-aligned action buttons</li>
          <li>Sticky positioning (scrolls with page)</li>
          <li>Border bottom separator</li>
        </ul>
      </div>
      <pre className="text-neutral-12 bg-neutral-3 mt-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<SecondaryNavigation>
  <Tabs value={currentPage}>
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="members">Members</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
    </TabsList>
  </Tabs>

  {/* Right-aligned actions */}
  <Button>Create Project</Button>
</SecondaryNavigation>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Theme Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>theme-provider.tsx - React context for theme state</li>
        <li>theme-switcher.tsx - UI for switching between themes</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Theme Provider</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Theme management:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>React Context provider</li>
          <li>Persists theme to localStorage</li>
          <li>System preference detection</li>
          <li>Applies theme class to document</li>
          <li>SSR-safe implementation</li>
        </ul>
      </div>
      <pre className="text-neutral-12 bg-neutral-3 mt-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>

// Hook usage
const { theme, setTheme } = useTheme();
// theme: "light" | "dark" | "system"
// setTheme: (theme) => void`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Theme Switcher</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">UI for changing theme:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Dropdown menu with theme options</li>
          <li>Light, Dark, System options</li>
          <li>Current theme indicator (checkmark)</li>
          <li>Sun/Moon icons</li>
          <li>Located in user menu or settings</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Theme Implementation</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Using Tailwind CSS v4:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>CSS custom properties for colors</li>
          <li>neutral-1 through neutral-12 scale</li>
          <li>Automatic theme switching</li>
          <li>Dark mode via class strategy</li>
          <li>System preference: prefers-color-scheme</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Admin Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>AdminStats.tsx - Admin dashboard statistics</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Admin Stats</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Admin dashboard metrics:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Total users count</li>
          <li>Total organizations</li>
          <li>Total projects</li>
          <li>Total targets</li>
          <li>Operations this month</li>
          <li>Active users (MAU)</li>
          <li>Storage usage</li>
          <li>GraphQL queries to admin API</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Display:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Grid of stat cards</li>
          <li>Each card: label, value, trend</li>
          <li>Charts for historical data</li>
          <li>Refresh button</li>
          <li>Export data option</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Apps Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>AppFilter.tsx - Filter/search installed apps</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">App Filter</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">App integration filtering:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Search apps by name</li>
          <li>Filter by category (monitoring, CI/CD, etc.)</li>
          <li>Filter by status (installed, available)</li>
          <li>Sort by name, popularity, install date</li>
          <li>Quick filters (All, Installed, Available)</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">App integrations:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Slack - Notifications</li>
          <li>GitHub - CI/CD integration</li>
          <li>Datadog - Monitoring</li>
          <li>PagerDuty - Alerting</li>
          <li>Sentry - Error tracking</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">User Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>settings.tsx - User settings and preferences</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">User Settings</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">User preferences:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Profile information (name, email, avatar)</li>
          <li>Notification preferences</li>
          <li>Email notifications toggle</li>
          <li>Slack notifications toggle</li>
          <li>Theme preference</li>
          <li>Timezone selection</li>
          <li>Language preference (future)</li>
          <li>Personal access tokens management</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Sections:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Profile - Update name, avatar</li>
          <li>Account - Email, password change</li>
          <li>Notifications - Email/Slack preferences</li>
          <li>Preferences - Theme, timezone</li>
          <li>Security - PATs, sessions</li>
          <li>Danger Zone - Delete account</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation Structure</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`App Layout:
┌─────────────────────────────────────────────┐
│ Header (logo, breadcrumbs, user menu)      │
├─────────────────────────────────────────────┤
│ Secondary Nav (tabs, actions)              │
├─────────────────────────────────────────────┤
│                                             │
│ Page Content                                │
│                                             │
└─────────────────────────────────────────────┘`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>UpdateUserProfile - Update name, avatar</li>
        <li>UpdateUserPreferences - Notification, theme settings</li>
        <li>ChangePassword - Update password</li>
        <li>DeleteAccount - Remove user account</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Me - Current user info</li>
        <li>UserPreferences - User settings</li>
        <li>AdminStats - Admin dashboard data</li>
        <li>InstalledApps - User's installed apps</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Responsive Behavior</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Mobile - 768px</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Hamburger menu for navigation</li>
          <li>Breadcrumbs collapse to dropdown</li>
          <li>Secondary nav becomes scrollable tabs</li>
          <li>User menu in hamburger</li>
        </ul>
        <p className="text-neutral-11 text-xs">Desktop (≥ 768px):</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Full header with breadcrumbs</li>
          <li>Horizontal secondary nav</li>
          <li>User menu dropdown in header</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>@tanstack/react-router - Navigation links</li>
        <li>Radix UI - Dropdown menus, tabs</li>
        <li>lucide-react - Icons (Sun, Moon, Menu)</li>
        <li>React Context - Theme state</li>
        <li>localStorage - Theme persistence</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Header and secondary nav in all layouts</li>
        <li>Theme switching with system preference fallback</li>
        <li>Admin stats for platform monitoring</li>
        <li>App marketplace for integrations</li>
        <li>User settings for personalization</li>
        <li>Responsive design for mobile/desktop</li>
        <li>Type-safe routing with TanStack Router</li>
        <li>Accessible navigation (keyboard, screen readers)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components handle navigation, theming, admin
        dashboards, app integrations, and user preferences. See actual usage throughout the
        application.
      </p>
    </div>
  </div>
);

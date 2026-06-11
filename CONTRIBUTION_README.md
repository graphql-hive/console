## Reproduction Process

### Environment Setup

I cloned the GraphQL Hive repository locally and set up the development environment on macOS.

Commands and setup steps completed:

```bash
git clone https://github.com/Qimin5/console.git
cd console
```

Installed Node.js using nvm:

```bash
nvm install 24
nvm use 24
node -v
```

Node version used:

```bash
v24.16.0
```

Installed pnpm using Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

pnpm version used:

```bash
10.33.2
```

Installed Docker Desktop and verified Docker:

```bash
docker --version
```

Docker version used:

```bash
Docker version 29.5.3
```

Created the required local `.env` file:

```bash
echo "ENVIRONMENT=local" > .env
```

Installed dependencies:

```bash
pnpm i
```

Started local Docker dependencies and ran database migrations:

```bash
pnpm local:setup
```

Generated required GraphQL and database types:

```bash
pnpm generate
```

Built the project:

```bash
pnpm build
```

Started the local Hive development environment:

```bash
pnpm dev:hive
```

Opened the local app at:

```text
http://localhost:3000
```

I created a local user account, organization, project, and target. I was able to reach the target
Insights page locally.

### Branch Link

```text
https://github.com/Qimin5/console/tree/fix-issue-3816
```

### Issue

GitHub issue:

```text
#3816 - operation filter list on insights page is cut off at the bottom
```

### Steps to Reproduce

1. Start the local Hive development environment:

```bash
pnpm dev:hive
```

2. Open the local Hive app:

```text
http://localhost:3000
```

3. Sign in or create a local account.

4. Create or open an organization.

5. Create or open a project.

6. Select a target, such as:

```text
production
```

7. Open the **Insights** page.

8. Ensure the target has many operations available. The issue screenshot shows the operation filter
   modal with many operation names.

9. Click the **Operations** filter.

10. Open the **Filter by operation** list/modal.

11. Observe the operation list.

### Expected Behavior

The operation list should be fully scrollable. A user should be able to access all operation items,
including the items at the bottom of the list.

### Actual Behavior

When many operations are shown, the operation filter list overflows and gets cut off at the bottom.
Some operations are not visible or accessible.

---

## Solution Approach

### Understand

The bug is a UI overflow issue on the Insights page. The **Filter by operation** modal/list can
contain many operations. When the list is long, the modal does not constrain the list height
correctly, so the bottom of the list is cut off.

### Match

I will compare this modal with other Hive UI components that display scrollable lists, filters,
dialogs, or modals. I will look for existing patterns using fixed height, max height, overflow
behavior, or scrollable containers.

### Plan

1. Locate the frontend component responsible for the Insights operation filter.
2. Inspect the modal/list layout.
3. Check whether the operation list container has correct height or max-height styling.
4. Check whether the scroll behavior is applied to the correct container.
5. Add or adjust styling so the operation list is constrained and vertically scrollable.
6. Verify that all operation items can be reached when many operations are present.
7. Test the modal on different browser/window heights.

### Files to Investigate

Initial files found during investigation:

```text
packages/web/app/src/pages/target-insights.tsx
packages/web/app/src/components/target/insights/use-insights-filter-dimensions.ts
packages/web/app/src/components/target/insights/search-params.ts
packages/web/app/src/components/target/insights/list.tsx
packages/web/app/src/pages/target-insights-manage-filters.tsx
```

The likely fix is in the frontend Insights filter UI, not in the backend resolver or GraphQL tests.

### Implement

Implementation will happen in Phase III on my working branch:

```text
fix-issue-3816
```

### Review

I will review the project’s contributing and development documentation before opening a pull
request. I will make sure the fix follows the existing React, TypeScript, and styling patterns used
in the Hive dashboard.

### Evaluate

To verify the fix:

1. Start Hive locally.
2. Open a target with many operations.
3. Go to the Insights page.
4. Open the operation filter modal.
5. Confirm the operation list scrolls correctly.
6. Confirm no items are cut off at the bottom.
7. Run relevant checks or tests if available.

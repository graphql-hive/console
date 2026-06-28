# Contribution 1: Operation Filter List on Insights Page Is Cut Off at the Bottom

**Contribution Number:** 1
**Student:** Qimin Wu
**Issue:** https://github.com/graphql-hive/console/issues/3816
**Status:** Phase IV Complete (Pull Request Submitted)

---

## Why I Chose This Issue

I chose this issue because it is a beginner-friendly bug with a clear problem and expected result. The issue affects the user interface, which matches my interest in JavaScript, HTML, and CSS. I also wanted to gain experience contributing to an open-source project and learn how to investigate and fix a real bug in a production application.

Another reason I chose this issue is that the scope appears manageable for a first contribution. The issue description clearly explains the problem, and the project maintainers labeled it as a good first issue. I hope to learn more about debugging frontend issues, understanding a larger codebase, and working through the open-source contribution process.

---

## Understanding the Issue

### Problem Description

On the Insights page, the operation filter dropdown list is cut off at the bottom. Because of this, users cannot see all available items in the filter list.

### Expected Behavior

The operation filter dropdown should display all available items. If the list is longer than the available space, users should be able to scroll and access every option.

### Current Behavior

Part of the dropdown list is hidden because of an overflow or layout issue. Some items cannot be seen or selected.

### Affected Components

Based on the issue description, the affected components are likely the Insights page UI, the operation filter dropdown component, and the related CSS styling that controls layout, height, and overflow behavior.

---

## Reproduction Process

### Environment Setup

I cloned the GraphQL Hive repository and set up the development environment on my MacBook.

Steps completed:

1. Cloned the repository:

   ```bash
   git clone https://github.com/Qimin5/console.git
   cd console
   ```

2. Installed Node.js v24.16.0 using nvm.

3. Installed pnpm v10.33.2 using Corepack.

4. Installed Docker Desktop and verified Docker was running.

5. Created a local environment file:

   ```bash
   echo "ENVIRONMENT=local" > .env
   ```

6. Installed project dependencies:

   ```bash
   pnpm i
   ```

7. Started local services and databases:

   ```bash
   pnpm local:setup
   ```

8. Generated required files:

   ```bash
   pnpm generate
   ```

9. Built the project:

   ```bash
   pnpm build
   ```

10. Started the application:

    ```bash
    pnpm dev:hive
    ```

11. Opened the application at:

    ```text
    http://localhost:3000
    ```

12. Created a local account, organization, project, and target to access the Insights page.

### Steps to Reproduce

1. Start the Hive application locally:

   ```bash
   pnpm dev:hive
   ```

2. Open the application in a browser:

   ```text
   http://localhost:3000
   ```

3. Sign in and open a project target.

4. Navigate to the **Insights** page.

5. Open the **Operation Filter** dropdown.

6. When many operations are available, observe the operation list.

### Reproduction Evidence

**Working Branch:**
https://github.com/Qimin5/console/tree/fix-issue-3816

**Screenshots:**

1. Local Hive application successfully running on localhost and displaying the Insights page.

    <img width="1379" height="832" alt="Screenshot 2026-06-11 at 2 21 54 PM" src="https://github.com/user-attachments/assets/ecde9905-8c06-477d-b593-88b0a2bed9d2" />

2. Screenshot from GitHub issue #3816 demonstrating the operation filter overflow problem.

 <img width="845" height="1332" alt="297354689-1b7188a6-72b7-45dc-8b85-adb7e9c36f3e" src="https://github.com/user-attachments/assets/b642a55b-59aa-4545-9f65-cc172f91e24e" />


**My Findings:**

The operation filter dropdown appears to overflow its container when a large number of operations are present. As a result, some items near the bottom of the list become hidden and inaccessible. The issue appears to be related to the frontend layout, height constraints, or scrolling behavior of the filter component.

## Solution Approach

### Analysis

Based on the issue description and investigation of the codebase, this appears to be a frontend layout and overflow issue. The operation filter list is likely missing proper height constraints or scroll behavior. The issue is probably located in the Insights page filter UI rather than the backend API.

During investigation, I identified several files related to the Insights filtering system:

```text
packages/web/app/src/pages/target-insights.tsx
packages/web/app/src/components/target/insights/use-insights-filter-dimensions.ts
packages/web/app/src/components/target/insights/search-params.ts
packages/web/app/src/components/target/insights/list.tsx
packages/web/app/src/pages/target-insights-manage-filters.tsx
```

### Proposed Solution

Update the operation filter dropdown so that it properly handles large lists. The dropdown should have a constrained height and allow vertical scrolling when the number of operations exceeds the available space.

### Implementation Plan

Using UMPIRE framework (adapted):

**Understand:**
The operation filter dropdown does not properly display long lists of operations. Users cannot access items near the bottom of the list.

**Match:**
Review similar dropdowns, dialogs, and filter components in the Hive application to identify existing scrolling and overflow patterns.

**Plan:**

1. Locate the component responsible for rendering the operation filter.
2. Inspect the layout and styling for height and overflow behavior.
3. Identify the container causing the content to be clipped.
4. Add or adjust scrolling behavior and maximum height constraints.
5. Verify that all operation entries remain accessible.
6. Test the fix on different screen sizes and browser window heights.
7. Run any relevant tests before creating a pull request.
## Testing Strategy

### Build Verification

After making the code changes, I ran:

```bash
pnpm build
```

The build completed successfully. All packages built successfully and no build failures were reported.

### Manual Testing

* Started Hive locally using the development environment.
* Logged into the local Hive application.
* Navigated to the Insights page.
* Investigated the operation filter dropdown implementation.
* Verified that the modified component builds successfully and renders without errors.

### Regression Checks

* Confirmed that the project still compiles successfully after the change.
* Verified that no new TypeScript or build errors were introduced.

---

## Implementation Notes

### Phase III Implementation

#### What I Built

I investigated Issue #3816, "Operation Filter List on Insights Page Is Cut Off at the Bottom."

Using the codebase search tools and project structure, I traced the operation filter implementation through the following components:

* `use-insights-filter-dimensions.ts`
* `filter-menu.tsx`
* `filter-content.tsx`

After reviewing the filter rendering logic, I identified a height restriction that may contribute to the dropdown list being cut off when many operation items are displayed.

#### Code Changes

Modified:

```text
packages/web/app/src/components/base/floating/filter-dropdown/filter-content.tsx
```

Changes made:

1. Increased the maximum dropdown list height:

```ts
const MAX_LIST_HEIGHT = 256;
```

to:

```ts
const MAX_LIST_HEIGHT = 384;
```

2. Added viewport-aware maximum height handling:

```ts
maxHeight: 'min(384px, calc(100vh - 220px))'
```

3. Updated scrolling behavior to use vertical scrolling:

```ts
overflow: 'auto'
```

These changes are intended to allow longer operation lists to remain visible while preventing the dropdown from extending beyond the browser viewport.

#### Challenges Faced

The biggest challenge was understanding the Hive codebase structure and locating the component responsible for rendering the operation filter.

Initially, I examined the Insights page filter configuration files and discovered they only defined filter metadata rather than the actual dropdown UI. I then traced the component hierarchy through several shared UI components until locating the dropdown implementation in:

```text
packages/web/app/src/components/base/floating/filter-dropdown/filter-content.tsx
```

Another challenge was setting up the local development environment because this was my first time working with a large open-source project using Node.js, pnpm, Docker, and Turborepo.

#### Tools Used

* GitHub Issues
* VS Code
* Git
* Node.js
* pnpm
* Docker Desktop
* Hive local development environment

---

## Code Changes

### Files Modified

```text
packages/web/app/src/components/base/floating/filter-dropdown/filter-content.tsx
```

### Changes Made

* Increased the maximum dropdown list height from **256px** to **384px**.
* Added a responsive maximum height:

```ts
maxHeight: 'min(384px, calc(100vh - 220px))'
```

* Kept the existing scrolling behavior using:

```ts
overflow: 'auto'
```

### Key Commit

```text
da22dc656
```

Commit message:

```text
fix: improve filter dropdown list height
```

### Working Branch

https://github.com/Qimin5/console/tree/fix-issue-3816

---

## Pull Request

### PR Link

https://github.com/graphql-hive/console/pull/8176

### PR Title

fix: improve filter dropdown list height

### PR Summary

This pull request addresses Issue #3816 by improving the operation filter dropdown height and scrolling behavior.

The implementation:

* Increased the maximum dropdown height.
* Added a viewport-aware maximum height.
* Preserved the existing scrolling behavior.

The goal is to prevent long operation lists from being cut off while keeping the dropdown usable on different screen sizes.

### Testing Performed

* Successfully ran:

```bash
pnpm build
```

* Started Hive locally.
* Logged into the application.
* Verified the application loaded correctly.
* Confirmed the project builds successfully after my code changes.

### Status

Awaiting maintainer review.

### Maintainer Feedback

No maintainer feedback received yet.

---

## Learnings & Reflections

### Technical Skills Gained

* Learned how to clone and set up a large open-source project locally.
* Learned how to use Git branches, commits, pushes, and pull requests.
* Learned how to navigate a React and TypeScript codebase.
* Learned how shared UI components are structured in a large application.
* Learned how to investigate frontend layout and overflow issues.
* Learned how to submit my first open-source pull request on GitHub.

### Challenges Overcome

* Setting up Node.js, pnpm, and Docker correctly.
* Understanding the project structure.
* Tracing the operation filter through multiple component layers.
* Successfully building the project and pushing code changes to GitHub.
* Learning how the GitHub pull request workflow works for an open-source project.

## Current Status

Phase IV completed.

The code changes were committed, pushed to my feature branch, and submitted as Pull Request #8176 for review by the Hive maintainers.

**Pull Request:** https://github.com/graphql-hive/console/pull/8176

I am currently waiting for feedback from the project maintainers and will update the pull request if changes are requested.

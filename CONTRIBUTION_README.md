# Contribution 1: Operation Filter List on Insights Page Is Cut Off at the Bottom

**Contribution Number:** 1
**Student:** Qimin Wu
**Issue:** https://github.com/graphql-hive/console/issues/3816
**Status:** Phase I Complete

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

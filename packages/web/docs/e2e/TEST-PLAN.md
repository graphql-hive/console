# E2E Test Plan - GraphQL Hive Docs & Landing Page

## Philosophy

Tests model **complete user journeys** — not isolated smoke tests. Each test represents a real
scenario: a developer evaluating Hive, learning federation, finding CLI commands, etc.

## Test Structure

```
e2e/
├── playwright.config.ts
├── TEST-PLAN.md
├── landing-page.spec.ts   # 5 user journeys
├── docs-navigation.spec.ts # 7 user journeys
├── search.spec.ts         # 5 user journeys
└── blog.spec.ts           # 7 user journeys
```

## User Journeys

### Landing Page (`landing-page.spec.ts`)

| Journey                          | Description                                                                |
| -------------------------------- | -------------------------------------------------------------------------- |
| New visitor explores Hive        | Lands on homepage → explores feature tabs → reads FAQ → clicks sign-up CTA |
| Developer researching federation | Homepage → federation page → reads guide → navigates to docs               |
| User compares pricing            | Homepage → pricing → reviews plans → finds enterprise contact              |
| Developer explores Gateway       | Homepage → gateway → explores features → finds deployment docs             |
| Direct FAQ access                | Receives shared FAQ link → specific item is visible                        |

### Documentation (`docs-navigation.spec.ts`)

| Journey                          | Description                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------ |
| New user getting started         | Docs landing → get started → first steps → follows code examples → next page   |
| Publish schema to registry       | Schema registry docs → publishing guide → finds CLI examples → breadcrumb back |
| Configure Gateway for production | Gateway docs → deployment options → Docker/K8s examples → features section     |
| Migrate from Apollo              | Docs → migration guides → Apollo-specific guide → step-by-step content         |
| Explore CLI reference            | API reference → CLI commands → code examples → GraphQL API link                |
| Mobile docs navigation           | Hamburger menu → sidebar opens → navigates to section                          |
| Deep navigation with breadcrumb  | Nested doc page → uses breadcrumb to navigate up hierarchy                     |

### Search (`search.spec.ts`)

| Journey                       | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| Search for federation setup   | Opens search → types query → clicks result → lands on docs                |
| Search from landing page      | Uses search trigger/shortcut → finds topic → keyboard navigates to result |
| Refine search for CLI command | Broad search → refines query → finds specific result                      |
| Handle empty results          | Searches nonsense → sees no results → clears and retries successfully     |
| Keyboard-only navigation      | Opens search with shortcut → types → arrow keys → Enter to select         |

### Blog & Content (`blog.spec.ts`)

| Journey                        | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| Discover Hive through blog     | Blog list → reads post → navigates to docs             |
| Browse by tag                  | Blog → clicks tag → sees filtered posts                |
| Read case study to evaluate    | Case studies → reads one → finds CTA to sign up        |
| Check product updates          | Product updates → reads recent update → navigates back |
| Multiple blog posts in session | Blog → read post → back → read another                 |
| Explore ecosystem & partners   | Ecosystem page → partners page → FAQ → contact CTA     |
| Discover OSS friends           | OSS friends → sees external project links              |

## Selector Strategy

Following Playwright best practices:

1. `getByRole('button', { name: 'Submit' })` - primary
2. `getByRole('link', { name: /get started/i })` - links
3. `getByRole('heading', { level: 1 })` - page titles
4. `getByRole('tab')` - tabs
5. `getByPlaceholder(/search/i)` - search inputs
6. `locator('[data-state="open"]')` - Radix UI state (accordion)

Avoid: CSS classes, nth-child, generated IDs.

## Running Tests

```bash
# Install Playwright (if needed)
pnpm add -D @playwright/test
npx playwright install

# Run all tests
pnpm playwright test --config=e2e/playwright.config.ts

# Run specific file
pnpm playwright test e2e/landing-page.spec.ts

# Run with UI
pnpm playwright test --ui

# Debug mode
pnpm playwright test --debug
```

## Notes

- Static site (Next.js export) - tests run against built output or dev server
- Pagefind search loads async - tests use polling/retry patterns
- Feature tabs & FAQ use Radix UI - test via `data-state` attributes
- Mobile tests use viewport resize, not separate device config

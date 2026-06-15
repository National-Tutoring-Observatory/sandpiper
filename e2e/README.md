# E2E Tests

End-to-end tests for the Sandpiper application using Playwright.

## Prerequisites

- Application server running on `http://localhost:5173`
- Database with seeded data (project "Tutoring Transcripts Study 2024" with sessions, prompts, and models)
- Environment variables set in `.env` (`SUPER_ADMIN_GITHUB_ID`, `DOCUMENT_DB_*`, `SESSION_SECRET`)

## Running Tests

Authentication is handled automatically — the setup project generates a session cookie using your `SUPER_ADMIN_GITHUB_ID` and database credentials.

```bash
# Run all e2e tests (from project root)
yarn test:e2e

# Run tests in UI mode (interactive)
yarn test:e2e:ui

# Run tests with browser visible
yarn test:e2e:headed
```

## Test Suites

**Note:** Some tests **create real data** in your database.

### Projects (`projects.spec.ts`)

- Display projects list
- Navigate to project detail
- Show edit/delete buttons
- Create project dialog and validation
- Breadcrumb navigation

### Run Sets (`runSets.spec.ts`)

- **Create a new run set** (creates real data)
- Display run sets list
- Navigate to run set detail
- Export menu options
- Display sessions and runs
- Breadcrumb navigation

### Runs (`runs.spec.ts`)

- **Create a new run** (creates real data)
- Display runs list
- Navigate to run detail
- Show run metadata (annotation type, prompt, model)
- Sessions list display
- Export menu options

### Prompts (`prompts.spec.ts`)

- Display prompts list
- Show annotation types
- Navigate to prompt detail
- Display versions
- Show prompt content and schema
- Sidebar navigation
- **Edit prompt title from list page** (modifies real data)
- **Edit prompt title from detail page** (modifies real data)

### Prompt Library (`promptLibrary.spec.ts`)

Two serial describe blocks, each with its own setup:

**Guardrails (curator-side)**

- **Create + publish a prompt** (creates real data; ends with prompt unpublished)
- Edit-while-published shows "will go live" warning
- Delete is disabled with tooltip while published
- Published prompt appears under `/prompt-library`
- Unpublish re-enables Delete

**Copy flow (consumer-side)**

- **Create + publish a separate prompt, then copy it to the active team** (creates real data)

### Security Headers (`securityHeaders.spec.ts`)

- CSP (report-only by default, enforcing with `CSP_ENFORCE=true`) carries a per-request nonce that matches the SSR `<script>` tags
- Hardening headers present (HSTS, `X-Content-Type-Options`, `Referrer-Policy`)
- `/api/csp-report` accepts violation reports (204) and rejects GET (405)

> The headers are always on in production (CI builds + runs with
> `NODE_ENV=production`). To run this spec against a local dev server, start it
> with `ENABLE_SECURITY_HEADERS=true yarn app:dev`.

## Configuration

### Browser Selection

Set `PLAYWRIGHT_BROWSER_EXECUTABLE_PATH` in your `.env` file:

```bash
# macOS Brave
PLAYWRIGHT_BROWSER_EXECUTABLE_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'

# macOS Chrome
PLAYWRIGHT_BROWSER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Linux Chrome
PLAYWRIGHT_BROWSER_EXECUTABLE_PATH='/usr/bin/google-chrome'
```

If not set, Playwright uses the default Chrome installation. In CI, it uses Playwright's bundled Chromium.

Full configuration in `e2e/playwright.config.ts`.

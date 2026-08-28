# Sandpiper - Copilot Instructions

## Repository Overview

**Sandpiper** is the National Tutoring Observatory's (NTO) React-based web application designed for analyzing one-on-one tutoring data. The app enables researchers to normalize, de-identify, and automatically annotate tutoring transcripts using large language models (LLMs). Users can create custom prompts, organize work into projects/runs/sessions, and export annotated data in CSV/JSON formats.

**Repository size**: ~446 source files (excluding node_modules), ~276MB total
**Primary language**: TypeScript (React 19)
**Framework**: React Router v7 with SSR
**Build tool**: Vite 6
**Package manager**: Yarn 1.22+ (preferred) or npm
**Node version**: 20.x (as per Dockerfile and CI)
**UI Framework**: Tailwind CSS 4 with shadcn/ui components (Radix UI)

## Problem-Solving Approach

**CRITICAL**: Always think before coding. Understand the problem fully before implementing solutions.

### Before Writing Code

1. **Analyze the request** - Break down what the user is actually asking for
2. **Ask clarifying questions** - If anything is unclear or ambiguous
3. **Understand the context** - Check existing code patterns and architecture
4. **Plan your approach** - Think through the solution before implementing
5. **Consider edge cases** - What could go wrong or be misunderstood?

### When to Ask Questions

- **Unclear requirements** - "Which specific component should handle this?"
- **Multiple approaches** - "Would you prefer to modify the existing component or create a new one?"
- **Scope ambiguity** - "Should this apply to all forms or just this specific one?"
- **Technical decisions** - "Should I use the existing API pattern or create a new endpoint?"
- **Missing context** - "What should happen when the user doesn't have permission?"

### Examples of Good Clarification

```
// ❌ Jumping straight to code
User: "Add a delete button"
Assistant: *immediately writes delete button code*

// ✅ Understanding first
User: "Add a delete button"
Assistant: "I'd like to clarify a few things:
- Which component/page should have the delete button?
- What should it delete (user, project, session)?
- Should there be a confirmation dialog?
- What permissions are needed?
Let me check the existing patterns..."
```

### When to proceed with coding

- Once you have a clear understanding of the requirements and context
- After confirming any ambiguities with the user
- Start development and apply the changes to the codebase

### Problem-Solving Workflow

1. **Read and understand** the full request
2. **Examine existing code** to understand patterns and find similar implementations
3. **Ask questions** if anything is unclear
4. **Look for reusable components** or established patterns before creating new ones
5. **Explain your approach** before implementing
6. **Write code** that follows project conventions
7. **Test and verify** the solution works

## Build & Validation Commands

### Prerequisites

1. **Node.js 20.x or higher** is required
2. **Yarn 1.22+** is the preferred package manager (though npm will work)
3. **Environment file**: Copy `.env.example` to `.env` before running the app

### Installation

Always run installation with frozen lockfile to match CI:

```bash
yarn install --frozen-lockfile
```

**Time**: ~30-40 seconds
**Note**: You may see a warning about `package-lock.json` - this is expected and safe to ignore

### TypeCheck

Run before committing to catch type errors (required by CI):

```bash
yarn typecheck
```

**Time**: ~7-8 seconds
**What it does**: Runs `react-router typegen && tsc` to generate route types and check TypeScript

### Build

Always run before testing production behavior:

```bash
yarn app:build
```

**Time**: ~8-10 seconds
**What it does**:

1. Runs `node ./app/adapters.js` to generate storage adapter imports
2. Runs `react-router build` to create production build in `./build/`
   **Expected warnings**: You'll see warnings about unused imports (useCallback, icons, etc.) - these are safe to ignore

### Development Server

```bash
yarn app:dev
```

**Port**: http://localhost:5173
**What it does**: Runs adapters.js first, then starts dev server with HMR
**Note**: For full functionality (workers, Socket.IO), also run `yarn redis` in a separate terminal

### Production Server

```bash
yarn start
```

**Port**: 5173 (configurable via PORT env var)
**Prerequisites**: Must run `yarn build` first

### Redis (For Background Jobs & Socket Communication)

```bash
yarn local:redis
```

**What it does**: Starts redis-memory-server for local development (if REDIS_URL not set)
**When needed**: Required for workers, Socket.IO, and BullMQ functionality
**Production**: Set REDIS_URL environment variable instead

### Workers (Background Jobs)

```bash
yarn workers:dev
```

**What it does**: Starts BullMQ workers for background task processing
**Prerequisites**: Redis must be running (use `yarn redis` or set REDIS_URL)
**Note**: Workers are now a yarn workspace, so `yarn install` at the root handles all dependencies

## CI/CD Validation

### GitHub Actions Workflows

**1. TypeCheck Workflow** (`.github/workflows/typecheck.yml`)

- **Triggers**: Pull requests and pushes to main
- **Node version**: 22
- **Steps**:
  1. `yarn install --frozen-lockfile`
  2. `yarn typecheck`
- **To replicate locally**: Run the exact same commands above

**2. Release Workflow** (`.github/workflows/release.yml`)

- **Triggers**: Tags matching `v[0-9]+.[0-9]+.[0-9]+` (e.g., v1.2.3)
- **What it does**: Builds Docker image and deploys to AWS ECS
- **Docker build uses**: Node 25-alpine with yarn
- **Build command in Docker**: `yarn build` (after `yarn install --frozen-lockfile --production`)

### Pre-commit Checklist

Before committing, always:

1. ✅ Run `yarn typecheck` - must pass with no errors
2. ✅ Run `yarn build` - must complete successfully
3. ✅ If modifying storage/document adapters, ensure `app/adapters.js` runs correctly

## Architecture Overview

### Adapter Pattern for Storage & Database

The application uses a **plugin-based adapter pattern** to support multiple storage and database backends without changing business logic:

**Storage Adapters** (`app/storageAdapters/`):

- Handle file storage operations (upload, download, remove, request)
- Three implementations: `local/` (filesystem), `awsS3/` (AWS S3), and `gcs/` (Google Cloud Storage)
- Each adapter registers itself via `registerStorageAdapter()` with a common interface
- Selected at runtime via `STORAGE_ADAPTER` env variable
- Interface: `{ name, download, upload, remove, request }`

**Document Adapters** (`app/documentsAdapters/`):

- Handle database operations (CRUD for collections)
- Two implementations: `local/` (in-memory) and `documentDB/` (MongoDB/DocumentDB)
- Each adapter registers itself via `registerDocumentsAdapter()` with a common interface
- Selected at runtime via `DOCUMENTS_ADAPTER` env variable
- Interface: `{ name, getDocuments, createDocument, getDocument, updateDocument, deleteDocument }`

**How it works**:

1. On startup, `app/adapters.js` scans `storageAdapters/` and generates `app/modules/storage/storage.ts`
2. This file imports all adapter implementations, causing them to self-register
3. Application code calls `getStorageAdapter()` or `getDocumentsAdapter()` to get the active adapter
4. Adapters are selected based on env variables, making backend switching seamless

### React Router Error Handling Pattern

The codebase follows a **consistent error handling convention** for React Router loaders and actions:

**Loaders** (data fetching):

- Use `redirect()` for authentication/authorization failures
- Return redirect responses to guide users to appropriate pages
- Example: `if (!user) return redirect('/')`

**Actions** (mutations):

- Use `throw new Error()` for validation and business logic failures
- Throw errors for missing/invalid data, unauthorized access
- Errors are caught by React Router's error boundary
- Example: `if (!name) throw new Error("Name is required")`

**Why this pattern?**

- Loaders redirect on auth failures (user should be redirected somewhere)
- Actions throw on validation failures (user should see error in context)
- Consistent across all routes for predictable behavior

### Key Directory Structure

- **`/app/modules/`** - Feature modules (projects, prompts, sessions, etc.)
- **`/app/uikit/`** - Reusable UI components (shadcn/ui)
- **`/app/storageAdapters/`** - Storage implementations (local filesystem, AWS S3, Google Cloud Storage)
- **`/app/documentsAdapters/`** - Database implementations (local in-memory, MongoDB/DocumentDB)
- **`/app/adapters.js`** - **CRITICAL**: Auto-generates storage imports
- **`/workers/`** - Background job workers (yarn workspace)
- **`/documentation/`** - Feature documentation and domain concepts

### Key Configuration Files

- **package.json**: Main dependencies and scripts
- **tsconfig.json**: TypeScript config with path aliases (`@/*` → `./app/uikit/*`, `~/*` → `./app/*`)
- **vite.config.ts**: Vite config with React Router, Tailwind, and tsconfig paths plugins
- **react-router.config.ts**: React Router v7 config (SSR enabled)
- **components.json**: shadcn/ui configuration
- **.env**: Environment variables (copy from `.env.example`)
- **Dockerfile**: Multi-stage Docker build (uses Node 20-alpine, npm, not yarn)
- **.gitignore**: Excludes `build/`, `node_modules/`, `.env`, `data/`, `storage/`, `tmp/`, `.react-router/`

### Important Build Artifacts (Gitignored)

- `./build/` - Production build output
- `./.react-router/` - Generated route types
- `./app/modules/storage/storage.ts` - Auto-generated by adapters.js (DO NOT EDIT MANUALLY)

## Critical Build Process

### The Adapters System

**IMPORTANT**: The `app/adapters.js` script MUST run before build/dev:

- **What it does**: Scans `app/storageAdapters/` and auto-generates `app/modules/storage/storage.ts`
- **Why**: This file imports all storage adapter implementations
- **When**: Both `yarn app:build` and `yarn app:dev` run it automatically
- **Manual**: `node ./app/adapters.js` (rarely needed)

If you add/remove storage adapters, the build will automatically regenerate the imports.

## Environment Configuration

### Required Environment Variables

```bash
# .env file (copy from .env.example)

# Storage adapter (LOCAL, AWS_S3, or GCS)
STORAGE_ADAPTER='LOCAL'

# Documents adapter (LOCAL or DOCUMENT_DB)
DOCUMENTS_ADAPTER='LOCAL'

# LLM Provider (AI_GATEWAY, OPEN_AI, or VERTEX_AI)
LLM_PROVIDER='AI_GATEWAY'

# Session encryption (generate with: openssl rand -hex 64)
SESSION_SECRET='...'

# GitHub OAuth (for authentication)
GITHUB_CLIENT_ID='...'
GITHUB_CLIENT_SECRET='...'
SUPER_ADMIN_GITHUB_ID='...'

# Auth callback
AUTH_CALLBACK_URL='http://localhost:5173/auth/callback'

# Redis configuration (choose one)
# REDIS_LOCAL='true'                  # Use local Redis (development)
# REDIS_URL='redis://localhost:6379' # External Redis URL (production)
```

### Optional Environment Variables

- AWS credentials (if using AWS_S3 or DOCUMENT_DB)
- AI Gateway credentials (if using AI_GATEWAY)
- OpenAI key (if using OPEN_AI provider)
- `GCS_BUCKET` + `GOOGLE_APPLICATION_CREDENTIALS` (if using the GCS storage adapter)
- `VERTEX_AI_PROJECT` + `VERTEX_AI_LOCATION` + `GOOGLE_APPLICATION_CREDENTIALS` (if using the VERTEX_AI provider) — see CONTRIBUTING.md for manual GCP setup steps

## Troubleshooting: Root Causes

When encountering issues, focus on understanding and fixing the root cause rather than working around problems:

### Type errors during build

**Root cause**: TypeScript compilation errors in your code or missing type definitions
**Diagnosis**: Run `yarn typecheck` to see detailed error messages with file locations
**Fix**: Address the type errors in the indicated files. Don't ignore type errors.
**Note**: Build warnings about unused imports (useCallback, icons) are expected and safe to ignore - these are not errors.

### Storage imports not found

**Root cause**: The `app/adapters.js` script failed or didn't run, so `app/modules/storage/storage.ts` wasn't generated
**Diagnosis**: Check if `app/modules/storage/storage.ts` exists and contains imports
**Fix**:

1. Manually run `node ./app/adapters.js` to see any errors
2. Verify storage adapter directories have proper `index.ts` files
3. Check that adapters call `registerStorageAdapter()` correctly
   **Prevention**: Both `yarn build` and `yarn dev` run this automatically

### Module not found errors

**Root cause**: Stale or corrupted dependencies, or mismatched lock file
**Diagnosis**: Check if `node_modules/` or `.react-router/` have stale generated code
**Fix**:

1. Delete `node_modules/`, `.react-router/`, and optionally `build/`
2. Run `yarn install --frozen-lockfile` (matches CI exactly)
3. Run `yarn typecheck` to verify types, then `yarn build`
   **Prevention**: Always use `--frozen-lockfile` to match the lock file

### Workers failing to start

**Root cause**: Missing dependencies or Redis configuration
**Diagnosis**: Check if root `yarn install` was run and Redis is available
**Fix**: Run `yarn install` at the root (handles all workspaces) and ensure Redis is running
**Note**: Workers are a yarn workspace managed by the root package.json

### Port 5173 already in use

**Root cause**: Another dev server or process is already using the port
**Diagnosis**: Run `lsof -i :5173` (Unix) or `netstat -ano | findstr :5173` (Windows)
**Fix**: Kill the existing process or set a different port: `PORT=3000 yarn dev`
**Alternative**: Configure a different default port in your environment

## Path Aliases

When importing files, use these aliases:

- `@/*` → `./app/uikit/*` (UI components)
- `~/*` → `./app/*` (app modules)

Examples:

```typescript
import { Button } from "@/components/ui/button";
import { getProjects } from "~/modules/projects/queries";
```

## Testing

**No automated test suite currently exists**. Manual testing recommended:

1. Run `yarn dev` and test features in browser
2. Check console for errors
3. Verify builds succeed with `yarn build`
4. Run `yarn typecheck` for type safety

## Key Dependencies

### Production

- **React 19** & **React DOM 19**: UI framework
- **React Router 7**: Routing with SSR
- **Mongoose 8**: MongoDB/DocumentDB ORM
- **BullMQ 5**: Background job queue (requires Redis)
- **AWS SDK v3**: S3 storage integration
- **OpenAI SDK**: LLM integration
- **Tailwind CSS 4**: Styling with CSS variables
- **Radix UI**: Accessible headless component primitives
- **shadcn/ui**: Pre-built UI components (New York style)
- **Lucide React**: Icon library
- **next-themes**: Theme management (dark/light mode)
- **Sonner**: Toast notifications
- **Motion**: Modern animation library
- **clsx + tailwind-merge**: Conditional className utilities
- **class-variance-authority**: Component variant management
- **cmdk**: Command palette/search UI
- **react-dropzone**: File upload handling
- **dayjs**: Date handling
- **archiver**: ZIP file creation
- **Socket.io**: Real-time communication

### Development

- **TypeScript 5.8**: Type checking
- **Vite 6**: Build tool & dev server
- **@react-router/dev**: React Router tooling

## UI Component Development

### Component Library Stack

- **Radix UI**: Headless, accessible component primitives (Root + Indicator pattern)
- **shadcn/ui**: Pre-built components in `app/uikit/components/ui/`
- **Tailwind CSS 4**: Utility-first styling with CSS variables for theming
- **Lucide React**: Icon library (configured in `components.json`)
- **next-themes**: Dark/light mode support
- **Sonner**: Toast notifications
- **Motion**: Modern animations (Framer Motion successor)

### Component Patterns

- **Use compound components**: Radix components follow `Primitive.Root` + `Primitive.Trigger/Content/Indicator` patterns
- **Styling utility**: Use `cn()` function from `@/lib/utils` (combines `clsx` + `tailwind-merge`)
- **Variant management**: Use `class-variance-authority` for component variants
- **Icon usage**: Import from `lucide-react`, configured as default in shadcn setup
- **Props ordering**: Always order props consistently:
  1. First: text/numbers/arrays/objects (data props)
  2. Then: booleans (flags)
  3. Last: functions (handlers/callbacks)

  This applies to TypeScript interfaces, function parameters, and JSX prop passing

### UI Development Guidelines

```typescript
// ✅ Correct shadcn/Radix pattern
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Dialog = ({ className, ...props }) => (
  <DialogPrimitive.Root>
    <DialogPrimitive.Content className={cn("default-styles", className)} {...props}>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Root>
)

// ✅ Use theme-aware styling
className="bg-background text-foreground border-border"

// ✅ Icon usage
import { ChevronDown } from "lucide-react"
```

### Accessibility Notes

- Radix UI provides ARIA attributes, keyboard navigation, and screen reader support automatically
- Always test components with keyboard navigation and screen readers
- Use semantic HTML structure within Radix primitives

## File Naming Conventions

**CRITICAL**: All filenames must be in lowercase form consistently throughout the project.

### Naming Rules

- **Files**: Use camelCase: `userProfile.tsx`, `dataLoader.ts`
- **Directories**: Use lowercase: `components/`, `modules/`, `storageAdapters/`
- **React Components**: Files should be camelCase, but export PascalCase: `jobDialog.tsx` exports `JobDialog`
- **Utilities/Functions**: Use camelCase: `utils.ts`, `helpers.ts`, `queries.ts`

### Examples

```typescript
// ✅ Correct filename: jobDialog.tsx
export const JobDialog = () => { ... }

// ✅ Correct filename: userProfileCard.tsx
export const UserProfileCard = () => { ... }

// ✅ Correct filename: apiHelpers.ts
export const fetchUserData = () => { ... }

// ❌ Avoid: JobDialog.tsx, UserProfileCard.tsx, job-dialog.tsx, api-helpers.ts
```

### Why camelCase?

- **Consistency**: Matches existing codebase patterns
- **JavaScript convention**: Aligns with JavaScript/TypeScript variable naming
- **Git-friendly**: Avoids case-related merge conflicts
- **Import clarity**: Clear distinction between filenames and exported symbols

## Code Formatting Standards

**CRITICAL**: Follow these formatting rules consistently across all files.

### Indentation & Spacing

- **Use 2 spaces** for indentation (no tabs)
- **No trailing whitespace** on any lines
- **Single newline** at end of every file
- **Remove empty lines** at the end of files (except the final newline)
- **Consistent spacing** around operators and brackets

### Auto-formatting Workflow

**Always save files to apply formatting rules**:

1. Write your code
2. **Save the file** (Cmd/Ctrl + S) - this triggers auto-formatting
3. Verify formatting is applied (indentation, trailing spaces cleaned, etc.)
4. Commit only after formatting is applied

### Formatting Rules Applied on Save

- **2-space indentation** enforced
- **Trailing whitespace** removal
- **Empty line cleanup** (removes extra blank lines)
- **Final newline** addition
- **Import organization** (if configured)
- **Consistent quotes** and semicolons

### Example

```typescript
// ✅ Correct formatting (2 spaces, no trailing whitespace, final newline)
import { cn } from "@/lib/utils"

export const JobDialog = ({ className, ...props }) => {
  return (
    <div className={cn("default-styles", className)}>
      <h1>Job Dialog</h1>
    </div>
  )
}
// ← Final newline here
```

## Commenting Guidelines

**CRITICAL**: Only add comments when they explain complex logic or non-obvious behavior.

### When to Comment

- **Complex algorithms** or business logic that isn't immediately clear
- **Non-obvious workarounds** or browser-specific fixes
- **Important context** that prevents future bugs or confusion
- **API integration quirks** or external service limitations

### When NOT to Comment

- **Self-explanatory code** - good variable/function names are better
- **Obvious operations** - don't explain what the code clearly does
- **Redundant descriptions** - avoid restating the code in English

### Examples

```typescript
// ❌ Unnecessary comments
// Set the user name
const userName = user.name

// Create a button component
const Button = ({ children }) => <button>{children}</button>

// ✅ Useful comments
// Workaround: Safari requires explicit height for flex containers
// See: https://bugs.webkit.org/show_bug.cgi?id=137730
className="h-full flex"

// Rate limit: OpenAI allows 3 requests/minute for this endpoint
await delay(20000) // 20s between requests

// ✅ Better: Extract complex calculations to descriptive variables
const translateValue = 100 - (value || 0)
style={{ transform: `translateX(-${translateValue}%)` }}

// ❌ Avoid: Inline complex calculations that need comments
style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
```

### Best Practices

- **Explain WHY, not WHAT** - focus on reasoning and context
- **Keep comments concise** - avoid lengthy explanations
- **Extract complex calculations** - use descriptive variables instead of inline math
- **Update comments** when code changes to prevent misleading information
- **Use meaningful variable/function names** instead of comments when possible

## Security & Data Protection

**CRITICAL**: This application handles sensitive tutoring transcripts and research data. Always consider security implications.

### Authentication & Authorization

- **Always check user authentication** before implementing features that require login
- **Verify permissions** - Check if user has access to specific projects/teams/data
- **Follow existing auth patterns** - Use established React Router error handling (see above)
- **Handle auth failures gracefully** - Use `redirect()` in loaders, `throw new Error()` in actions

### Data Sensitivity

- **Tutoring transcripts are confidential** - Handle with appropriate care
- **User data protection** - Don't log sensitive information
- **File access control** - Ensure users can only access their authorized files
- **API security** - Validate all inputs and sanitize outputs

### Environment Variables

- **Never commit secrets** - Use `.env` for sensitive configuration
- **Validate required env vars** - Check for missing critical environment variables
- **Use secure defaults** - Fail securely when configuration is missing
- **Rotate credentials** - Be prepared for credential rotation in production

### Examples

```typescript
// ✅ Check permissions beyond basic auth
export async function loader({ request }) {
  const user = await getUser(request);
  if (!user) return redirect("/"); // Follow React Router pattern

  // Additional permission checks
  const project = await getProject(params.projectId);
  if (!canAccessProject(user, project)) {
    throw new Error("Access denied");
  }
}

// ✅ Validate and sanitize all inputs
export async function action({ request }) {
  const user = await getUser(request);
  if (!user) throw new Error("Authentication required"); // Follow React Router pattern

  const formData = await request.formData();
  const name = formData.get("name")?.toString().trim();
  if (!name || name.length > 100) {
    throw new Error("Invalid name");
  }
}
```

## Best Practices

1. **Always use frozen lockfile**: `yarn install --frozen-lockfile` matches CI exactly
2. **Run typecheck before committing**: Catches issues early
3. **Test builds locally**: Don't rely on CI to catch build failures
4. **Use path aliases**: Prefer `@/*` and `~/*` over relative paths
5. **Check .env setup**: Many features require environment variables
6. **Keep adapters.js in sync**: When changing storage adapters, verify generated code
7. **Respect gitignore**: Don't commit `.env`, `build/`, `data/`, `storage/`, or `.react-router/`
8. **Node version**: Use Node 20.x to match Docker and production environment
9. **Module structure**: Each module typically has `components/`, `containers/`, and sometimes `queries/`, `mutations/`
10. **Examine existing patterns**: Always check similar implementations before creating new components or features
11. **UI consistency**: Use existing shadcn/ui components before creating custom ones
12. **Theme support**: Always use CSS variables for colors to support dark/light modes
13. **File naming**: Always use camelCase filenames for consistency
14. **Code formatting**: Always use 2 spaces for indentation and save files to apply auto-formatting
15. **Comments**: Only add comments for complex logic or non-obvious behavior - avoid obvious explanations

## Quick Reference

**Full build & validation cycle** (recommended before PR):

```bash
yarn install --frozen-lockfile
yarn typecheck
yarn build
```

**Start development**:

```bash
cp .env.example .env
# Edit .env as needed
yarn install --frozen-lockfile
yarn dev
```

---

**Trust these instructions**. Only search for additional information if these instructions are incomplete or you encounter unexpected behavior not covered here.

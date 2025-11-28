# DevStudio Architecture

## Overview

DevStudio is built with Next.js 14 (App Router) and leverages NextAuth.js v5 for authentication with GitHub OAuth. The architecture is designed to securely handle GitHub access tokens on the server side to enable one-click deployments.

## Core Components

### 1. Authentication Layer

**Files**:
- `auth.ts` - NextAuth configuration
- `next-auth.d.ts` - TypeScript type extensions
- `app/api/auth/[...nextauth]/route.ts` - API routes for NextAuth

**Flow**:
1. User clicks "Connect GitHub"
2. OAuth redirects to GitHub with `repo` scope
3. GitHub redirects back with authorization code
4. NextAuth exchanges code for access token
5. JWT callback stores access token in JWT
6. Session callback exposes token to server-side code

**Critical Implementation**:

The JWT callback captures the access token during the OAuth flow:

```typescript
async jwt({ token, account, profile }) {
  if (account) {
    token.accessToken = account.access_token;
    token.githubId = String(profile.id);
  }
  return token;
}
```

The session callback makes it available to server actions:

```typescript
async session({ session, token }) {
  if (token.accessToken) {
    session.accessToken = token.accessToken as string;
  }
  return session;
}
```

### 2. GitHub Integration Layer

**Files**:
- `app/actions/pushToGithub.ts` - Deploy code to GitHub
- `app/actions/getRepos.ts` - Fetch user repositories
- `app/api/github/repos/route.ts` - API endpoint for repositories
- `lib/github/types.ts` - TypeScript types

**Git Data API Strategy**:

The deployment uses GitHub's low-level Git Data API for atomic commits:

1. **Create Blobs**: Each file is converted to a blob object
2. **Get Latest Commit**: Fetch the current HEAD of the target branch
3. **Create Tree**: Build a tree with all blobs (merging with base tree)
4. **Create Commit**: Create a commit object pointing to the new tree
5. **Update Reference**: Move the branch reference to the new commit

This approach enables:
- Atomic operations (all files committed together)
- Proper Git history
- Support for both new and existing repositories
- Preservation of existing files (when using base_tree)

### 3. UI Components

**Files**:
- `components/github/ConnectGithubBtn.tsx` - GitHub OAuth button
- `components/github/RepoSelector.tsx` - Repository dropdown
- `components/ui/*` - Shadcn/UI components

**Component Hierarchy**:
```
RootLayout (auth provider)
  └─ HomePage
      ├─ ConnectGithubBtn (client component)
      └─ RepoSelector (client component)
          └─ fetches from /api/github/repos
```

## Data Flow

### Authentication Flow

```
User clicks "Connect GitHub"
  ↓
signIn('github') triggers OAuth flow
  ↓
User authorizes on GitHub
  ↓
GitHub redirects to /api/auth/callback/github
  ↓
NextAuth exchanges code for access token
  ↓
JWT callback stores token in JWT
  ↓
Session callback exposes token to session
  ↓
User is authenticated with access token available
```

### Deployment Flow

```
Client calls pushToGithub() server action
  ↓
Server retrieves session with auth()
  ↓
Extract accessToken from session
  ↓
Initialize Octokit with access token
  ↓
Check if repository exists
  ↓
Create repository if needed
  ↓
Get latest commit info
  ↓
Create blobs for all files
  ↓
Create tree with blobs
  ↓
Create commit
  ↓
Update branch reference
  ↓
Return success with repo URL
```

## Security Model

### Token Management

**Storage**: Access tokens are stored in encrypted JWT cookies (HttpOnly, Secure, SameSite)

**Exposure**: Tokens are NEVER sent to the client. All GitHub API calls happen server-side.

**Scope**: The `repo` scope grants full repository access. Users must explicitly authorize this.

### Server Actions vs API Routes

The project uses both patterns:

**Server Actions** (`app/actions/*`):
- Used for mutations (pushToGithub)
- Type-safe with direct function calls
- Automatic POST request handling

**API Routes** (`app/api/*`):
- Used for public endpoints (repos list)
- RESTful interface
- Easier to consume from client components

## Type Safety

### Session Type Extension

```typescript
// next-auth.d.ts
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
      githubId?: string;
    } & DefaultSession["user"];
  }
}
```

### GitHub Types

```typescript
// lib/github/types.ts
export interface FileToCreate {
  path: string;
  content: string;
}

export interface PushToGitHubParams {
  repoName: string;
  files: FileToCreate[];
  commitMessage?: string;
  description?: string;
  isPrivate?: boolean;
}
```

## Error Handling

### Authentication Errors
- Missing credentials: Throw early with descriptive message
- Invalid session: Return 401 from API routes
- OAuth failures: Handled by NextAuth built-in error pages

### GitHub API Errors
- 404 (Not Found): Create repository or branch
- 401 (Unauthorized): Session expired, prompt re-authentication
- 403 (Forbidden): Insufficient permissions
- 422 (Unprocessable): Validation error with detailed message

### Client-Side Errors
- Network failures: Display error message to user
- Loading states: Show spinners during async operations
- Form validation: Prevent submission if required fields empty

## Performance Considerations

### Token Refresh
GitHub OAuth tokens don't expire by default, but the architecture supports refresh:
- Store refresh_token in JWT
- Check token expiry
- Refresh before API calls if needed

### API Rate Limits
- GitHub API has rate limits (5000 req/hour for authenticated users)
- Implement caching for repository lists
- Use conditional requests with ETags

### Parallel Blob Creation
The pushToGithub action creates all blobs in parallel:

```typescript
const blobs = await Promise.all(
  params.files.map(file => createBlob(octokit, owner, repo, file))
);
```

This significantly speeds up deployments with many files.

## Extension Points

### Custom Git Workflows
- Support for pull requests instead of direct commits
- Multi-branch deployments
- Tag creation for releases

### Additional Providers
- GitLab integration
- Bitbucket support
- Self-hosted Git servers

### Advanced Features
- File diff preview before deploy
- Deployment history tracking
- Rollback capability
- CI/CD integration triggers

## Testing Strategy

### Unit Tests
- Test authentication callbacks in isolation
- Test GitHub API helper functions
- Mock Octokit responses

### Integration Tests
- Test full OAuth flow with GitHub test account
- Test repository creation and updates
- Test error scenarios (invalid tokens, rate limits)

### E2E Tests
- User flow: Connect → Select Repo → Deploy
- Test with real GitHub API (sandboxed account)
- Verify actual repository creation

## Deployment Checklist

- [ ] Set up GitHub OAuth App (production URLs)
- [ ] Configure environment variables
- [ ] Test OAuth flow in production
- [ ] Verify callback URL whitelisting
- [ ] Test deployment with real repositories
- [ ] Monitor error rates and API usage
- [ ] Set up logging and monitoring
- [ ] Document user permissions clearly

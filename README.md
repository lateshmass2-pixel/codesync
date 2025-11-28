# DevStudio - AI Full-Stack App Builder

DevStudio is a Next.js 14 application that enables users to build full-stack applications with AI assistance and deploy them directly to GitHub with one click.

## Features

- **GitHub OAuth Integration**: Secure authentication with repository access
- **Token Management**: Exposes GitHub access tokens to the session for server-side operations
- **One-Click Deploy**: Push generated code directly to GitHub repositories
- **Git Data API**: Atomic commits using GitHub's low-level Git Data API
- **Repository Management**: Create new repositories or update existing ones

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Authentication**: NextAuth.js v5 (Auth.js)
- **GitHub API**: Octokit (rest.js)
- **UI**: Tailwind CSS + Shadcn/UI
- **TypeScript**: Full type safety

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd devstudio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: DevStudio (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Generate a new client secret
6. Copy the Client ID and Client Secret

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your GitHub OAuth credentials:

```env
AUTH_SECRET=<generate-a-random-string>
AUTH_GITHUB_ID=<your-github-client-id>
AUTH_GITHUB_SECRET=<your-github-client-secret>
NEXTAUTH_URL=http://localhost:3000
```

To generate `AUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
devstudio/
├── app/
│   ├── actions/
│   │   ├── pushToGithub.ts    # Server action for pushing code to GitHub
│   │   └── getRepos.ts        # Server action for fetching repositories
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts   # NextAuth API routes
│   │   └── github/
│   │       └── repos/
│   │           └── route.ts   # GitHub repositories API endpoint
│   ├── layout.tsx             # Root layout with auth provider
│   ├── page.tsx               # Homepage
│   └── globals.css            # Global styles
├── components/
│   ├── github/
│   │   ├── ConnectGithubBtn.tsx  # GitHub OAuth connect button
│   │   └── RepoSelector.tsx      # Repository selector dropdown
│   ├── providers/
│   │   └── session-provider.tsx  # NextAuth session provider wrapper
│   └── ui/                        # Shadcn/UI components
├── lib/
│   ├── github/
│   │   └── types.ts           # GitHub-related TypeScript types
│   └── utils.ts               # Utility functions
├── auth.ts                    # NextAuth configuration (CRITICAL)
├── next-auth.d.ts             # TypeScript declarations for NextAuth
└── package.json
```

## Key Implementation Details

### 1. Authentication Configuration (`auth.ts`)

The authentication system is configured to:
- Request the `repo` scope from GitHub OAuth
- Extract the access token in the JWT callback
- Expose the access token in the session object

```typescript
callbacks: {
  async jwt({ token, account, profile }) {
    if (account) {
      token.accessToken = account.access_token;
      token.githubId = String(profile.id);
    }
    return token;
  },
  async session({ session, token }) {
    if (token.accessToken) {
      session.accessToken = token.accessToken as string;
    }
    return session;
  },
}
```

### 2. TypeScript Type Definitions (`next-auth.d.ts`)

Extended NextAuth types to include the access token:

```typescript
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

### 3. Push to GitHub (`app/actions/pushToGithub.ts`)

The push operation uses the Git Data API strategy:

**Step A**: Create blobs for every file
```typescript
const blob = await octokit.git.createBlob({
  owner,
  repo,
  content: file.content,
  encoding: "utf-8",
});
```

**Step B**: Get the latest commit SHA
```typescript
const ref = await octokit.git.getRef({ 
  owner, 
  repo, 
  ref: `heads/${branch}` 
});
```

**Step C**: Create a new tree
```typescript
const tree = await octokit.git.createTree({
  owner,
  repo,
  base_tree: baseTreeSha,
  tree: blobs.map((blob, index) => ({
    path: files[index].path,
    mode: "100644",
    type: "blob",
    sha: blob,
  })),
});
```

**Step D**: Create a commit
```typescript
const commit = await octokit.git.createCommit({
  owner,
  repo,
  message: commitMessage,
  tree: tree.data.sha,
  parents: [latestCommitSha],
});
```

**Step E**: Update the reference
```typescript
await octokit.git.updateRef({
  owner,
  repo,
  ref: `heads/${branch}`,
  sha: commit.data.sha,
});
```

## Usage Example

### Deploy Code to GitHub

```typescript
import { pushToGithub } from "@/app/actions/pushToGithub";

const result = await pushToGithub({
  repoName: "my-new-app",
  files: [
    {
      path: "README.md",
      content: "# My App",
    },
    {
      path: "package.json",
      content: JSON.stringify({ name: "my-app" }, null, 2),
    },
  ],
  commitMessage: "Initial commit",
  description: "AI-generated application",
  isPrivate: true,
});

if (result.success) {
  console.log("Deployed to:", result.repoUrl);
}
```

## Security Considerations

- **Access Tokens**: Never expose access tokens to the client. All GitHub API calls happen server-side.
- **Scope**: The `repo` scope grants full access to repositories. Users should be informed.
- **Token Refresh**: GitHub access tokens don't expire by default, but consider implementing refresh logic for production.

## Production Deployment

When deploying to production (e.g., Vercel):

1. Update your GitHub OAuth App settings:
   - Homepage URL: `https://your-domain.com`
   - Callback URL: `https://your-domain.com/api/auth/callback/github`

2. Set environment variables in your hosting platform:
   - `AUTH_SECRET`
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
   - `NEXTAUTH_URL=https://your-domain.com`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

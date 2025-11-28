# Workspace Component - Quick Start Guide

## What Was Built

A fully-functional workspace component that provides:

1. **File Explorer (Left Sidebar)**
   - Hierarchical tree view of your GitHub repository
   - Collapsible folders
   - File selection for preview

2. **Chat Interface (Tab 1)**
   - AI-powered chat for code generation
   - System prompt automatically includes file structure
   - Display of pending changes with file list
   - One-click deploy to GitHub

3. **Code Preview (Tab 2)**
   - Syntax-highlighted code viewer using Monaco Editor
   - Read-only file preview
   - Automatic language detection

4. **GitHub Integration**
   - Real-time file tree loading from GitHub API
   - File content fetching
   - Atomic commit of multiple files using Git Data API

## File Structure

```
app/
├── actions/
│   └── workspace.ts              # Server actions (fetchRepoTree, fetchFileContent, commitChanges)
├── api/
│   └── workspace/
│       └── generate/
│           └── route.ts          # AI API endpoint (mock implementation)
└── workspace/
    └── page.tsx                  # Workspace page route

components/
├── workspace/
│   ├── Workspace.tsx             # Main workspace component
│   ├── FileTree.tsx              # File explorer tree view
│   └── index.ts                  # Exports
└── ui/
    ├── tabs.tsx                  # Tab component (new)
    ├── input.tsx                 # Input component (new)
    └── scroll-area.tsx           # Scroll area component (new)

lib/
└── workspace/
    ├── types.ts                  # TypeScript interfaces
    └── hooks/
        └── useGitHubRepo.ts      # Custom hook for repo operations
```

## How to Use

### 1. Navigate to Workspace

From the home page:
1. Connect your GitHub account
2. Select a repository from the dropdown
3. You'll be automatically redirected to `/workspace?repo=owner/repo`

### 2. Explore Files

- Click on folders to expand/collapse
- Click on files to view their content in the "Code Preview" tab
- Files are loaded directly from GitHub

### 3. Use AI Chat

In the Chat tab:
1. Type your request (e.g., "Add a dark mode toggle")
2. The system sends your request with the file structure as context
3. AI responds with structured changes
4. Review the changes in the chat message

### 4. Deploy Changes

When AI generates changes:
1. A banner appears showing the number of files to be modified
2. Click "Deploy Changes" button
3. Changes are committed atomically to GitHub
4. Success/failure message is displayed
5. File tree automatically refreshes

## AI Integration

The current implementation includes a mock AI endpoint at `/api/workspace/generate/route.ts`.

To integrate with a real AI provider (OpenAI, Anthropic, etc.):

```typescript
// In app/api/workspace/generate/route.ts

import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  const { systemPrompt, userMessage, history } = await request.json()

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  })

  const content = response.choices[0].message.content

  return NextResponse.json({ content })
}
```

## Required AI Response Format

The AI must respond with JSON in this exact format:

```json
{
  "explanation": "Brief explanation of what I changed",
  "changes": [
    {
      "filename": "src/App.tsx",
      "content": "// Complete file content here",
      "status": "modified"
    },
    {
      "filename": "src/components/NewComponent.tsx",
      "content": "// Complete file content here",
      "status": "new"
    }
  ]
}
```

## Props & Parameters

### Workspace Component

```typescript
interface WorkspaceProps {
  owner: string       // GitHub username or org
  repo: string        // Repository name
  branch?: string     // Branch name (defaults to "main")
}

// Usage
<Workspace owner="username" repo="repository" branch="main" />
```

### useGitHubRepo Hook

```typescript
const {
  files,           // Array of files in the repository
  isLoading,       // Loading state for file tree
  error,           // Error message if any
  refreshFiles,    // Function to reload file tree
  getFileContent   // Function to fetch a file's content
} = useGitHubRepo({
  owner: "username",
  repo: "repository",
  branch: "main"
})
```

## Server Actions

All are defined in `app/actions/workspace.ts`:

### fetchRepoTree
```typescript
const result = await fetchRepoTree({
  owner: "username",
  repo: "repository",
  branch: "main"
})
// Returns: { success: boolean, tree?: GitHubFile[], error?: string }
```

### fetchFileContent
```typescript
const result = await fetchFileContent({
  owner: "username",
  repo: "repository",
  path: "src/App.tsx",
  branch: "main"
})
// Returns: { success: boolean, content?: string, error?: string }
```

### commitChanges
```typescript
const result = await commitChanges({
  owner: "username",
  repo: "repository",
  changes: [
    {
      filename: "src/App.tsx",
      content: "// new content",
      status: "modified"
    }
  ],
  commitMessage: "Update from DevStudio"
})
// Returns: { success: boolean, commitSha?: string, commitUrl?: string, error?: string }
```

## Dependencies Added

```json
{
  "@monaco-editor/react": "^4.7.0",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-scroll-area": "^1.2.10"
}
```

## Testing the Workspace

1. **Start the dev server**: `npm run dev`
2. **Connect GitHub**: Go to home page and connect your account
3. **Select a repository**: Choose a repo you have write access to
4. **Test file tree**: Verify all files load correctly
5. **Test file preview**: Click files to view their content
6. **Test chat**: Send a message (currently mock response)
7. **Test deploy**: Deploy the mock changes to GitHub

## Next Steps

To make this production-ready:

1. **Integrate Real AI**:
   - Add OpenAI/Anthropic API key to environment variables
   - Update `/api/workspace/generate/route.ts` with real AI calls
   - Handle streaming responses (optional)

2. **Add Error Handling**:
   - Rate limiting
   - File size limits
   - Better error messages

3. **Enhance Features**:
   - Add inline editing in Monaco
   - Show diff before committing
   - Support creating new files
   - Support deleting files
   - Branch switching

4. **UI Improvements**:
   - Loading skeletons
   - Better mobile responsiveness
   - Dark mode theme for Monaco
   - File icons by type

## Troubleshooting

### "Error Loading Repository"
- Verify you're authenticated with GitHub
- Check the repository exists and you have access
- Ensure the repository isn't empty

### "Failed to commit changes"
- Verify you have write access to the repository
- Check the branch isn't protected
- Ensure you're not exceeding GitHub API rate limits

### Monaco Editor Not Loading
- Check the browser console for errors
- Verify @monaco-editor/react is installed
- Try clearing cache and reloading

## Documentation

For detailed documentation, see:
- **WORKSPACE.md** - Complete technical documentation
- **ARCHITECTURE.md** - Overall system architecture
- **README.md** - Project overview

## Support

The workspace component is fully integrated with the existing DevStudio authentication and GitHub integration. All server actions use the authenticated session's access token, so no additional configuration is needed beyond the existing GitHub OAuth setup.

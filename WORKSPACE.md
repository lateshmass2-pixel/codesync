# Workspace Component Documentation

## Overview

The Workspace component is the main coding interface for DevStudio, where users can interact with their GitHub repositories through an AI-powered chat interface and view/edit code.

## Architecture

### Components

#### 1. **Workspace.tsx** (Main Component)
- **Location**: `components/workspace/Workspace.tsx`
- **Type**: Client Component
- **Props**:
  - `owner`: string - GitHub repository owner
  - `repo`: string - Repository name
  - `branch?`: string - Branch name (defaults to "main")

**Features**:
- Split-panel layout with file explorer on the left
- Tab-based interface with Chat and Code Preview
- Real-time file tree loading from GitHub
- AI chat interface for code generation
- Code preview with syntax highlighting (Monaco Editor)
- Deploy changes functionality

#### 2. **FileTree.tsx** (File Explorer)
- **Location**: `components/workspace/FileTree.tsx`
- **Type**: Client Component
- **Features**:
  - Hierarchical tree view of repository files
  - Collapsible folders
  - File selection
  - Visual indicators for folders and files

### Server Actions

#### 1. **fetchRepoTree**
- **File**: `app/actions/workspace.ts`
- **Purpose**: Fetch the file structure from a GitHub repository
- **API**: GitHub Git Data API - `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
- **Returns**: Array of GitHubFile objects

```typescript
const { tree, error } = await fetchRepoTree({
  owner: "username",
  repo: "repository",
  branch: "main"
})
```

#### 2. **fetchFileContent**
- **File**: `app/actions/workspace.ts`
- **Purpose**: Get the content of a specific file
- **API**: GitHub Contents API - `GET /repos/{owner}/{repo}/contents/{path}`
- **Returns**: File content as string (decoded from base64)

```typescript
const { content, error } = await fetchFileContent({
  owner: "username",
  repo: "repository",
  path: "src/index.js"
})
```

#### 3. **commitChanges**
- **File**: `app/actions/workspace.ts`
- **Purpose**: Commit multiple file changes to GitHub
- **API**: GitHub Git Data API (Blob → Tree → Commit → Ref)
- **Flow**:
  1. Create blobs for each file change
  2. Get latest commit SHA
  3. Create new tree with changes
  4. Create commit
  5. Update branch reference

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
  commitMessage: "Update App component"
})
```

### Custom Hook

#### **useGitHubRepo**
- **File**: `lib/workspace/hooks/useGitHubRepo.ts`
- **Purpose**: Manage GitHub repository state and operations
- **Returns**:
  - `files`: Array of files in the repository
  - `isLoading`: Loading state
  - `error`: Error message if any
  - `refreshFiles`: Function to reload the file tree
  - `getFileContent`: Function to fetch a specific file's content

```typescript
const { files, isLoading, error, getFileContent, refreshFiles } = useGitHubRepo({
  owner: "username",
  repo: "repository",
  branch: "main"
})
```

## AI Integration

### System Prompt Structure

The workspace builds a system prompt that includes:
1. The complete file structure of the repository
2. Instructions for the AI to respond with structured JSON
3. Requirements for the response format

Example system prompt:
```
You are an expert developer. Here is the file structure of the current project:

src/index.ts
src/App.tsx
src/components/Button.tsx
...

When the user asks you to make changes, respond with a JSON object in this format:
{
  "explanation": "Brief explanation of changes",
  "changes": [
    {
      "filename": "path/to/file.js",
      "content": "full file content",
      "status": "new" or "modified"
    }
  ]
}
```

### Expected AI Response Format

```typescript
interface AIResponse {
  explanation: string
  changes: FileChange[]
}

interface FileChange {
  filename: string
  content: string
  status: "new" | "modified"
}
```

### Integration Steps

To integrate with your AI provider (OpenAI, Anthropic, etc.), modify the `handleSendMessage` function in `Workspace.tsx`:

```typescript
// Replace the placeholder with your API call
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: systemPrompt },
      ...newMessages
    ]
  })
})

const aiResponse = await response.json()
const parsedResponse = JSON.parse(aiResponse.content)

const assistantMessage: ChatMessage = {
  role: "assistant",
  content: parsedResponse.explanation,
  changes: parsedResponse.changes
}
```

## User Flow

### 1. Repository Selection
1. User authenticates with GitHub on the home page
2. User selects a repository from the dropdown
3. User is redirected to `/workspace?repo=owner/repo`

### 2. File Exploration
1. Workspace loads the file tree from GitHub
2. User can browse folders and files
3. Clicking a file loads its content in the Code Preview tab

### 3. AI-Assisted Coding
1. User types a request in the chat (e.g., "Add a dark mode toggle")
2. System constructs a prompt with the file structure
3. AI analyzes and responds with structured JSON containing file changes
4. Changes are displayed in the chat with file list
5. User reviews the changes in the preview

### 4. Deployment
1. User clicks "Deploy Changes" button
2. System uses Git Data API to commit all changes atomically
3. Success/failure message is displayed
4. File tree refreshes to show updated repository

## Routing

### Page Route
- **Path**: `/app/workspace/page.tsx`
- **Type**: Client Component
- **Query Params**:
  - `repo`: Repository full name (format: "owner/repo")

Example: `/workspace?repo=Latesh-31/CALCULATOR-CODSOFT`

## Styling

The workspace uses Tailwind CSS with the following layout:
- **File Explorer**: Fixed width sidebar (256px)
- **Main Area**: Flex-grow container
- **Tabs**: Full height with header
- **Chat**: Scrollable message area with fixed input at bottom
- **Code Preview**: Full-height Monaco editor

## Type Definitions

All workspace-related types are defined in:
- `lib/workspace/types.ts`

Key interfaces:
- `GitHubFile` - Represents a file in the repository
- `FileChange` - Represents a change to be committed
- `AIResponse` - Expected AI response format
- `CommitChangesParams` - Parameters for commit operation
- `FetchRepoTreeParams` - Parameters for fetching file tree

## Security

- All GitHub API calls happen server-side
- Access tokens are never exposed to the client
- Session validation on every server action
- User can only access repositories they have permissions for

## Future Enhancements

### Planned Features
- [ ] Real-time collaboration
- [ ] Inline code editing in Monaco
- [ ] Diff view for changes before commit
- [ ] Support for creating new files/folders
- [ ] Support for deleting files
- [ ] Branch switching
- [ ] Pull request creation
- [ ] Git history view
- [ ] Multi-file search
- [ ] AI context from file content (not just structure)

### AI Enhancements
- [ ] Streaming AI responses
- [ ] Code review suggestions
- [ ] Auto-completion based on project context
- [ ] Test generation
- [ ] Documentation generation
- [ ] Bug detection and fixes

## Troubleshooting

### Common Issues

1. **"Error Loading Repository"**
   - Check GitHub authentication status
   - Verify repository exists and user has access
   - Check branch name is correct

2. **"Failed to fetch file content"**
   - File may be too large (GitHub API limit: 1MB)
   - Binary files are not supported
   - Check file path is correct

3. **"Failed to commit changes"**
   - Check user has write permissions to repository
   - Verify branch is not protected
   - Check for merge conflicts

4. **AI not responding**
   - Verify AI API endpoint is configured
   - Check API key is valid
   - Review AI API rate limits

## Development

### Running Locally

```bash
npm install
npm run dev
```

### Environment Variables Required

```env
AUTH_SECRET=your-secret
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret
NEXTAUTH_URL=http://localhost:3000
```

### Testing

To test the workspace:
1. Connect GitHub account
2. Select a repository you have write access to
3. Test file tree loading
4. Test file content preview
5. Test AI chat (with placeholder response)
6. Test commit functionality

## Dependencies

- `@monaco-editor/react` - Code editor component
- `@octokit/rest` - GitHub API client
- `@radix-ui/react-tabs` - Tab component
- `@radix-ui/react-scroll-area` - Scrollable areas
- `lucide-react` - Icons

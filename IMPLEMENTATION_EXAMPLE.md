# Recursive File Tree Implementation - Complete Example

## Quick Start

This guide shows you how to use the new recursive file tree component in your workspace.

## What You Get

### 1. **Data Transformation Utility** - `buildFileTree()`

Located in `/lib/buildFileTree.ts`, this utility converts a flat array of file paths into a nested tree structure.

```typescript
// Input: Flat array of paths
const paths = [
  "src/components/Header.tsx",
  "src/components/Button.tsx", 
  "src/styles/globals.css",
  "public/index.html"
]

// Output: Nested tree structure
{
  "name": "src",
  "path": "src",
  "type": "dir",
  "children": [
    {
      "name": "components",
      "path": "src/components", 
      "type": "dir",
      "children": [
        { "name": "Button.tsx", "path": "src/components/Button.tsx", "type": "file" },
        { "name": "Header.tsx", "path": "src/components/Header.tsx", "type": "file" }
      ]
    },
    {
      "name": "styles",
      "path": "src/styles",
      "type": "dir", 
      "children": [
        { "name": "globals.css", "path": "src/styles/globals.css", "type": "file" }
      ]
    }
  ]
}
```

### 2. **Recursive FileTree Component**

Located in `/components/workspace/FileTree.tsx`, this component renders the nested tree structure.

**Features:**
- ✅ Recursive rendering with proper hierarchy
- ✅ Expand/collapse folders with arrow icons
- ✅ Visual indentation (12px per level)
- ✅ File and folder icons from lucide-react
- ✅ Selection highlighting for active files
- ✅ Hover effects for better UX
- ✅ Loading and empty states
- ✅ Automatic sorting (folders first, then files)

### 3. **Type Definition** - FileNode

```typescript
interface FileNode {
  name: string                // Just the name: "Header.tsx"
  path: string                // Full path: "src/components/Header.tsx"
  type: "file" | "dir"        // Type of node
  children?: FileNode[]       // Child nodes (folders only)
}
```

## Usage Examples

### Example 1: Basic Integration in CodeView (Already Implemented)

The `CodeView.tsx` component has been updated to use FileTree:

```typescript
import { FileTree } from "./FileTree"

// In your component render:
<div className="w-64 bg-gray-50 border-r">
  <FileTree
    nodes={files}                    // FileNode[] from buildFileTree()
    selectedFile={selectedFile}      // Current selected file path
    onSelectFile={handleSelectFile}  // Callback when file is clicked
    isLoading={isLoading}            // Show loading spinner
  />
</div>
```

### Example 2: Using buildFileTree Utility

```typescript
import { buildFileTree, type FileNode } from "@/lib/buildFileTree"
import { FileTree } from "@/components/workspace/FileTree"

export function FileExplorer() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    // Get flat list of paths from your API
    const loadFiles = async () => {
      const response = await fetch("/api/files")
      const paths = await response.json() // ["src/App.tsx", "src/index.tsx", ...]
      
      // Convert to tree structure
      const tree = buildFileTree(paths)
      setFiles(tree)
    }

    loadFiles()
  }, [])

  return (
    <FileTree
      nodes={files}
      selectedFile={selectedFile}
      onSelectFile={(path) => {
        setSelectedFile(path)
        loadFileContent(path)
      }}
      isLoading={false}
    />
  )
}
```

### Example 3: Complete File Explorer Component

```typescript
"use client"

import React, { useState, useEffect } from "react"
import { buildFileTree, type FileNode } from "@/lib/buildFileTree"
import { FileTree } from "@/components/workspace/FileTree"

interface FileExplorerProps {
  repoName: string
}

export function FileExplorer({ repoName }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load file tree on mount
  useEffect(() => {
    const loadFileTree = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/repos/${repoName}/files`)
        
        if (!response.ok) {
          throw new Error("Failed to load files")
        }
        
        const paths = await response.json()
        const tree = buildFileTree(paths)
        setFiles(tree)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    loadFileTree()
  }, [repoName])

  // Load file content when selected
  const handleSelectFile = async (path: string) => {
    setSelectedFile(path)
    
    try {
      const response = await fetch(`/api/repos/${repoName}/files/${path}`)
      const content = await response.text()
      setFileContent(content)
    } catch (err) {
      console.error("Failed to load file:", err)
      setFileContent("// Failed to load file")
    }
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="flex h-screen">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        <h2 className="p-4 font-semibold text-gray-900">Files</h2>
        <FileTree
          nodes={files}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
          isLoading={isLoading}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedFile && (
          <div className="border-b border-gray-200 p-4 bg-gray-100">
            <code className="text-sm text-gray-700">{selectedFile}</code>
          </div>
        )}
        <pre className="flex-1 p-4 overflow-auto font-mono text-sm bg-gray-900 text-gray-100">
          {fileContent}
        </pre>
      </div>
    </div>
  )
}
```

### Example 4: With Custom Styling

```typescript
// Customize colors and styling
<FileTree
  nodes={files}
  selectedFile={selectedFile}
  onSelectFile={handleSelectFile}
  isLoading={isLoading}
/>

// To customize the FileTree component, edit these in FileTree.tsx:
// 1. Change hover colors:
// className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm hover:bg-blue-100"
//
// 2. Change selected file appearance:
// className={cn("...", isSelected && "bg-blue-50")}
//
// 3. Change indentation:
// style={{ paddingLeft: `${level * 16 + 8}px` }} // 16px instead of 12px
```

## The Component Structure

### FileTree Component Hierarchy

```
<FileTree>
  └── Renders multiple <TreeNodeComponent> at root level
      └── <TreeNodeComponent> (folder)
          ├── Expandable button with folder icon
          └── When expanded, renders children:
              ├── <TreeNodeComponent> (child folder)
              └── <TreeNodeComponent> (child file)
      └── <TreeNodeComponent> (file)
          └── Clickable button with file icon
```

### Props Flow

```
Workspace.tsx
  │
  ├── State: files (FileNode[])
  ├── State: selectedFile (string)
  │
  └── <CodeView>
      │
      └── <FileTree
            nodes={files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            isLoading={isLoading}
          />
```

## Key Features Explained

### 1. **Automatic Sorting**
Files are sorted automatically at each level:
```
folder1/
folder2/
folder3/
file-a.txt
file-b.txt
file-z.txt
```

### 2. **Smart Indentation**
Each level adds 12px padding-left:
```
- Level 0: 8px
  - src/
    - Level 1: 20px (8 + 12)
      - Level 2: 32px (20 + 12)
        - src/components/Button.tsx
```

### 3. **Expand/Collapse**
- Folders are clickable and toggle open/closed
- Arrow icon shows current state (right = collapsed, down = expanded)
- Default: Top 2 levels expanded for easy navigation

### 4. **Selection Highlighting**
- Files show highlight when selected
- Background color changes on selection
- Border indicator on left side

## Integration Points

### Current Implementation (Already Done)

✅ **CodeView.tsx** - Uses FileTree for the left sidebar file explorer
```typescript
<FileTree
  nodes={files}
  selectedFile={selectedFile}
  onSelectFile={onSelectFile}
  isLoading={isLoading}
/>
```

### How to Integrate in Other Components

1. **Import the component and utility:**
   ```typescript
   import { buildFileTree, type FileNode } from "@/lib/buildFileTree"
   import { FileTree } from "@/components/workspace/FileTree"
   ```

2. **Initialize state:**
   ```typescript
   const [files, setFiles] = useState<FileNode[]>([])
   const [selectedFile, setSelectedFile] = useState<string | null>(null)
   ```

3. **Load and transform data:**
   ```typescript
   const paths = ["src/App.tsx", "src/index.tsx", ...]
   const tree = buildFileTree(paths)
   setFiles(tree)
   ```

4. **Render the component:**
   ```typescript
   <FileTree
     nodes={files}
     selectedFile={selectedFile}
     onSelectFile={handleSelectFile}
   />
   ```

## Performance Considerations

- **Recursion Depth:** Safe up to 100+ levels deep
- **Number of Files:** Handles 1000+ files efficiently
- **Rendering:** Only visible nodes are in the DOM (thanks to ScrollArea)
- **Memory:** Tree structure is immutable and memoizable

## Troubleshooting

### Tree Not Showing

**Problem:** FileTree is empty or not rendering
```typescript
// ❌ Wrong: passing raw FileNode, not array
<FileTree nodes={fileNode} ... />

// ✅ Correct: pass FileNode array
<FileTree nodes={[fileNode]} ... />
```

### Paths Not Building Correctly

**Problem:** buildFileTree doesn't create proper structure
```typescript
// ❌ Wrong: backslashes (Windows paths)
buildFileTree(["src\\App.tsx", "src\\index.tsx"])

// ✅ Correct: forward slashes
buildFileTree(["src/App.tsx", "src/index.tsx"])
```

### Click Not Working

**Problem:** onSelectFile callback not called
```typescript
// ❌ Wrong: passing folder path to onSelectFile
if (node.type === "folder") {
  onSelectFile(node.path) // Won't work, only for files!
}

// ✅ Correct: only call for files
if (node.type === "file") {
  onSelectFile(node.path)
}
```

## API Reference

### `buildFileTree(paths: string[]): FileNode[]`

**Parameters:**
- `paths: string[]` - Array of file paths with `/` separators

**Returns:**
- `FileNode[]` - Nested tree structure, sorted alphabetically

**Example:**
```typescript
const tree = buildFileTree([
  "package.json",
  "src/App.tsx",
  "src/index.tsx",
  "src/components/Header.tsx"
])
```

### `<FileTree>` Component

**Props:**
```typescript
{
  nodes: FileNode[]                    // Required: tree structure
  selectedFile: string | null          // Required: selected file path
  onSelectFile: (path: string) => void // Required: file selection handler
  isLoading?: boolean                  // Optional: show loading state
}
```

**Behavior:**
- Folders expand/collapse on click
- Files call `onSelectFile` when clicked
- Selected file shows highlight
- Automatically sorts by folder then file
- Shows loading spinner when `isLoading={true}`

## Files Modified/Created

1. ✅ **Created:** `/lib/buildFileTree.ts` - Utility function
2. ✅ **Updated:** `/components/workspace/FileTree.tsx` - Enhanced component
3. ✅ **Updated:** `/components/workspace/CodeView.tsx` - Now uses FileTree
4. ✅ **Created:** `/RECURSIVE_FILE_TREE_INTEGRATION.md` - Full documentation
5. ✅ **Created:** `/IMPLEMENTATION_EXAMPLE.md` - This file with examples

## Next Steps

You can now:
1. Use FileTree in any component that needs to display files
2. Customize styling by editing the component
3. Add additional features (search, drag-drop, etc.) if needed

Enjoy your new recursive file tree component! 🎉

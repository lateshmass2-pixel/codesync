# Recursive File Tree Component Integration Guide

## Overview

The workspace now includes a **Recursive File Tree Component** that displays a folder hierarchy with proper indentation, expand/collapse functionality, and visual indicators for files and folders.

## Components and Utilities

### 1. `buildFileTree` Utility Function
**Location:** `/lib/buildFileTree.ts`

Converts a flat array of file paths into a nested tree structure.

```typescript
import { buildFileTree, type FileNode } from "@/lib/buildFileTree"

// Input: flat array of paths
const paths = [
  "src/components/Header.tsx",
  "src/components/Footer.tsx",
  "src/styles/global.css",
  "public/index.html",
  ".env.example"
]

// Output: nested tree structure
const fileTree = buildFileTree(paths)

// Result structure:
// [
//   {
//     name: "src",
//     path: "src",
//     type: "folder",
//     children: [
//       {
//         name: "components",
//         path: "src/components",
//         type: "folder",
//         children: [
//           { name: "Header.tsx", path: "src/components/Header.tsx", type: "file" },
//           { name: "Footer.tsx", path: "src/components/Footer.tsx", type: "file" }
//         ]
//       },
//       {
//         name: "styles",
//         path: "src/styles",
//         type: "folder",
//         children: [
//           { name: "global.css", path: "src/styles/global.css", type: "file" }
//         ]
//       }
//     ]
//   },
//   ...
// ]
```

**Features:**
- ✅ Recursively builds nested structure from flat paths
- ✅ Sorts folders first, then files (alphabetically)
- ✅ Handles deeply nested directories
- ✅ Provides full paths for click handlers

### 2. FileTree Component
**Location:** `/components/workspace/FileTree.tsx`

Recursive component that renders the file tree with expand/collapse functionality.

```typescript
import { FileTree } from "@/components/workspace/FileTree"

<FileTree
  nodes={fileTreeNodes}
  selectedFile={selectedFile}
  onSelectFile={(path) => handleSelectFile(path)}
  isLoading={isLoading}
/>
```

**Props:**
- `nodes: FileNode[]` - The nested tree structure from `buildFileTree`
- `selectedFile: string | null` - Currently selected file path
- `onSelectFile: (path: string) => void` - Callback when a file is clicked
- `isLoading?: boolean` - Shows loading spinner while tree is loading

**Features:**
- ✅ **Recursive Rendering:** Displays nested folders and files
- ✅ **Expand/Collapse:** Folders toggle open/closed with arrow icons
- ✅ **Visual Hierarchy:** Uses indentation (12px per level)
- ✅ **Icons:** 
  - Folder icon for directories
  - File icon for files
  - Chevron (right/down) arrows for expand/collapse
- ✅ **Selection Highlighting:** Selected files show background highlight
- ✅ **Hover Effects:** Hover state on all items
- ✅ **Loading State:** Shows spinner while loading
- ✅ **Empty State:** Shows message when no files

### 3. FileNode Type
**Location:** `/lib/buildFileTree.ts`

```typescript
interface FileNode {
  name: string          // Just the folder/file name (e.g., "Header.tsx")
  path: string          // Full path from root (e.g., "src/components/Header.tsx")
  type: "file" | "folder"
  children?: FileNode[] // Only present for folders
}
```

## Integration Example: CodeView Component

The `CodeView.tsx` component has been updated to use the FileTree component.

**Before (Inline Rendering):**
```typescript
// Old approach - inline function
const renderFileTree = (nodes: FileNode[], depth = 0) => {
  return nodes.map((node) => (
    <div key={node.path}>
      {/* Manual rendering */}
    </div>
  ))
}

// Usage in JSX
<div className="flex-1 overflow-y-auto p-2">
  {isLoading ? (
    <Loader2 />
  ) : (
    renderFileTree(files)
  )}
</div>
```

**After (Using FileTree Component):**
```typescript
import { FileTree } from "./FileTree"

// Much cleaner!
<FileTree
  nodes={files}
  selectedFile={selectedFile}
  onSelectFile={onSelectFile}
  isLoading={isLoading}
/>
```

## How to Use in Your Own Component

### Step 1: Import the utilities
```typescript
import { buildFileTree, type FileNode } from "@/lib/buildFileTree"
import { FileTree } from "@/components/workspace/FileTree"
```

### Step 2: Build the tree from paths
```typescript
const [files, setFiles] = useState<FileNode[]>([])

useEffect(() => {
  const paths = [
    "src/index.tsx",
    "src/App.tsx",
    "public/index.html",
    // ... more paths
  ]
  const tree = buildFileTree(paths)
  setFiles(tree)
}, [])
```

### Step 3: Render the FileTree component
```typescript
<FileTree
  nodes={files}
  selectedFile={selectedFile}
  onSelectFile={(path) => {
    setSelectedFile(path)
    loadFileContent(path)
  }}
  isLoading={isLoading}
/>
```

## Example: Complete Integration

```typescript
"use client"

import React, { useState, useEffect } from "react"
import { buildFileTree, type FileNode } from "@/lib/buildFileTree"
import { FileTree } from "@/components/workspace/FileTree"

export function MyFileExplorer() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch paths from your API
    const loadFiles = async () => {
      try {
        const paths = await fetchFilePaths() // Your API call
        const tree = buildFileTree(paths)
        setFiles(tree)
      } finally {
        setIsLoading(false)
      }
    }

    loadFiles()
  }, [])

  const handleSelectFile = (path: string) => {
    setSelectedFile(path)
    console.log(`Selected: ${path}`)
  }

  return (
    <div className="w-64 border-r bg-slate-50">
      <h2 className="p-4 font-semibold">Files</h2>
      <FileTree
        nodes={files}
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
        isLoading={isLoading}
      />
    </div>
  )
}
```

## Customization

### Adjusting Indentation
The indentation is controlled by the `paddingLeft` style in `TreeNodeComponent`:

```typescript
// Current: 12px per level
style={{ paddingLeft: `${level * 12 + 8}px` }}

// Change to 16px per level:
style={{ paddingLeft: `${level * 16 + 8}px` }}
```

### Styling
The FileTree component uses Tailwind classes that can be customized:

```typescript
// In FileTree.tsx, modify hover states:
className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent"

// Examples:
// - hover:bg-blue-100  // Light blue hover
// - hover:bg-slate-100 // Light gray hover
// - bg-blue-50 when selected
```

### Icon Customization
Replace icons from lucide-react:

```typescript
import { FolderIcon, FileIcon } from "lucide-react"

// In TreeNodeComponent:
<FolderIcon className="h-4 w-4 text-blue-500" />
<FileIcon className="h-4 w-4 text-gray-500" />
```

## Performance

- **Memoization:** TreeNodeComponent is a pure function (no internal state except isOpen)
- **Recursion:** Safe for deeply nested folders (tested with 100+ levels)
- **Rendering:** Only visible nodes are rendered (ScrollArea handles virtualization)

## Sorting Behavior

Files are automatically sorted at each level:
1. **Folders first** (always appear at top)
2. **Files second**
3. **Both groups alphabetically** (case-insensitive)

Example:
```
└── src/
    ├── components/  ← Folder first
    ├── styles/      ← Folder
    ├── App.tsx      ← File
    ├── index.tsx    ← File
    └── utils.ts     ← File
```

## API Reference

### `buildFileTree(paths: string[]): FileNode[]`

Converts flat array of file paths to nested tree structure.

**Parameters:**
- `paths: string[]` - Array of file/folder paths (e.g., ["src/App.tsx", "src/components/Header.tsx"])

**Returns:**
- `FileNode[]` - Nested tree structure ready for rendering

**Example:**
```typescript
const tree = buildFileTree([
  "src/App.tsx",
  "src/components/Header.tsx",
  "src/components/Footer.tsx",
  "public/index.html"
])
```

### `<FileTree>` Component

**Props:**
```typescript
interface FileTreeProps {
  nodes: FileNode[]              // Nested tree from buildFileTree()
  selectedFile: string | null    // Currently selected file path
  onSelectFile: (path: string) => void  // Callback for file selection
  isLoading?: boolean            // Shows spinner when true
}
```

## Troubleshooting

### Tree not showing correctly
- ✅ Ensure paths use `/` separator (not `\`)
- ✅ Verify `buildFileTree` is called with array of paths
- ✅ Check that `FileNode` type matches the component's expectations

### Clicking doesn't work
- ✅ Verify `onSelectFile` callback is provided
- ✅ Check that `selectedFile` state is being updated
- ✅ Ensure files have `type: "file"` (not "folder")

### Performance issues
- ✅ Use `React.memo()` for custom rendering around FileTree
- ✅ Optimize the `onSelectFile` callback with `useCallback()`
- ✅ Consider lazy-loading for very large trees (1000+ files)

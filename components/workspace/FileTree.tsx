"use client"

import * as React from "react"
import { File, Folder, ChevronRight, ChevronDown, Loader2 } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { GitHubFile } from "@/lib/workspace/types"
import { cn } from "@/lib/utils"

interface FileTreeProps {
  files: GitHubFile[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
  isLoading?: boolean
}

interface TreeNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: TreeNode[]
}

function buildTree(files: GitHubFile[]): TreeNode[] {
  const root: TreeNode[] = []

  files.forEach((file) => {
    const parts = file.path.split("/")
    let currentLevel = root

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      const existingNode = currentLevel.find((node) => node.name === part)

      if (existingNode) {
        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        }

        currentLevel.push(newNode)

        if (!isFile && newNode.children) {
          currentLevel = newNode.children
        }
      }
    })
  })

  return root
}

function TreeNodeComponent({
  node,
  level = 0,
  selectedFile,
  onSelectFile,
}: {
  node: TreeNode
  level?: number
  selectedFile: string | null
  onSelectFile: (path: string) => void
}) {
  const [isOpen, setIsOpen] = React.useState(level < 2)

  const isSelected = node.type === "file" && selectedFile === node.path

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                level={level + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "flex w-full items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent",
        isSelected && "bg-accent"
      )}
      style={{ paddingLeft: `${level * 12 + 28}px` }}
    >
      <File className="h-4 w-4 text-muted-foreground" />
      <span className="text-foreground">{node.name}</span>
    </button>
  )
}

export function FileTree({
  files,
  selectedFile,
  onSelectFile,
  isLoading,
}: FileTreeProps) {
  const tree = React.useMemo(() => buildTree(files), [files])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No files found</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {tree.map((node) => (
          <TreeNodeComponent
            key={node.path}
            node={node}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

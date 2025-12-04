/**
 * Builds a nested file tree structure from a flat array of file paths.
 * Sorts folders first, then files alphabetically within each level.
 */

export interface FileNode {
  name: string
  path: string
  type: "file" | "dir"
  children?: FileNode[]
}

export function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = []

  paths.forEach((filePath) => {
    const parts = filePath.split("/")
    let currentLevel = root

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      const fullPath = parts.slice(0, index + 1).join("/")
      
      let existingNode = currentLevel.find((node) => node.name === part)

      if (existingNode) {
        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children
        }
      } else {
        const newNode: FileNode = {
          name: part,
          path: fullPath,
          type: isFile ? "file" : "dir",
          children: isFile ? undefined : [],
        }

        currentLevel.push(newNode)

        if (!isFile && newNode.children) {
          currentLevel = newNode.children
        }
      }
    })
  })

  // Sort each level: folders first, then files, both alphabetically
  const sortTree = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name)
        }
        return a.type === "dir" ? -1 : 1
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortTree(node.children) : undefined,
      }))
  }

  return sortTree(root)
}

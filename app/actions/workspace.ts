"use server"

import { Octokit } from "@octokit/rest"
import type { RestEndpointMethodTypes } from "@octokit/rest"
import { auth } from "@/auth"
import { generateCode } from "@/lib/huggingface"

interface FileNode {
  name: string
  path: string
  type: "file" | "dir"
  size?: number
  children?: FileNode[]
}

interface CodeGenerationResult {
  explanation: string
  changes: Array<{
    path: string
    content?: string
    type?: "create" | "update" | "delete"
  }>
}

type GitCreateTreeParameters = RestEndpointMethodTypes["git"]["createTree"]["parameters"]

export async function getFileTree(repoFullName: string): Promise<FileNode[]> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error("Unauthorized")
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const [owner, repo] = repoFullName.split("/")

    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true" as any,
    })

    // Build file tree structure
    const tree: FileNode[] = []
    const dirMap = new Map<string, FileNode>()

    data.tree.forEach((item) => {
      if (!item.path) return // Skip items without paths
      
      const parts = item.path.split("/")
      let currentLevel = tree
      let currentPath = ""

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (i === parts.length - 1) {
          // This is the final item (file or directory)
          const node: FileNode = {
            name: part,
            path: item.path,
            type: item.type === "blob" ? "file" : "dir",
            size: item.size,
          }

          if (i === 0) {
            currentLevel.push(node)
          } else {
            const parentPath = parts.slice(0, i).join("/")
            const parentNode = dirMap.get(parentPath)
            if (parentNode) {
              if (!parentNode.children) {
                parentNode.children = []
              }
              parentNode.children.push(node)
            }
          }

          if (item.type === "tree") {
            dirMap.set(item.path, node)
          }
        } else {
          // This is a directory path
          let existingNode = dirMap.get(currentPath)
          if (!existingNode) {
            existingNode = {
              name: part,
              path: currentPath,
              type: "dir",
              children: [],
            }
            dirMap.set(currentPath, existingNode)

            if (i === 0) {
              currentLevel.push(existingNode)
            } else {
              const parentPath = parts.slice(0, i).join("/")
              const parentNode = dirMap.get(parentPath)
              if (parentNode) {
                if (!parentNode.children) {
                  parentNode.children = []
                }
                parentNode.children.push(existingNode)
              }
            }
          }
          currentLevel = existingNode.children || []
        }
      }
    })

    return tree
  } catch (error) {
    console.error("Error fetching file tree:", error)
    throw new Error("Failed to fetch file tree")
  }
}

export async function getFileContent(repoFullName: string, path: string): Promise<string> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error("Unauthorized")
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const [owner, repo] = repoFullName.split("/")

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    if ("content" in data && data.type === "file") {
      return Buffer.from(data.content, "base64").toString("utf-8")
    }

    throw new Error("File not found or is not a file")
  } catch (error) {
    console.error("Error fetching file content:", error)
    throw new Error("Failed to fetch file content")
  }
}

export async function generateCodeWithGemini(
  repoFullName: string,
  prompt: string
): Promise<CodeGenerationResult> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error("Unauthorized")
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const [owner, repo] = repoFullName.split("/")

    // Get file tree for context
    const fileTree = await getFileTree(repoFullName)
    
    // Collect key files with content
    const keyFileExtensions = [".html", ".css", ".js", ".jsx", ".tsx", ".ts"]
    const allFiles: string[] = []
    
    const collectFiles = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (node.type === "file") {
          const ext = node.path.split('.').pop()?.toLowerCase()
          if (ext && keyFileExtensions.some(keyExt => node.path.endsWith(keyExt))) {
            allFiles.push(node.path)
          }
        }
        if (node.children) {
          collectFiles(node.children)
        }
      })
    }
    
    collectFiles(fileTree)
    
    // Build file context with content
    let fileContextWithContent = ""
    
    for (const filePath of allFiles) {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
        })

        if ("content" in data && data.type === "file") {
          const content = Buffer.from(data.content, "base64").toString("utf-8")
          fileContextWithContent += `Filename: ${filePath}\nCode:\n${content}\n---\n`
        }
      } catch (error) {
        console.warn(`Failed to fetch content for ${filePath}:`, error)
        // Continue with other files if one fails
      }
    }
    
    // Also add file tree structure for additional context
    const buildFileTreeContext = (nodes: FileNode[], depth = 0): string => {
      let context = ""
      const indent = "  ".repeat(depth)
      
      nodes.forEach((node) => {
        context += `${indent}${node.type === "dir" ? "📁" : "📄"} ${node.name}\n`
        if (node.children) {
          context += buildFileTreeContext(node.children, depth + 1)
        }
      })
      
      return context
    }

    const fileTreeContext = buildFileTreeContext(fileTree)
    
    // Combine both contexts
    const fullContext = `Repository Structure:\n${fileTreeContext}\n\nFile Contents:\n${fileContextWithContent}`
    
    // Generate code using Hugging Face
    const result = await generateCode(prompt, fullContext)
    
    return result
  } catch (error) {
    console.error("Error generating code:", error)
    throw new Error("Failed to generate code")
  }
}

export async function deployChanges(
  repoFullName: string,
  changes: Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()

  if (!session?.accessToken) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const [owner, repo] = repoFullName.split("/")

    // Get current commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    }).catch(async () => {
      // Try default branch if main doesn't exist
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      return octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
      })
    })

    const currentCommitSha = refData.object.sha

    // Get current commit to get tree SHA
    const { data: currentCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    })

    // Build tree entries for all changes
    const treeEntries: Array<{
      path: string
      sha: string | null
      mode: "100644"
      type: "blob"
    }> = []

    for (const change of changes) {
      if (change.type === "delete") {
        treeEntries.push({
          path: change.path,
          sha: null,
          mode: "100644",
          type: "blob",
        })
        continue
      }

      if (typeof change.content !== "string") {
        throw new Error(`Missing content for change at ${change.path}`)
      }

      const { data } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(change.content).toString("base64"),
        encoding: "base64",
      })

      treeEntries.push({
        path: change.path,
        sha: data.sha,
        mode: "100644",
        type: "blob",
      })
    }

    // Create new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentCommit.tree.sha,
      tree: treeEntries as unknown as GitCreateTreeParameters["tree"],
    })

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: "AI-generated changes via DevStudio",
      tree: newTree.sha,
      parents: [currentCommitSha],
    })

    // Update reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: "heads/main",
      sha: newCommit.sha,
    }).catch(async () => {
      // Try default branch if main doesn't exist
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      return octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
        sha: newCommit.sha,
      })
    })

    return { success: true }
  } catch (error) {
    console.error("Error deploying changes:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to deploy changes" 
    }
  }
}
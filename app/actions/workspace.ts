"use server"

import { Octokit } from "@octokit/rest"
import { auth } from "@/auth"
import { generateCode } from "@/lib/gemini"

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
    content: string
  }>
}

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
    // Get file tree for context
    const fileTree = await getFileTree(repoFullName)
    
    // Build file context string
    const buildFileContext = (nodes: FileNode[], depth = 0): string => {
      let context = ""
      const indent = "  ".repeat(depth)
      
      nodes.forEach((node) => {
        context += `${indent}${node.type === "dir" ? "📁" : "📄"} ${node.name}\n`
        if (node.children) {
          context += buildFileContext(node.children, depth + 1)
        }
      })
      
      return context
    }

    const fileContext = buildFileContext(fileTree)
    
    // Generate code using Gemini
    const result = await generateCode(prompt, fileContext)
    
    return result
  } catch (error) {
    console.error("Error generating code:", error)
    throw new Error("Failed to generate code")
  }
}

export async function deployChanges(
  repoFullName: string,
  changes: Array<{ path: string; content: string }>
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

    // Create blobs for all files
    const blobs = await Promise.all(
      changes.map(async (change) => {
        const { data } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(change.content).toString("base64"),
          encoding: "base64",
        })
        return {
          path: change.path,
          sha: data.sha,
          mode: "100644" as const,
          type: "blob" as const,
        }
      })
    )

    // Create new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentCommit.tree.sha,
      tree: blobs,
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
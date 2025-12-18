"use server"

import { Octokit } from "@octokit/rest"
import type { RestEndpointMethodTypes } from "@octokit/rest"
import { auth } from "@/auth"
import { generateCode as generateCodeWithGemini } from "@/lib/gemini" 

// --- Types & Interfaces ---

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

export type ModelProvider = "gemini"

type GitCreateTreeParameters = RestEndpointMethodTypes["git"]["createTree"]["parameters"]

// --- Helper Functions ---

export async function getFileTree(repoFullName: string): Promise<FileNode[]> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error("Unauthorized")
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const [owner, repo] = repoFullName.split("/")

    // 1. Try to fetch the tree from HEAD
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true" as any,
    }).catch((err: any) => {
       // 2. Handle "Empty Repository" or "Branch not found" errors gracefully
       if (err.status === 409 || (err.status === 404 && err.message?.toLowerCase().includes("empty"))) {
         console.warn("⚠️ Repository appears empty (No HEAD found). Returning empty tree.");
         return { data: { tree: [] } };
       }
       throw err; 
    });

    if (!data || !data.tree) return [];

    const tree: FileNode[] = []
    const dirMap = new Map<string, FileNode>()

    data.tree.forEach((item) => {
      if (!item.path) return
      
      const parts = item.path.split("/")
      let currentLevel = tree
      let currentPath = ""

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (i === parts.length - 1) {
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
              if (!parentNode.children) parentNode.children = []
              parentNode.children.push(node)
            }
          }

          if (item.type === "tree") {
            dirMap.set(item.path, node)
          }
        } else {
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
                if (!parentNode.children) parentNode.children = []
                parentNode.children.push(existingNode)
              }
            }
          }
          currentLevel = existingNode.children || []
        }
      }
    })

    return tree
  } catch (error: any) {
    console.error("Error fetching file tree:", error.message || error)
    if (error.status === 404) {
        throw new Error("Repository not found. Check permissions.");
    }
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

// --- Main Actions ---

export async function generateCode(
  repoFullName: string,
  prompt: string,
  mediaData?: { data: string; mimeType: string }
): Promise<CodeGenerationResult> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error("Unauthorized")
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const [owner, repo] = repoFullName.split("/")

    console.log(`🚀 Action: generateCode | Repo: ${repoFullName}`);
    
    // Log video size ONLY (prevents terminal crash)
    if (mediaData) {
        console.log(`📹 Video Input: ${(mediaData.data.length / 1024 / 1024).toFixed(2)} MB`);
    }

    // 1. Get File Tree
    const fileTree = await getFileTree(repoFullName)
    
    // 2. Collect Content of Key Files
    const keyFileExtensions = [".html", ".css", ".js", ".jsx", ".tsx", ".ts", ".json", ".md"]
    const blockedFiles = ["package-lock.json", "yarn.lock"]
    
    const allFiles: string[] = []
    
    const collectFiles = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (node.type === "file") {
          const ext = node.path.split('.').pop()?.toLowerCase()
          if (
            ext && 
            keyFileExtensions.some(keyExt => node.path.endsWith(keyExt)) &&
            !blockedFiles.some(blocked => node.path.includes(blocked))
          ) {
            allFiles.push(node.path)
          }
        }
        if (node.children) {
          collectFiles(node.children)
        }
      })
    }
    
    collectFiles(fileTree)
    
    let fileContextWithContent = ""
    
    // Fetch content sequentially (limit to top 30 files to avoid API limits)
    for (const filePath of allFiles.slice(0, 30)) { 
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
      }
    }
    
    // 3. Build Context Tree String
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
    const fullContext = `Repository Structure:\n${fileTreeContext}\n\nFile Contents:\n${fileContextWithContent}`
    
    // 4. Construct Image String Safely (The FIX for Google 400 Error)
    let imageString = undefined;
    if (mediaData) {
        // If data ALREADY starts with "data:", don't add it again.
        if (mediaData.data.startsWith("data:")) {
            imageString = mediaData.data;
        } else {
            // Otherwise, construct the proper Data URL
            imageString = `data:${mediaData.mimeType};base64,${mediaData.data}`;
        }
    }

    // 5. Call Gemini
    const result = await generateCodeWithGemini(prompt, fullContext, imageString)
    
    return result

  } catch (error) {
    console.error("Error generating code:", error instanceof Error ? error.message : "Unknown error")
    throw new Error(error instanceof Error ? error.message : "Failed to generate code")
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

    // 1. Get latest commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    }).catch(async () => {
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      return octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
      })
    })

    const currentCommitSha = refData.object.sha

    // 2. Get base tree
    const { data: currentCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    })

    // 3. Create Blobs & Tree Entries
    const treeEntries: Array<{
      path: string
      sha: string | null
      mode: "100644"
      type: "blob"
    }> = []

    for (const change of changes) {
      // Handle Deletions
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
        console.warn(`Skipping change for ${change.path} due to missing content`)
        continue
      }

      // Handle Creates/Updates
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

    // 4. Create Tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentCommit.tree.sha,
      tree: treeEntries as unknown as GitCreateTreeParameters["tree"],
    })

    // 5. Create Commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: "AI-generated changes via CodeSync",
      tree: newTree.sha,
      parents: [currentCommitSha],
    })

    // 6. Update Reference (Push)
    await octokit.git.updateRef({
      owner,
      repo,
      ref: "heads/main",
      sha: newCommit.sha,
    }).catch(async () => {
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
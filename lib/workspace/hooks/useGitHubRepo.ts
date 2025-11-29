"use client"

import { useState, useEffect, useCallback } from "react"

import { getFileTree, getFileContent } from "@/app/actions/workspace"
import type { GitHubFile } from "@/lib/workspace/types"

interface UseGitHubRepoParams {
  owner: string
  repo: string
  branch?: string
}

interface UseGitHubRepoReturn {
  files: GitHubFile[]
  isLoading: boolean
  error: string | null
  refreshFiles: () => Promise<void>
  getFileContent: (path: string) => Promise<string | null>
}

// Helper function to transform FileNode to GitHubFile
function transformFileNodeToGitHubFile(nodes: any[]): GitHubFile[] {
  const result: GitHubFile[] = []
  
  function processNode(node: any) {
    if (node.type === 'file') {
      result.push({
        path: node.path,
        mode: '100644', // Default file mode
        type: 'blob',
        sha: '', // Empty since we don't have SHA from FileNode
        size: node.size || 0,
        url: '', // Empty since we don't have URL from FileNode
      })
    } else if (node.children) {
      node.children.forEach(processNode)
    }
  }
  
  nodes.forEach(processNode)
  return result
}

export function useGitHubRepo(
  params: UseGitHubRepoParams
): UseGitHubRepoReturn {
  const [files, setFiles] = useState<GitHubFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshFiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const repoFullName = `${params.owner}/${params.repo}`
      const result = await getFileTree(repoFullName)
      const transformedFiles = transformFileNodeToGitHubFile(result)

      setFiles(transformedFiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [params.owner, params.repo])

  const fetchFileContent = useCallback(
    async (path: string): Promise<string | null> => {
      try {
        const repoFullName = `${params.owner}/${params.repo}`
        const result = await getFileContent(repoFullName, path)

        return result
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : "An unknown error occurred"
        )
        return null
      }
    },
    [params.owner, params.repo]
  )

  useEffect(() => {
    if (params.owner && params.repo) {
      refreshFiles()
    }
  }, [params.owner, params.repo, refreshFiles])

  return {
    files,
    isLoading,
    error,
    refreshFiles,
    getFileContent: fetchFileContent,
  }
}

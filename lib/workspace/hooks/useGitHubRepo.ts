"use client"

import { useState, useEffect, useCallback } from "react"

import { fetchRepoTree, fetchFileContent } from "@/app/actions/workspace"
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
      const result = await fetchRepoTree({
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
      })

      if (result.success && result.tree) {
        setFiles(result.tree)
      } else {
        setError(result.error ?? "Failed to fetch repository files")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [params.owner, params.repo, params.branch])

  const getFileContent = useCallback(
    async (path: string): Promise<string | null> => {
      try {
        const result = await fetchFileContent({
          owner: params.owner,
          repo: params.repo,
          path,
          branch: params.branch,
        })

        if (result.success && result.content) {
          return result.content
        } else {
          console.error(result.error ?? "Failed to fetch file content")
          return null
        }
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : "An unknown error occurred"
        )
        return null
      }
    },
    [params.owner, params.repo, params.branch]
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
    getFileContent,
  }
}

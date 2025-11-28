"use server"

import { Octokit } from "@octokit/rest"

import { auth } from "@/auth"
import type {
  CommitChangesParams,
  CommitChangesResult,
  FetchRepoTreeParams,
  FetchRepoTreeResult,
  FetchFileContentParams,
  FetchFileContentResult,
} from "@/lib/workspace/types"

const DEFAULT_BRANCH = "main"

/**
 * Fetch the file tree structure from a GitHub repository
 */
export async function fetchRepoTree(
  params: FetchRepoTreeParams
): Promise<FetchRepoTreeResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: "You must be authenticated to fetch repository files.",
    }
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const { owner, repo, branch = DEFAULT_BRANCH } = params

    // Get the reference to get the commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    })

    const commitSha = ref.object.sha

    // Get the tree recursively
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: commitSha,
      recursive: "1",
    })

    // Filter to only include blobs (files)
    const files = tree.tree.filter((item) => item.type === "blob")

    return {
      success: true,
      tree: files,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch repository file tree."

    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Fetch the content of a specific file from a GitHub repository
 */
export async function fetchFileContent(
  params: FetchFileContentParams
): Promise<FetchFileContentResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: "You must be authenticated to fetch file content.",
    }
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const { owner, repo, path, branch = DEFAULT_BRANCH } = params

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })

    // Handle file content (not directory)
    if ("content" in data && data.type === "file") {
      // Content is base64 encoded
      const content = Buffer.from(data.content, "base64").toString("utf-8")
      return {
        success: true,
        content,
      }
    }

    return {
      success: false,
      error: "The specified path is not a file.",
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch file content."

    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Commit changes to a GitHub repository using the Git Data API
 */
export async function commitChanges(
  params: CommitChangesParams
): Promise<CommitChangesResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: "You must be authenticated to commit changes.",
    }
  }

  if (!params.changes.length) {
    return {
      success: false,
      error: "At least one change must be provided.",
    }
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })
    const { owner, repo, changes, commitMessage } = params
    const branch = DEFAULT_BRANCH

    // Get the latest commit
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    })
    const latestCommitSha = ref.object.sha

    const { data: latestCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    })
    const baseTreeSha = latestCommit.tree.sha

    // Create blobs for all changes
    const blobs = await Promise.all(
      changes.map(async (change) => {
        const { data } = await octokit.git.createBlob({
          owner,
          repo,
          content: change.content,
          encoding: "utf-8",
        })
        return {
          path: change.filename,
          sha: data.sha,
        }
      })
    )

    // Create a new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      })),
    })

    // Create a new commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha],
    })

    // Update the branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
      force: false,
    })

    return {
      success: true,
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to commit changes."

    return {
      success: false,
      error: message,
    }
  }
}

"use server";

import { Octokit } from "@octokit/rest";

import { auth } from "@/auth";
import type {
  FileToCreate,
  PushToGitHubParams,
  PushToGitHubResult,
} from "@/lib/github/types";

const DEFAULT_BRANCH = "main";

export async function pushToGithub(
  params: PushToGitHubParams
): Promise<PushToGitHubResult> {
  const session = await auth();

  if (!session?.accessToken) {
    return {
      success: false,
      error: "You must connect your GitHub account to deploy.",
    };
  }

  if (!params.repoName?.trim()) {
    return {
      success: false,
      error: "A repository name is required.",
    };
  }

  if (!params.files.length) {
    return {
      success: false,
      error: "At least one file must be provided.",
    };
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken });
    const { data: viewer } = await octokit.rest.users.getAuthenticated();

    const owner = viewer.login;
    const repo = params.repoName.trim();
    const branch = DEFAULT_BRANCH;
    const files = params.files.map((file) => ({
      ...file,
      path: sanitizePath(file.path),
    }));

    await ensureRepository(octokit, {
      owner,
      repo,
      description: params.description,
      isPrivate: params.isPrivate,
    });

    const { latestCommitSha, baseTreeSha } = await getLatestCommitInfo(
      octokit,
      owner,
      repo,
      branch
    );

    const blobs = await Promise.all(
      files.map((file) => createBlob(octokit, owner, repo, file))
    );

    const tree = await octokit.git.createTree({
      owner,
      repo,
      ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
      tree: blobs.map((blob, index) => ({
        path: files[index].path,
        mode: "100644",
        type: "blob",
        sha: blob,
      })),
    });

    const commitMessage =
      params.commitMessage ?? `DevStudio deployment - ${new Date().toISOString()}`;

    const commit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.data.sha,
      parents: latestCommitSha ? [latestCommitSha] : [],
    });

    await upsertBranchRef(
      octokit,
      owner,
      repo,
      branch,
      commit.data.sha,
      !!latestCommitSha
    );

    return {
      success: true,
      repoUrl: `https://github.com/${owner}/${repo}`,
      commitSha: commit.data.sha,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to push code to GitHub.";

    return {
      success: false,
      error: message,
    };
  }
}

async function ensureRepository(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    description?: string;
    isPrivate?: boolean;
  }
) {
  try {
    await octokit.repos.get({ owner: params.owner, repo: params.repo });
  } catch (error) {
    if (isNotFound(error)) {
      await octokit.repos.createForAuthenticatedUser({
        name: params.repo,
        description: params.description,
        private: params.isPrivate ?? true,
        auto_init: false,
      });
      return;
    }

    throw error;
  }
}

async function getLatestCommitInfo(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
) {
  try {
    const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const latestCommitSha = ref.data.object.sha;
    const commit = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });

    return {
      latestCommitSha,
      baseTreeSha: commit.data.tree.sha,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return {
        latestCommitSha: undefined,
        baseTreeSha: undefined,
      };
    }

    throw error;
  }
}

async function createBlob(
  octokit: Octokit,
  owner: string,
  repo: string,
  file: FileToCreate
) {
  const { data } = await octokit.git.createBlob({
    owner,
    repo,
    content: file.content,
    encoding: "utf-8",
  });

  return data.sha;
}

async function upsertBranchRef(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
  branchExists: boolean
) {
  if (branchExists) {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha,
      force: false,
    });
    return;
  }

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha,
  });
}

function sanitizePath(path: string) {
  if (!path || typeof path !== "string") {
    throw new Error("Each file must include a valid path.");
  }

  const normalized = path.replace(/^\/+/, "");

  if (!normalized) {
    throw new Error("File paths cannot be empty.");
  }

  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("File paths cannot traverse directories.");
  }

  return normalized;
}

function isNotFound(error: unknown): error is { status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 404
  );
}

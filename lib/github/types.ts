export interface FileToCreate {
  path: string;
  content: string;
}

export interface PushToGitHubParams {
  repoName: string;
  files: FileToCreate[];
  commitMessage?: string;
  description?: string;
  isPrivate?: boolean;
}

export interface PushToGitHubResult {
  success: boolean;
  repoUrl?: string;
  commitSha?: string;
  error?: string;
}

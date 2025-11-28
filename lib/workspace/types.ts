export interface GitHubFile {
  path: string
  mode: string
  type: "blob" | "tree"
  sha: string
  size?: number
  url: string
}

export interface GitHubTree {
  sha: string
  url: string
  tree: GitHubFile[]
  truncated: boolean
}

export interface FileChange {
  filename: string
  content: string
  status: "new" | "modified"
}

export interface AIResponse {
  explanation: string
  changes: FileChange[]
}

export interface CommitChangesParams {
  owner: string
  repo: string
  changes: FileChange[]
  commitMessage: string
}

export interface CommitChangesResult {
  success: boolean
  commitSha?: string
  commitUrl?: string
  error?: string
}

export interface FetchRepoTreeParams {
  owner: string
  repo: string
  branch?: string
}

export interface FetchRepoTreeResult {
  success: boolean
  tree?: GitHubFile[]
  error?: string
}

export interface FetchFileContentParams {
  owner: string
  repo: string
  path: string
  branch?: string
}

export interface FetchFileContentResult {
  success: boolean
  content?: string
  error?: string
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Unlock, Plus, Github } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RepoOption {
  id: number
  name: string
  fullName: string
  private: boolean
  htmlUrl: string
}

interface RepoManagerProps {
  onSelect?: (repo: RepoOption) => void
  disabled?: boolean
}

export function RepoManager({ onSelect, disabled }: RepoManagerProps) {
  const router = useRouter()
  const [repos, setRepos] = React.useState<RepoOption[]>([])
  const [selectedRepo, setSelectedRepo] = React.useState<RepoOption | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [newRepoName, setNewRepoName] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    const fetchRepos = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/github/repos")
        if (!response.ok) {
          throw new Error("Unable to load repositories. Connect GitHub to continue.")
        }
        const data = await response.json()
        if (mounted) {
          setRepos(data.repos ?? [])
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error")
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchRepos()
    return () => {
      mounted = false
    }
  }, [])

  const handleSelect = (repo: RepoOption) => {
    setSelectedRepo(repo)
    onSelect?.(repo)
    router.push(`/workspace?repo=${encodeURIComponent(repo.fullName)}`)
  }

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newRepoName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create repository")
      }

      const data = await response.json()
      const newRepo = data.repo

      // Add to repos list
      setRepos(prev => [newRepo, ...prev])
      
      // Reset and close dialog
      setNewRepoName("")
      setIsCreateDialogOpen(false)

      // Redirect to workspace
      router.push(`/workspace?repo=${encodeURIComponent(newRepo.fullName)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository")
    } finally {
      setIsCreating(false)
    }
  }

  const label = selectedRepo
    ? `${selectedRepo.fullName}${selectedRepo.private ? " (private)" : ""}`
    : "Select a repository"

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              disabled={disabled || isLoading || !!error}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isLoading && selectedRepo?.private && (
                <Lock className="mr-2 h-4 w-4" aria-hidden />
              )}
              {!isLoading && selectedRepo && !selectedRepo.private && (
                <Unlock className="mr-2 h-4 w-4" aria-hidden />
              )}
              {label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel>Your repositories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {repos.length === 0 && !isLoading && (
              <DropdownMenuItem disabled>No repositories found</DropdownMenuItem>
            )}
            {repos.map((repo) => (
              <DropdownMenuItem key={repo.id} onSelect={() => handleSelect(repo)}>
                <div className="flex items-center gap-2">
                  {repo.private ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{repo.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {repo.private ? "Private" : "Public"}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={disabled || isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Repository</DialogTitle>
              <DialogDescription>
                Create a new GitHub repository to start building your project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="repo-name" className="text-sm font-medium">
                  Repository Name
                </label>
                <Input
                  id="repo-name"
                  placeholder="my-awesome-project"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRepo}
                disabled={!newRepoName.trim() || isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Repository
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
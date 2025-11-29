"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Unlock, Plus, Search, X, Code } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  const [searchQuery, setSearchQuery] = React.useState("")

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
  }

  const handleEdit = () => {
    if (!selectedRepo) return
    router.push(`/workspace?repo=${encodeURIComponent(selectedRepo.fullName)}`)
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

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const label = selectedRepo
    ? `${selectedRepo.fullName}${selectedRepo.private ? " (private)" : ""}`
    : "Select a repository"

  return (
    <div className="space-y-4 flex flex-col">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">
            {selectedRepo ? (
              <div className="flex items-center gap-2">
                {selectedRepo.private ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{label}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">No repository selected</span>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-md p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : repos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No repositories found</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No repositories match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="space-y-2 pr-4">
            {filteredRepos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleSelect(repo)}
                disabled={disabled || isLoading}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  selectedRepo?.id === repo.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-2">
                  {repo.private ? (
                    <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <Unlock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{repo.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {repo.private ? "Private" : "Public"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2 pt-2">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={disabled || isLoading} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Create New Repository
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

        <Button 
          onClick={handleEdit}
          disabled={!selectedRepo || disabled || isLoading}
          className="flex-1 gap-2"
          size="lg"
        >
          <Code className="h-4 w-4" />
          Edit Project
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}
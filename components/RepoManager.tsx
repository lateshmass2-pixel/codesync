"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Unlock, Plus, Search, X, Code, Settings } from "lucide-react"

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
  updatedAt?: string
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Your Projects</h1>
          <p className="text-slate-600">Select a repository to start building or create a new one</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              placeholder="Search repositories..."
              className="pl-12 h-14 bg-white/40 backdrop-blur-md border border-white/50 text-slate-800 placeholder-slate-500 rounded-2xl focus:bg-white/60 focus:border-white/70"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Repository Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto" />
              <p className="mt-4 text-slate-600">Loading repositories...</p>
            </div>
          </div>
        ) : repos.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-8 text-center">
              <p className="text-slate-600">No repositories found</p>
            </div>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-8 text-center">
              <p className="text-slate-600">No repositories match &quot;{searchQuery}&quot;</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => handleSelect(repo)}
                className={`group relative bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:bg-white/60 hover:shadow-lg hover:scale-[1.02] ${
                  selectedRepo?.id === repo.id
                    ? "ring-2 ring-blue-400/50 bg-white/50"
                    : ""
                }`}
              >
                {/* Edit Button - Shows on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(repo)
                    handleEdit()
                  }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity duration-200 bg-white/60 backdrop-blur-sm border border-white/50 rounded-lg p-2 hover:bg-white/80 md:group-hover:opacity-100"
                >
                  <Settings className="h-4 w-4 text-slate-600" />
                </button>

                {/* Mobile always visible edit button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(repo)
                    handleEdit()
                  }}
                  className="absolute top-4 right-4 md:hidden bg-white/60 backdrop-blur-sm border border-white/50 rounded-lg p-2 hover:bg-white/80"
                >
                  <Settings className="h-4 w-4 text-slate-600" />
                </button>

                {/* Card Content */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    repo.private 
                      ? 'bg-amber-100/80' 
                      : 'bg-emerald-100/80'
                  }`}>
                    {repo.private ? (
                      <Lock className="h-6 w-6 text-amber-600" />
                    ) : (
                      <Unlock className="h-6 w-6 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-800 truncate mb-1">
                      {repo.name}
                    </h3>
                    <p className="text-sm text-slate-600 truncate mb-2">
                      {repo.fullName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        repo.private 
                          ? 'bg-amber-100/60 text-amber-700' 
                          : 'bg-emerald-100/60 text-emerald-700'
                      }`}>
                        {repo.private ? "Private" : "Public"}
                      </span>
                      {repo.updatedAt && (
                        <span className="text-xs text-slate-500">
                          Updated {new Date(repo.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 max-w-md mx-auto">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={disabled || isLoading} 
                className="flex-1 h-14 bg-white/40 backdrop-blur-md border border-white/50 text-slate-800 hover:bg-white/60 rounded-2xl font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Repository
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/80 backdrop-blur-xl border border-white/60">
              <DialogHeader>
                <DialogTitle className="text-slate-800">Create New Repository</DialogTitle>
                <DialogDescription className="text-slate-600">
                  Create a new GitHub repository to start building your project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="repo-name" className="text-sm font-medium text-slate-700">
                    Repository Name
                  </label>
                  <Input
                    id="repo-name"
                    placeholder="my-awesome-project"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    disabled={isCreating}
                    className="bg-white/60 border-white/50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                  className="bg-white/40 border-white/50 text-slate-700 hover:bg-white/60"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRepo}
                  disabled={!newRepoName.trim() || isCreating}
                  className="bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-400/50"
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
            className="flex-1 h-14 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white hover:bg-blue-600/80 rounded-2xl font-medium gap-2"
          >
            <Code className="h-5 w-5" />
            Edit Project
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-red-50/80 backdrop-blur-md border border-red-200/60 rounded-2xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
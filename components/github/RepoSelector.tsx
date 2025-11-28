"use client";

import * as React from "react";
import { Loader2, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RepoOption {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
}

interface RepoSelectorProps {
  onSelect?: (repo: RepoOption) => void;
  disabled?: boolean;
}

export function RepoSelector({ onSelect, disabled }: RepoSelectorProps) {
  const [repos, setRepos] = React.useState<RepoOption[]>([]);
  const [selectedRepo, setSelectedRepo] = React.useState<RepoOption | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchRepos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/github/repos");
        if (!response.ok) {
          throw new Error("Unable to load repositories. Connect GitHub to continue.");
        }
        const data = await response.json();
        if (mounted) {
          setRepos(data.repos ?? []);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRepos();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = (repo: RepoOption) => {
    setSelectedRepo(repo);
    onSelect?.(repo);
  };

  const label = selectedRepo
    ? `${selectedRepo.fullName}${selectedRepo.private ? " (private)" : ""}`
    : "Select a repository";

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled || isLoading || !!error}>
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
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Your repositories</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {repos.length === 0 && !isLoading && (
            <DropdownMenuItem disabled>No repositories found</DropdownMenuItem>
          )}
          {repos.map((repo) => (
            <DropdownMenuItem key={repo.id} onSelect={() => handleSelect(repo)}>
              <div>
                <p className="text-sm font-medium">{repo.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {repo.private ? "Private" : "Public"}
                </p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

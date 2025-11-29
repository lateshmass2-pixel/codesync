"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { ConnectGithubBtn } from "@/components/github/ConnectGithubBtn"
import { RepoManager } from "@/components/RepoManager"
import { GitBranch, Zap } from "lucide-react"

export function Dashboard() {
  const { data: session } = useSession()
  const isConnected = Boolean(session?.accessToken)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <section className="space-y-4 text-center mb-16">
          <div className="flex items-center justify-center gap-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">
            <Zap className="h-4 w-4" />
            <p>DevStudio</p>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            Build production-ready apps with AI
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Connect your GitHub account, let DevStudio generate your application, and
            push straight to your repository using secure OAuth tokens.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card/30 p-8 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Step 1
                  </p>
                  <p className="text-xl font-semibold mt-1">
                    {isConnected
                      ? "✓ GitHub Connected"
                      : "Connect GitHub"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isConnected
                      ? "Your GitHub account is connected with repository permissions."
                      : "Authorize DevStudio to access your repositories with the repo scope."}
                  </p>
                </div>
              </div>
              <div>
                <ConnectGithubBtn variant={isConnected ? "outline" : "default"} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card/30 p-8 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Step 2
                  </p>
                  <p className="text-xl font-semibold mt-1">
                    Select Repository
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Choose an existing repository or create a new one to start building.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {isConnected && (
          <section className="mt-8 rounded-2xl border bg-card/50 p-8 shadow-lg backdrop-blur-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Your Repositories</h2>
                <p className="text-sm text-muted-foreground">
                  Select a repository and click &quot;Edit Project&quot; to open the AI code editor.
                </p>
              </div>
              <RepoManager />
            </div>
          </section>
        )}

        {!isConnected && (
          <section className="mt-8 rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to view and manage your repositories.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

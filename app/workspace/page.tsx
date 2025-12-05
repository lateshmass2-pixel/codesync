"use client"
export const dynamic = "force-dynamic";
export const maxDuration = 300;
import * as React from "react"
import { useSearchParams } from "next/navigation"

import { Workspace } from "@/components/workspace/Workspace"

export default function WorkspacePage() {
  const searchParams = useSearchParams()
  const repoFullName = searchParams.get("repo")

  if (!repoFullName) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Repository Selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please select a repository from the home page.
          </p>
        </div>
      </div>
    )
  }

  const [owner, repo] = repoFullName.split("/")

  if (!owner || !repo) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Invalid Repository</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Repository format should be: owner/repo
          </p>
        </div>
      </div>
    )
  }

  return <Workspace owner={owner} repo={repo} />
}

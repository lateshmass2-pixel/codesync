"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageSquare, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavRailProps {
  repoFullName: string
}

export function NavRail({ repoFullName }: NavRailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = (searchParams.get("view") as "chat" | "code") || "chat"

  const handleViewChange = (view: "chat" | "code") => {
    const params = new URLSearchParams(searchParams)
    params.set("view", view)
    router.push(`/workspace?${params.toString()}`)
  }

  return (
    <div className="w-16 border-r border-white/40 bg-white/25 backdrop-blur-xl flex flex-col items-center py-4 gap-4 flex-shrink-0">
      {/* Chat View Button */}
      <Button
        variant={currentView === "chat" ? "default" : "ghost"}
        size="icon"
        onClick={() => handleViewChange("chat")}
        title="Chat View"
        className={cn(
          "h-10 w-10 rounded-xl transition-all duration-300",
          currentView === "chat" 
            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:scale-105 shadow-md" 
            : "hover:bg-white/30 text-slate-700 hover:text-slate-900"
        )}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* Code View Button */}
      <Button
        variant={currentView === "code" ? "default" : "ghost"}
        size="icon"
        onClick={() => handleViewChange("code")}
        title="Code View"
        className={cn(
          "h-10 w-10 rounded-xl transition-all duration-300",
          currentView === "code" 
            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:scale-105 shadow-md" 
            : "hover:bg-white/30 text-slate-700 hover:text-slate-900"
        )}
      >
        <Code className="h-5 w-5" />
      </Button>
    </div>
  )
}

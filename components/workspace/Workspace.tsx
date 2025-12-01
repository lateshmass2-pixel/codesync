"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { 
  getFileTree, 
  getFileContent,
  generateCodeWithGemini, 
  deployChanges 
} from "@/app/actions/workspace"
import { NavRail } from "./NavRail"
import { ChatView } from "./ChatView"
import { CodeView } from "./CodeView"

interface FileNode {
  name: string
  path: string
  type: "file" | "dir"
  size?: number
  children?: FileNode[]
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  changes?: Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>
}

interface WorkspaceProps {
  owner: string
  repo: string
}

export function Workspace({ owner, repo }: WorkspaceProps) {
  const repoFullName = `${owner}/${repo}`
  const searchParams = useSearchParams()
  const currentView = (searchParams.get("view") as "chat" | "code") || "chat"
  
  // File explorer state
  const [files, setFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Code view state
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [loadingFile, setLoadingFile] = useState(false)

  // Chat state - persists across view switches
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  // Generation state
  const [logs, setLogs] = useState<string[]>([])
  const [pendingChanges, setPendingChanges] = useState<Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Load file tree
  const loadFileTree = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const fileTree = await getFileTree(repoFullName)
      setFiles(fileTree)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repository")
    } finally {
      setIsLoading(false)
    }
  }, [repoFullName])

  // Load file content
  const loadFileContent = useCallback(async (path: string) => {
    setLoadingFile(true)
    
    try {
      const content = await getFileContent(repoFullName, path)
      setFileContent(content || "")
    } catch (err) {
      console.error("Failed to load file content:", err)
      setFileContent("// Failed to load file content")
    } finally {
      setLoadingFile(false)
    }
  }, [repoFullName])

  // Initialize file tree on mount
  useEffect(() => {
    loadFileTree()
  }, [loadFileTree])

  // Load file content when selected
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile)
    }
  }, [selectedFile, loadFileContent])

  const handleSelectFile = (path: string) => {
    setSelectedFile(path)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsSendingMessage(true)
    setDeployResult(null)
    setLogs([])

    // Add user message to chat
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ]
    setMessages(newMessages)

    // Progress Simulation
    setLogs(prev => [...prev, "🚀 Connecting to Repository..."])
    
    setTimeout(() => {
      setLogs(prev => [...prev, "📖 Reading file contents (index.html, style.css)..."])
    }, 2000)
    
    setTimeout(() => {
      setLogs(prev => [...prev, "🧠 AI is analyzing logic..."])
    }, 4000)

    try {
      const result = await generateCodeWithGemini(repoFullName, userMessage)

      setLogs(prev => [...prev, "✅ Code generated! Parsing JSON..."])

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.explanation,
        changes: result.changes,
      }

      setMessages([...newMessages, assistantMessage])

      if (assistantMessage.changes && assistantMessage.changes.length > 0) {
        setPendingChanges(assistantMessage.changes)
      }
    } catch (error) {
      setLogs(prev => [...prev, "❌ Error generating code"])
      const errorMessage: ChatMessage = {
        role: "system",
        content:
          "Error: " +
          (error instanceof Error ? error.message : "Failed to generate code"),
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleOpenReviewModal = () => {
    if (pendingChanges.length === 0) return
  }

  const handleConfirmAndPush = async () => {
    if (pendingChanges.length === 0) return

    setIsDeploying(true)
    setDeployResult(null)

    try {
      const result = await deployChanges(repoFullName, pendingChanges)

      if (result.success) {
        setDeployResult({
          success: true,
          message: "Changes deployed successfully!",
        })
        setPendingChanges([])
        await loadFileTree()
      } else {
        setDeployResult({
          success: false,
          message: result.error || "Failed to deploy changes",
        })
      }
    } catch (error) {
      setDeployResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to deploy changes",
      })
    } finally {
      setIsDeploying(false)
    }
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50">
        <div className="text-center bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Error Loading Repository</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50 text-slate-800 font-sans">
      {/* Top-level layout with NavRail + View Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Rail */}
        <NavRail repoFullName={repoFullName} />

        {/* Main View Container */}
        {currentView === "chat" ? (
          // Full-screen Chat View
          <ChatView
            messages={messages}
            inputMessage={inputMessage}
            isSendingMessage={isSendingMessage}
            logs={logs}
            pendingChanges={pendingChanges}
            deployResult={deployResult}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onOpenReviewModal={handleOpenReviewModal}
            repoFullName={repoFullName}
          />
        ) : (
          // Full-screen Code View with File Tree + Editor
          <CodeView
            files={files}
            selectedFile={selectedFile}
            fileContent={fileContent}
            loadingFile={loadingFile}
            pendingChanges={pendingChanges}
            onSelectFile={handleSelectFile}
            onOpenReviewModal={handleOpenReviewModal}
            onConfirmAndPush={handleConfirmAndPush}
            isDeploying={isDeploying}
            repoFullName={repoFullName}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}

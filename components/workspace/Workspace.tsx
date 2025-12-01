"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Send, Loader2, Code, MessageSquare, CheckCircle, XCircle } from "lucide-react"

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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-xl max-w-md mx-auto text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Error Loading Repository</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50">
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white/30 backdrop-blur-xl border-b border-white/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Code className="h-6 w-6 text-slate-700" />
              <div>
                <h1 className="text-xl font-semibold text-slate-800">{repoFullName}</h1>
                <p className="text-sm text-slate-600">AI-Powered Development Workspace</p>
              </div>
            </div>
            <NavRail repoFullName={repoFullName} />
          </div>
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Panel - Left 40% */}
          <div className="w-2/5 bg-white/30 backdrop-blur-xl border-r border-white/40 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white/20 backdrop-blur-sm border-b border-white/30 px-6 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-800">AI Assistant</h2>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Start a conversation with the AI assistant</p>
                  <p className="text-sm text-slate-500 mt-2">Ask me to help you build or modify your project</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                          : message.role === "system"
                          ? "bg-red-50/80 text-red-700 border border-red-200/60"
                          : "bg-white/70 text-slate-800 shadow-sm border border-white/50"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Terminal Logs */}
              {logs.length > 0 && (
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-green-400 font-mono text-sm space-y-1">
                  {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              )}

              {/* Deployment Result */}
              {deployResult && (
                <div className={`rounded-xl p-4 border ${
                  deployResult.success
                    ? "bg-emerald-50/80 border-emerald-200/60 text-emerald-800"
                    : "bg-red-50/80 border-red-200/60 text-red-800"
                }`}>
                  <div className="flex items-center gap-2">
                    {deployResult.success ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <p className="text-sm font-medium">{deployResult.message}</p>
                  </div>
                </div>
              )}

              {/* Pending Changes Banner */}
              {pendingChanges.length > 0 && (
                <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        {pendingChanges.length} pending change{pendingChanges.length > 1 ? "s" : ""} ready
                      </p>
                      <p className="text-xs text-amber-700 mt-1">Review and deploy to repository</p>
                    </div>
                    <button
                      onClick={handleOpenReviewModal}
                      className="px-3 py-1 bg-amber-600/80 hover:bg-amber-700/80 text-white text-sm rounded-lg transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white/60 backdrop-blur-md border-t border-white/40 p-4">
              <div className="flex gap-3">
                <textarea
                  rows={3}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask the AI to help you build something..."
                  className="flex-1 resize-none bg-white/50 border border-white/50 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-500 focus:bg-white/70 focus:border-white/70 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isSendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSendingMessage}
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-600/80 disabled:bg-slate-400/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 self-end"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* Code Panel - Right 60% */}
          <div className="flex-1 bg-white/50 backdrop-blur-xl flex flex-col">
            {/* Code Header */}
            <div className="bg-white/20 backdrop-blur-sm border-b border-white/30 h-12 flex items-center px-6">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-800">Code Editor</h2>
              </div>
              {selectedFile && (
                <div className="ml-auto text-sm text-slate-600">
                  {selectedFile}
                </div>
              )}
            </div>

            {/* File Tree + Editor */}
            <div className="flex-1 flex overflow-hidden">
              {/* File Tree Sidebar */}
              <div className="w-64 bg-white/30 backdrop-blur-sm border-r border-white/30 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Files</h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div
                          key={file.path}
                          onClick={() => handleSelectFile(file.path)}
                          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            selectedFile === file.path
                              ? "bg-blue-100/60 text-blue-700 font-medium"
                              : "text-slate-700 hover:bg-white/50"
                          }`}
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Monaco Editor Area */}
              <div className="flex-1 bg-[#1e1e1e] relative">
                {selectedFile ? (
                  <div className="h-full">
                    {/* File Tab */}
                    <div className="h-10 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-4">
                      <span className="text-sm text-[#cccccc]">{selectedFile}</span>
                    </div>
                    {/* Editor Content - Placeholder for Monaco */}
                    <div className="h-[calc(100%-2.5rem)] p-4 font-mono text-sm text-[#cccccc] overflow-auto">
                      {loadingFile ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-[#cccccc]" />
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap">{fileContent}</pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[#858585]">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a file to view its contents</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deploy Button (when there are pending changes) */}
            {pendingChanges.length > 0 && (
              <div className="bg-white/60 backdrop-blur-md border-t border-white/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {pendingChanges.length} change{pendingChanges.length > 1 ? "s" : ""} ready to deploy
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmAndPush}
                    disabled={isDeploying}
                    className="px-6 py-2 bg-green-600/80 hover:bg-green-700/80 disabled:bg-slate-400/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
                  >
                    {isDeploying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Deploy to GitHub</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
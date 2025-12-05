"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Send, Loader2, Code, MessageSquare, CheckCircle, XCircle, Paperclip, X, Eye, ChevronDown } from "lucide-react"

import { 
  getFileTree, 
  getFileContent,
  generateCode, 
  deployChanges 
} from "@/app/actions/workspace"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NavRail } from "./NavRail"
import { ChatView } from "./ChatView"
import { CodeView } from "./CodeView"
import { CodeDiffViewer } from "./CodeDiffViewer"

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

const MODEL_OPTIONS = [
  {
    value: "bytez" as const,
    label: "Claude Opus 4.1 (Bytez)",
    helper: "Best for Coding",
  },
  {
    value: "gemini" as const,
    label: "Gemini 2.0 Flash",
    helper: "Fast & Huge Context",
  },
] as const

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
  
  // Vision state - supports both images and videos
  const [selectedMedia, setSelectedMedia] = useState<{
    data: string;
    type: "image" | "video";
    mimeType: string;
  } | null>(null)
  const [modelProvider, setModelProvider] = useState<"gemini" | "bytez">("bytez")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeModelMeta = MODEL_OPTIONS.find((option) => option.value === modelProvider) ?? MODEL_OPTIONS[0]

  // Generation state
  const [logs, setLogs] = useState<string[]>([])
  const [pendingChanges, setPendingChanges] = useState<Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Review modal state
  const [showReview, setShowReview] = useState(false)
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null)
  const [originalFileContent, setOriginalFileContent] = useState<string>("")
  const [loadingOriginalContent, setLoadingOriginalContent] = useState(false)

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

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Enforce 20MB limit for videos
    const MAX_SIZE = 20 * 1024 * 1024 // 20MB in bytes
    if (file.size > MAX_SIZE) {
      alert(`File size exceeds 20MB limit. Please select a smaller file.`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Determine media type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      alert('Please select an image or video file.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setSelectedMedia({
        data: result,
        type: isVideo ? "video" : "image",
        mimeType: file.type
      })
    }
    reader.readAsDataURL(file)
  }

  const clearSelectedMedia = () => {
    setSelectedMedia(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
      setLogs(prev => [...prev, `🧠 ${activeModelMeta.label} is analyzing logic...`])
    }, 4000)

    try {
      const result = await generateCode(
        repoFullName, 
        userMessage,
        modelProvider,
        selectedMedia 
          ? { data: selectedMedia.data, mimeType: selectedMedia.mimeType }
          : undefined
      )

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
      setSelectedMedia(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleOpenReviewModal = () => {
    if (pendingChanges.length === 0) return
    setShowReview(true)
    if (pendingChanges.length > 0) {
      setSelectedDiffFile(pendingChanges[0].path)
    }
  }

  const loadOriginalContent = useCallback(
    async (path: string, isNewFile: boolean) => {
      if (isNewFile) {
        setOriginalFileContent("")
        return
      }

      setLoadingOriginalContent(true)

      try {
        const content = await getFileContent(repoFullName, path)
        setOriginalFileContent(content || "")
      } catch (err) {
        console.error("Failed to load original content:", err)
        setOriginalFileContent("")
      } finally {
        setLoadingOriginalContent(false)
      }
    },
    [repoFullName]
  )

  useEffect(() => {
    if (selectedDiffFile && showReview) {
      const change = pendingChanges.find((c) => c.path === selectedDiffFile)
      if (change) {
        const isNewFile = change.type === "create"
        loadOriginalContent(selectedDiffFile, isNewFile)
      }
    }
  }, [selectedDiffFile, showReview, pendingChanges, loadOriginalContent])

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
      rb: "ruby",
      php: "php",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      sh: "shell",
    }
    return languageMap[ext || ""] || "plaintext"
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
        setShowReview(false)
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
    <div className="h-screen w-full bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-8 bg-white/30 backdrop-blur-xl border-b border-white/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <Code className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{repoFullName}</h1>
            <p className="text-xs text-slate-600 font-medium">AI-Powered Development Workspace</p>
          </div>
        </div>
        <NavRail repoFullName={repoFullName} />
      </div>

      {/* Main Content - Glass Panels */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Chat Panel - Frosted Glass Pane */}
        <div className="w-[40%] h-full flex flex-col border border-white/50 bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          {/* Chat Header */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-white/60 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-300 to-blue-400 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">AI Assistant</h2>
              <p className="text-xs text-slate-500 font-medium">Powered by {activeModelMeta.label}</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center h-full">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">Start a conversation with the AI assistant</p>
                <p className="text-sm text-slate-500 mt-2">Ask me to help you build or modify your project</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-md ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-none shadow-lg"
                        : message.role === "system"
                        ? "bg-red-100/70 backdrop-blur-sm text-red-700 border border-red-200/80 rounded-bl-none"
                        : "bg-white/70 backdrop-blur-md text-slate-800 border border-white/60 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))
            )}

            {/* Terminal Logs */}
            {logs.length > 0 && (
              <div className="bg-slate-950/60 backdrop-blur-sm border border-slate-700/70 rounded-xl p-4 text-green-300 font-mono text-xs space-y-1 shadow-lg">
                {logs.map((log, index) => (
                  <div key={index} className="font-medium">{log}</div>
                ))}
              </div>
            )}

            {/* Deployment Result */}
            {deployResult && (
              <div className={`rounded-2xl p-4 border shadow-lg backdrop-blur-sm ${
                deployResult.success
                  ? "bg-emerald-100/70 border-emerald-300/80 text-emerald-800"
                  : "bg-red-100/70 border-red-300/80 text-red-800"
              }`}>
                <div className="flex items-center gap-3">
                  {deployResult.success ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-semibold">{deployResult.message}</p>
                </div>
              </div>
            )}

            {/* Pending Changes Banner */}
            {pendingChanges.length > 0 && (
              <div className="bg-amber-100/70 backdrop-blur-sm border border-amber-300/80 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {pendingChanges.length} pending change{pendingChanges.length > 1 ? "s" : ""} ready
                    </p>
                    <p className="text-xs text-amber-800 mt-1 font-medium">Review and deploy to repository</p>
                  </div>
                  <button
                    onClick={handleOpenReviewModal}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg transition-all hover:shadow-lg hover:scale-105"
                  >
                    Review
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Model Selector - Above Input */}
          <div className="flex-shrink-0 mx-4 mt-4 mb-2 flex items-center justify-between gap-4 px-4 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-600">Model</p>
              <p className="text-[10px] text-slate-500 font-medium">{activeModelMeta.helper}</p>
            </div>
            <div className="relative w-52">
              <select
                value={modelProvider}
                onChange={(event) => setModelProvider(event.target.value as "gemini" | "bytez")}
                disabled={isSendingMessage}
                className="w-full appearance-none bg-gray-900 border border-white/10 rounded-md text-xs px-3 py-1 pr-7 text-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/70" />
            </div>
          </div>

          {/* Input Area - Floating Glass Bar */}
          <div className="flex-shrink-0 m-4 mt-0 p-1 bg-white/60 backdrop-blur-lg border border-white/50 rounded-2xl shadow-lg">
            {/* Media Preview */}
            {selectedMedia && (
              <div className="mx-4 mt-3 mb-2 p-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {selectedMedia.type === "image" ? (
                    <img 
                      src={selectedMedia.data} 
                      alt="Selected" 
                      className="h-12 w-12 object-cover rounded border border-white/60"
                    />
                  ) : (
                    <video 
                      src={selectedMedia.data}
                      controls
                      className="h-12 w-20 object-cover rounded border border-white/60"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 font-medium">
                      {selectedMedia.type === "image" ? "Image" : "Video"} attached
                    </p>
                  </div>
                  <button
                    onClick={clearSelectedMedia}
                    className="p-1 rounded-full bg-red-100/80 hover:bg-red-200/80 text-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 relative">
              <textarea
                rows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask the AI to help you build something..."
                className="flex-1 resize-none bg-transparent focus:ring-0 focus:outline-none px-5 py-3 text-slate-800 placeholder-slate-500 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={isSendingMessage}
              />
              
              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSendingMessage}
                className="absolute bottom-3 left-3 p-2 rounded-xl bg-white/40 hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-all hover:shadow-md"
                title="Upload image or video"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSendingMessage}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white transition-all hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                {isSendingMessage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Code Panel - Slightly Less Opaque Glass Pane */}
        <div className="flex-1 h-full flex flex-col border border-white/50 bg-white/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          {/* Code Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/60 bg-white/20 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-300 to-teal-400 flex items-center justify-center">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Code Editor</h2>
            </div>
            {selectedFile && (
              <div className="text-sm text-slate-600 font-medium bg-white/40 px-3 py-1 rounded-lg border border-white/50">
                {selectedFile}
              </div>
            )}
          </div>

          {/* File Tree + Editor */}
          <div className="flex-1 flex overflow-hidden">
            {/* File Tree Sidebar */}
            <div className="w-64 bg-white/30 border-r border-white/50 overflow-y-auto flex-shrink-0">
              <div className="p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Files</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleSelectFile(file.path)}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-all text-sm font-medium ${
                          selectedFile === file.path
                            ? "bg-gradient-to-r from-blue-300/70 to-indigo-300/70 text-blue-900 shadow-md border border-blue-400/60"
                            : "text-slate-700 hover:bg-white/50 border border-transparent hover:border-white/40"
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
            <div className="flex-1 bg-white/10 backdrop-blur-sm relative flex flex-col">
              {selectedFile ? (
                <>
                  {/* File Tab */}
                  <div className="h-10 bg-white/20 border-b border-white/40 flex items-center px-5 flex-shrink-0">
                    <span className="text-sm text-slate-700 font-medium">{selectedFile}</span>
                  </div>
                  {/* Editor Content */}
                  <div className="flex-1 p-6 font-mono text-sm text-slate-700 overflow-auto">
                    {loadingFile ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap leading-relaxed text-xs">{fileContent}</pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                      <Code className="h-8 w-8 text-slate-500 opacity-70" />
                    </div>
                    <p className="text-slate-600 font-medium">Select a file to view its contents</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deploy Button (when there are pending changes) */}
          {pendingChanges.length > 0 && (
            <div className="h-16 bg-white/40 backdrop-blur-md border-t border-white/50 px-6 flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-slate-800">
                {pendingChanges.length} change{pendingChanges.length > 1 ? "s" : ""} ready to deploy
              </p>
              <button
                onClick={handleConfirmAndPush}
                disabled={isDeploying}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {isDeploying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Deploy to GitHub
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Changes Modal */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col space-y-4 bg-white/95 backdrop-blur-xl border border-white/60 z-[100]">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">Review Changes</DialogTitle>
            <DialogDescription className="text-base text-slate-600">
              Review the AI-generated changes before deploying to GitHub
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* File List Sidebar */}
            <div className="w-64 border border-slate-200 bg-slate-50/50 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">
                  Changed Files ({pendingChanges.length})
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-2">
                  {pendingChanges.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-start gap-2 px-3 py-2.5 rounded cursor-pointer hover:bg-slate-100 transition-colors ${
                        selectedDiffFile === change.path
                          ? "bg-slate-100 border-l-2 border-blue-500"
                          : ""
                      }`}
                      onClick={() => setSelectedDiffFile(change.path)}
                    >
                      <div className={`h-4 w-4 mt-0.5 flex-shrink-0 rounded ${
                        change.type === "create"
                          ? "bg-green-500"
                          : change.type === "delete"
                            ? "bg-red-500"
                            : "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-all text-slate-800">{change.path}</p>
                        <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          change.type === "create"
                            ? "bg-green-100 text-green-700"
                            : change.type === "delete"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                        }`}>
                          {change.type === "create"
                            ? "new"
                            : change.type === "delete"
                              ? "deleted"
                              : "modified"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Diff Viewer */}
            <div className="flex-1 border border-slate-200 bg-slate-50/50 rounded-lg overflow-hidden flex flex-col">
              {selectedDiffFile ? (
                <>
                  <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-800">{selectedDiffFile}</p>
                  </div>
                  <div className="flex-1">
                    <CodeDiffViewer
                      originalContent={originalFileContent}
                      modifiedContent={
                        pendingChanges.find((c) => c.path === selectedDiffFile)
                          ?.content || ""
                      }
                      language={getLanguageFromFilename(selectedDiffFile)}
                      isLoading={loadingOriginalContent}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-8">
                    <Eye className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="mt-4 text-sm text-slate-600">
                      Select a file to view the diff
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setShowReview(false)}
              disabled={isDeploying}
              className="border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndPush}
              disabled={isDeploying}
              className="gap-2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirm & Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
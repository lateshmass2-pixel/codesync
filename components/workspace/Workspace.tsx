"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { AlertCircle, Send, Loader2, Code, MessageSquare, CheckCircle, XCircle, Paperclip, X, Settings, History, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { 
  getFileTree, 
  getFileContent,
  generateCode, 
  deployChanges 
} from "@/app/actions/workspace"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CodeDiffViewer } from "./CodeDiffViewer"
import { FileTree } from "./FileTree"

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
  
  // File explorer state
  const [files, setFiles] = useState<FileNode[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFileExplorer, setShowFileExplorer] = useState(false)
  
  // Code view state
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [loadingFile, setLoadingFile] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  // Vision state
  const [selectedMedia, setSelectedMedia] = useState<{
    data: string;
    type: "image" | "video";
    mimeType: string;
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setIsLoadingFiles(true)
    setError(null)
    
    try {
      const fileTree = await getFileTree(repoFullName)
      setFiles(fileTree)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repository")
    } finally {
      setIsLoadingFiles(false)
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
    setShowFileExplorer(false)
  }

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      alert(`File size exceeds 20MB limit. Please select a smaller file.`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

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

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ]
    setMessages(newMessages)

    setLogs(prev => [...prev, "🚀 Connecting to Repository..."])
    
    setTimeout(() => {
      setLogs(prev => [...prev, "📖 Reading file contents..."])
    }, 2000)
    
    setTimeout(() => {
      setLogs(prev => [...prev, `🧠 AI is analyzing logic...`])
    }, 4000)

    try {
      const result = await generateCode(
        repoFullName, 
        userMessage,
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-neutral-950 flex items-center justify-center p-8"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl max-w-md mx-auto text-center backdrop-blur-sm"
        >
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Repository</h2>
          <p className="text-sm text-neutral-400">{error}</p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="h-screen w-full bg-neutral-950 text-white flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-16 border-b border-neutral-800/50 bg-neutral-900/30 backdrop-blur-xl flex items-center justify-between px-6 flex-shrink-0"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2"
          >
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-white">{repoFullName}</h1>
              <p className="text-xs text-neutral-500 font-medium">AI Workspace</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            className="h-9 w-9 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-center transition-colors"
            title="Toggle File Explorer"
          >
            <FileText className="h-4 w-4 text-neutral-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-9 w-9 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-center transition-colors"
            title="History"
          >
            <History className="h-4 w-4 text-neutral-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-9 w-9 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-center transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4 text-neutral-400" />
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-0 overflow-hidden relative">
        {/* File Explorer Drawer */}
        <AnimatePresence>
          {showFileExplorer && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-64 border-r border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl flex flex-col"
            >
              <div className="h-14 border-b border-neutral-800/50 flex items-center justify-between px-4 flex-shrink-0">
                <h2 className="text-sm font-semibold text-white">Files</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFileExplorer(false)}
                  className="p-1 hover:bg-neutral-800/50 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-neutral-500" />
                </motion.button>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileTree
                  nodes={files}
                  selectedFile={selectedFile}
                  onSelectFile={handleSelectFile}
                  isLoading={isLoadingFiles}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Chat Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center">
            <div className="w-full max-w-2xl flex flex-col gap-6 h-full">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="h-full flex flex-col items-center justify-center text-center py-16"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6"
                  >
                    <MessageSquare className="h-8 w-8 text-blue-400" />
                  </motion.div>
                  <h2 className="text-xl font-semibold text-white mb-2">Start Building</h2>
                  <p className="text-sm text-neutral-400 max-w-xs">
                    Describe what you want to build or modify. I'll analyze your repository and generate code changes.
                  </p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={`max-w-xl rounded-2xl px-5 py-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/30"
                            : message.role === "system"
                            ? "bg-red-900/30 text-red-200 border border-red-800/50 rounded-bl-none"
                            : "bg-neutral-800/50 text-white border border-neutral-700/50 rounded-bl-none backdrop-blur-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </motion.div>
                    </motion.div>
                  ))}

                  {/* Logs */}
                  {logs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-4 text-green-400 text-xs space-y-1 backdrop-blur-sm font-medium"
                    >
                      {logs.map((log, index) => (
                        <div key={index}>{log}</div>
                      ))}
                    </motion.div>
                  )}

                  {/* Deployment Result */}
                  {deployResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-xl p-4 border ${
                        deployResult.success
                          ? "bg-emerald-900/30 border-emerald-800/50 text-emerald-200"
                          : "bg-red-900/30 border-red-800/50 text-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {deployResult.success ? (
                          <CheckCircle className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 flex-shrink-0" />
                        )}
                        <p className="text-sm font-semibold">{deployResult.message}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Pending Changes Banner */}
                  {pendingChanges.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-200">
                            {pendingChanges.length} pending change{pendingChanges.length > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-blue-400 mt-1">Ready to review and deploy</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleOpenReviewModal}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Review
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Input Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="px-4 py-6 border-t border-neutral-800/50 bg-neutral-900/30 backdrop-blur-xl flex-shrink-0"
          >
            <div className="max-w-2xl mx-auto">
              {/* Media Preview */}
              <AnimatePresence>
                {selectedMedia && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-3 p-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg flex items-center gap-3"
                  >
                    {selectedMedia.type === "image" ? (
                      <img 
                        src={selectedMedia.data} 
                        alt="Selected" 
                        className="h-12 w-12 object-cover rounded border border-neutral-600"
                      />
                    ) : (
                      <video 
                        src={selectedMedia.data}
                        controls
                        className="h-12 w-20 object-cover rounded border border-neutral-600"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-neutral-400">
                        {selectedMedia.type === "image" ? "Image" : "Video"} attached
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={clearSelectedMedia}
                      className="p-1 rounded hover:bg-neutral-700/50 text-neutral-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Field */}
              <div className="flex gap-3 items-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-400 hover:text-neutral-200 transition-colors flex-shrink-0"
                  title="Attach image or video"
                >
                  <Paperclip className="h-5 w-5" />
                </motion.button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleMediaUpload}
                  accept="image/*,video/*"
                  className="hidden"
                />

                <div className="flex-1 flex items-center gap-2 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-3 hover:border-neutral-600/50 transition-colors backdrop-blur-sm focus-within:border-blue-500/50">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Describe what you want to build..."
                    className="flex-1 bg-transparent text-white placeholder-neutral-500 text-sm outline-none"
                    disabled={isSendingMessage}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !inputMessage.trim()}
                  className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0 shadow-lg shadow-blue-600/30"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Review Modal */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-4xl bg-neutral-900/95 border-neutral-800 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Review Changes</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Review the generated code changes before deploying
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 h-96">
            <div className="w-48 border-r border-neutral-800 overflow-y-auto">
              <div className="space-y-1 p-2">
                {pendingChanges.map((change, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedDiffFile(change.path)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedDiffFile === change.path
                        ? "bg-blue-600/50 text-white"
                        : "text-neutral-400 hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="truncate">{change.path}</div>
                    <div className="text-xs text-neutral-500">
                      {change.type === "create" && "Create"}
                      {change.type === "update" && "Update"}
                      {change.type === "delete" && "Delete"}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {selectedDiffFile && pendingChanges.find(c => c.path === selectedDiffFile) && (
                <CodeDiffViewer
                  filePath={selectedDiffFile}
                  originalContent={originalFileContent}
                  newContent={
                    pendingChanges.find(c => c.path === selectedDiffFile)?.content || ""
                  }
                  isLoading={loadingOriginalContent}
                  language={getLanguageFromFilename(selectedDiffFile)}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowReview(false)}
              className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmAndPush}
              disabled={isDeploying}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-2"
            >
              {isDeploying && <Loader2 className="h-4 w-4 animate-spin" />}
              Deploy Changes
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Editor from "@monaco-editor/react"
import {
  MessageSquare,
  Code,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  GitCommit,
  Folder,
  File,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  getFileTree, 
  getFileContent, 
  generateCodeWithGemini, 
  deployChanges 
} from "@/app/actions/workspace"
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

export function Workspace({ owner, repo }: WorkspaceProps) {
  const repoFullName = `${owner}/${repo}`
  
  const [files, setFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [loadingFile, setLoadingFile] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const [logs, setLogs] = useState<string[]>([])

  const [pendingChanges, setPendingChanges] = useState<Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null)
  const [originalFileContent, setOriginalFileContent] = useState<string>("")
  const [loadingOriginalContent, setLoadingOriginalContent] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------
  // 1. DEFINE THE FUNCTION FIRST (Wrap in useCallback)
  // ---------------------------------------------------------
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

  const loadOriginalContent = useCallback(async (path: string, isNewFile: boolean) => {
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
  }, [repoFullName])

  // ---------------------------------------------------------
  // 2. THEN CALL IT IN USEEFFECT
  // ---------------------------------------------------------
  useEffect(() => {
    loadFileTree()
  }, [loadFileTree])

  // Load file content when selected
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile)
    }
  }, [selectedFile, loadFileContent])

  // Load original content when diff file is selected
  useEffect(() => {
    if (selectedDiffFile && isReviewModalOpen) {
      const change = pendingChanges.find((c) => c.path === selectedDiffFile)
      if (change) {
        const isNewFile = change.type === "create"
        loadOriginalContent(selectedDiffFile, isNewFile)
      }
    }
  }, [selectedDiffFile, isReviewModalOpen, pendingChanges, loadOriginalContent])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSelectFile = (path: string) => {
    setSelectedFile(path)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsSendingMessage(true)
    setDeployResult(null)
    setLogs([]) // Clear previous logs

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
    
    setIsReviewModalOpen(true)
    
    if (pendingChanges.length > 0) {
      setSelectedDiffFile(pendingChanges[0].path)
    }
  }

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false)
    setSelectedDiffFile(null)
    setOriginalFileContent("")
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
        handleCloseReviewModal()
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

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-muted cursor-pointer rounded ${
            selectedFile === node.path ? "bg-muted" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.type === "file" && handleSelectFile(node.path)}
        >
          {node.type === "dir" ? (
            <Folder className="h-4 w-4 text-muted-foreground" />
          ) : (
            <File className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ))
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Error Loading Repository</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top-level flex container with proper height propagation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - File Explorer (Fixed, Static) */}
        <div className="w-64 border-r bg-card/50 flex flex-col flex-shrink-0">
          <div className="border-b p-4 flex-shrink-0">
            <h2 className="text-sm font-semibold">
              {owner}/{repo}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              renderFileTree(files)
            )}
          </div>
        </div>

        {/* Right Section - Main Content (Flexbox chain for full height) */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Tabs defaultValue="chat" className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="border-b px-4 flex-shrink-0">
              <TabsList>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" />
                  Code Preview
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden min-h-0 p-0">
              {/* Messages Container - flex-1 to take all available space */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">
                        Start Building
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                        Tell me what you want to build or modify. I&apos;ll analyze
                        the repository and generate the necessary code changes using AI with full file context.
                      </p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.role === "system"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {message.changes && message.changes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold mb-1">
                              Changes ({message.changes.length} files):
                            </p>
                            <ul className="text-xs space-y-1">
                              {message.changes.map((change, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span
                                    className={`inline-block px-1 rounded text-[10px] ${
                                      change.type === "create"
                                        ? "bg-green-500/20 text-green-600"
                                        : change.type === "delete"
                                          ? "bg-red-500/20 text-red-600"
                                          : "bg-blue-500/20 text-blue-600"
                                    }`}
                                  >
                                    {change.type === "create"
                                      ? "new"
                                      : change.type === "delete"
                                        ? "deleted"
                                        : "modified"}
                                  </span>
                                  {change.path}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSendingMessage && (
                    <div className="flex justify-start">
                      <div className="rounded-lg bg-muted px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Terminal Log Window - flex-shrink-0 to maintain fixed height */}
              {isSendingMessage && logs.length > 0 && (
                <div className="border-t bg-black text-green-400 font-mono text-sm flex-shrink-0">
                  <div className="px-4 py-2 border-b border-green-800">
                    <span className="text-green-300">🖥️ Terminal Log</span>
                  </div>
                  <div className="h-32 overflow-y-auto p-4">
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div key={index} className="text-green-400">
                          $ {log}
                        </div>
                      ))}
                      {isSendingMessage && (
                        <div className="flex items-center gap-2">
                          <span>$ </span>
                          <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Changes Banner - flex-shrink-0 */}
              {pendingChanges.length > 0 && (
                <div className="border-t bg-accent/50 p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {pendingChanges.length} file(s) ready to deploy
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Review the changes before deploying
                      </p>
                    </div>
                    <Button
                      onClick={handleOpenReviewModal}
                      disabled={isDeploying}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Review Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Deploy Result - flex-shrink-0 */}
              {deployResult && (
                <div
                  className={`border-t p-4 flex-shrink-0 ${
                    deployResult.success
                      ? "bg-green-500/10 text-green-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {deployResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <p className="text-sm">{deployResult.message}</p>
                  </div>
                </div>
              )}

              {/* Chat Input - Robust multi-line textarea with absolute button positioning */}
              <div className="border-t p-4 flex-shrink-0">
                <div className="relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Describe what you want to build or modify..."
                    disabled={isSendingMessage}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 resize-none overflow-y-auto min-h-[80px] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSendingMessage}
                    size="icon"
                    className="absolute bottom-3 right-3 h-8 w-8"
                  >
                    {isSendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Code Preview Tab - Full height with flex-1 and absolute positioning */}
            <TabsContent value="code" className="flex-1 h-full flex flex-col overflow-hidden min-h-0 p-0 relative">
              {selectedFile && !loadingFile ? (
                <>
                  <div className="border-b bg-muted px-4 py-2 flex-shrink-0">
                    <p className="text-sm font-medium">{selectedFile}</p>
                  </div>
                  <div className="flex-1 h-full relative overflow-hidden min-h-0">
                    <div className="absolute inset-0">
                      <Editor
                        height="100%"
                        width="100%"
                        language={getLanguageFromFilename(selectedFile)}
                        value={fileContent}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : loadingFile ? (
                <div className="flex-1 h-full flex items-center justify-center min-h-0">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex-1 h-full flex items-center justify-center min-h-0">
                  <div className="text-center">
                    <Code className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Select a file from the tree to preview its content
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Review Changes Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Changes</DialogTitle>
            <DialogDescription>
              Review the AI-generated changes before deploying to GitHub
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* File List Sidebar */}
            <div className="w-64 border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted px-3 py-2 border-b">
                <p className="text-sm font-semibold">
                  Changed Files ({pendingChanges.length})
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {pendingChanges.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-start gap-2 px-2 py-2 rounded cursor-pointer hover:bg-accent transition-colors ${
                        selectedDiffFile === change.path
                          ? "bg-accent"
                          : ""
                      }`}
                      onClick={() => setSelectedDiffFile(change.path)}
                    >
                      <File className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-all">{change.path}</p>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          change.type === "create"
                            ? "bg-green-500/20 text-green-600"
                            : change.type === "delete"
                              ? "bg-red-500/20 text-red-600"
                              : "bg-blue-500/20 text-blue-600"
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
              </ScrollArea>
            </div>

            {/* Diff Viewer */}
            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
              {selectedDiffFile ? (
                <>
                  <div className="bg-muted px-4 py-2 border-b">
                    <p className="text-sm font-medium">{selectedDiffFile}</p>
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
                  <div className="text-center">
                    <Code className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
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
              onClick={handleCloseReviewModal}
              disabled={isDeploying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndPush}
              disabled={isDeploying}
              className="gap-2"
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitCommit className="h-4 w-4" />
              )}
              Confirm & Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

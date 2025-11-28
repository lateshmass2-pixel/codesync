"use client"

import * as React from "react"
import Editor from "@monaco-editor/react"
import {
  MessageSquare,
  Code,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  GitCommit,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileTree } from "@/components/workspace/FileTree"
import { useGitHubRepo } from "@/lib/workspace/hooks/useGitHubRepo"
import { commitChanges } from "@/app/actions/workspace"
import type { FileChange, AIResponse } from "@/lib/workspace/types"

interface WorkspaceProps {
  owner: string
  repo: string
  branch?: string
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  changes?: FileChange[]
}

export function Workspace({ owner, repo, branch = "main" }: WorkspaceProps) {
  const { files, isLoading, error, refreshFiles, getFileContent } =
    useGitHubRepo({ owner, repo, branch })

  const [selectedFile, setSelectedFile] = React.useState<string | null>(null)
  const [fileContent, setFileContent] = React.useState<string>("")
  const [loadingFile, setLoadingFile] = React.useState(false)

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = React.useState("")
  const [isSendingMessage, setIsSendingMessage] = React.useState(false)

  const [pendingChanges, setPendingChanges] = React.useState<FileChange[]>([])
  const [isDeploying, setIsDeploying] = React.useState(false)
  const [deployResult, setDeployResult] = React.useState<{
    success: boolean
    message: string
  } | null>(null)

  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Load file content when selected
  React.useEffect(() => {
    if (selectedFile) {
      setLoadingFile(true)
      getFileContent(selectedFile)
        .then((content) => {
          setFileContent(content || "")
        })
        .finally(() => {
          setLoadingFile(false)
        })
    }
  }, [selectedFile, getFileContent])

  // Scroll to bottom of chat
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSelectFile = (path: string) => {
    setSelectedFile(path)
  }

  const buildSystemPrompt = () => {
    const fileList = files.map((f) => f.path).join("\n")
    return `You are an expert developer. Here is the file structure of the current project:

${fileList}

When the user asks you to make changes, analyze the request and respond with a JSON object (and ONLY JSON, no markdown or explanations outside the JSON) in this exact format:
{
  "explanation": "Brief explanation of what changes you're making",
  "changes": [
    {
      "filename": "path/to/file.js",
      "content": "full file content here",
      "status": "new" or "modified"
    }
  ]
}

Be precise and include the complete file content for each change.`
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsSendingMessage(true)
    setDeployResult(null)

    // Add user message to chat
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ]
    setMessages(newMessages)

    try {
      const systemPrompt = buildSystemPrompt()

      // Call the AI API endpoint
      // Replace this with your actual AI provider (OpenAI, Anthropic, etc.)
      const response = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userMessage,
          history: newMessages,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const aiResponse = await response.json()
      const parsedResponse: AIResponse = JSON.parse(aiResponse.content)

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: parsedResponse.explanation,
        changes: parsedResponse.changes,
      }

      setMessages([...newMessages, assistantMessage])

      if (assistantMessage.changes && assistantMessage.changes.length > 0) {
        setPendingChanges(assistantMessage.changes)
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: "system",
        content:
          "Error: " +
          (error instanceof Error ? error.message : "Failed to send message"),
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleDeployChanges = async () => {
    if (pendingChanges.length === 0) return

    setIsDeploying(true)
    setDeployResult(null)

    try {
      const result = await commitChanges({
        owner,
        repo,
        changes: pendingChanges,
        commitMessage: `DevStudio: Applied AI-generated changes`,
      })

      if (result.success) {
        setDeployResult({
          success: true,
          message: `Changes deployed successfully! Commit: ${result.commitSha?.substring(0, 7)}`,
        })
        setPendingChanges([])
        await refreshFiles()
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
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - File Explorer */}
      <div className="w-64 border-r bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">
            {owner}/{repo}
          </h2>
          <p className="text-xs text-muted-foreground">Branch: {branch}</p>
        </div>
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
          isLoading={isLoading}
        />
      </div>

      {/* Right Side - Tabs */}
      <div className="flex flex-1 flex-col">
        <Tabs defaultValue="chat" className="flex h-full flex-col">
          <div className="border-b px-4">
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
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">
                      Start Building
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                      Tell me what you want to build or modify. I'll analyze
                      the repository and generate the necessary code changes.
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
                                    change.status === "new"
                                      ? "bg-green-500/20 text-green-600"
                                      : "bg-blue-500/20 text-blue-600"
                                  }`}
                                >
                                  {change.status}
                                </span>
                                {change.filename}
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
            </ScrollArea>

            {/* Pending Changes Banner */}
            {pendingChanges.length > 0 && (
              <div className="border-t bg-accent/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {pendingChanges.length} file(s) ready to deploy
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Review the changes and click deploy to commit
                    </p>
                  </div>
                  <Button
                    onClick={handleDeployChanges}
                    disabled={isDeploying}
                    className="gap-2"
                  >
                    {isDeploying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitCommit className="h-4 w-4" />
                    )}
                    Deploy Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Deploy Result */}
            {deployResult && (
              <div
                className={`border-t p-4 ${
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

            {/* Chat Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
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
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSendingMessage}
                  size="icon"
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

          {/* Code Preview Tab */}
          <TabsContent value="code" className="flex-1 m-0 p-0">
            {selectedFile && !loadingFile ? (
              <div className="h-full flex flex-col">
                <div className="border-b bg-muted px-4 py-2">
                  <p className="text-sm font-medium">{selectedFile}</p>
                </div>
                <div className="flex-1">
                  <Editor
                    height="100%"
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
            ) : loadingFile ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
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
  )
}

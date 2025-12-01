"use client"

import React, { useState, useCallback, useEffect } from "react"
import Editor from "@monaco-editor/react"
import {
  Code,
  Loader2,
  Folder,
  File,
  Eye,
  AlertCircle,
  GitCommit,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getFileContent } from "@/app/actions/workspace"
import { CodeDiffViewer } from "./CodeDiffViewer"

interface FileNode {
  name: string
  path: string
  type: "file" | "dir"
  size?: number
  children?: FileNode[]
}

interface CodeViewProps {
  files: FileNode[]
  selectedFile: string | null
  fileContent: string
  loadingFile: boolean
  pendingChanges: Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>
  onSelectFile: (path: string) => void
  onOpenReviewModal: () => void
  onConfirmAndPush: () => Promise<void>
  isDeploying: boolean
  repoFullName: string
  isLoading: boolean
}

export function CodeView({
  files,
  selectedFile,
  fileContent,
  loadingFile,
  pendingChanges,
  onSelectFile,
  onOpenReviewModal,
  onConfirmAndPush,
  isDeploying,
  repoFullName,
  isLoading,
}: CodeViewProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null)
  const [originalFileContent, setOriginalFileContent] = useState<string>("")
  const [loadingOriginalContent, setLoadingOriginalContent] = useState(false)

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
    if (selectedDiffFile && isReviewModalOpen) {
      const change = pendingChanges.find((c) => c.path === selectedDiffFile)
      if (change) {
        const isNewFile = change.type === "create"
        loadOriginalContent(selectedDiffFile, isNewFile)
      }
    }
  }, [selectedDiffFile, isReviewModalOpen, pendingChanges, loadOriginalContent])

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
    await onConfirmAndPush()
    handleCloseReviewModal()
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
          className={`flex items-center gap-2 px-2 py-1 hover:bg-white/40 cursor-pointer rounded transition-colors ${
            selectedFile === node.path ? "bg-white/50 border-l-2 border-blue-500" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.type === "file" && onSelectFile(node.path)}
        >
          {node.type === "dir" ? (
            <Folder className="h-4 w-4 text-blue-600" />
          ) : (
            <File className="h-4 w-4 text-slate-600" />
          )}
          <span className="text-sm text-slate-700">{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ))
  }

  return (
    <>
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - File Explorer (Fixed, Static) */}
        <div className="w-64 border-r border-white/50 bg-white/30 backdrop-blur-xl flex flex-col flex-shrink-0">
          <div className="border-b border-white/50 p-4 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-800">Files</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            ) : (
              renderFileTree(files)
            )}
          </div>
        </div>

        {/* Main Content Area - Code Editor */}
        <div className="flex-1 flex flex-col h-full bg-white/40 backdrop-blur-md overflow-hidden min-h-0">
          {/* File Tab Bar (VS Code style) */}
          <div className="flex-shrink-0 border-b border-white/50 bg-white/20 backdrop-blur-md h-12 flex items-center px-4">
            {selectedFile ? (
              <div className="flex items-center gap-2 h-full bg-white/50 border-b-2 border-blue-500 px-3 py-1.5 rounded-t shadow-md">
                <Code className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-slate-800 font-mono font-medium truncate max-w-xs">
                  {selectedFile}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 ml-2 hover:bg-white/30"
                  onClick={() => {
                    const copyText = selectedFile
                    navigator.clipboard.writeText(copyText)
                  }}
                  title="Copy filename"
                >
                  <span className="text-xs">📋</span>
                </Button>
              </div>
            ) : (
              <span className="text-xs text-slate-600">No file selected</span>
            )}
          </div>

          {/* Code Editor Container */}
          {selectedFile && !loadingFile ? (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#1e1e1e]">
              <div className="flex-1 overflow-hidden min-h-0">
                <Editor
                  height="100%"
                  width="100%"
                  language={getLanguageFromFilename(selectedFile)}
                  value={fileContent}
                  theme="vs-light"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
                  }}
                />
              </div>
            </div>
          ) : loadingFile ? (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="text-center bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-lg">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3 mx-auto" />
                <p className="text-sm text-slate-700">Loading file...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="text-center bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-lg">
                <Code className="mx-auto h-12 w-12 text-blue-600 mb-3" />
                <p className="text-sm text-slate-700">
                  Select a file to preview
                </p>
              </div>
            </div>
          )}

          {/* Pending Changes Banner at bottom */}
          {pendingChanges.length > 0 && (
            <div className="flex-shrink-0 border border-amber-300/50 bg-amber-100/40 backdrop-blur-md p-3 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-900">
                    {pendingChanges.length} file(s) ready
                  </p>
                  <p className="text-xs text-amber-700">
                    Review before deploying
                  </p>
                </div>
                <Button
                  onClick={handleOpenReviewModal}
                  disabled={isDeploying}
                  size="sm"
                  className="gap-1 flex-shrink-0 bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-lg transition-all hover:scale-105"
                >
                  <Eye className="h-3 w-3" />
                  Review
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Changes Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col space-y-8 bg-gradient-to-br from-rose-50 via-sky-50 to-indigo-50 border-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">Review Changes</DialogTitle>
            <DialogDescription className="text-base text-slate-600">
              Review the AI-generated changes before deploying to GitHub
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex gap-8 overflow-hidden">
            {/* File List Sidebar */}
            <div className="w-64 border border-white/50 bg-white/40 backdrop-blur-lg rounded-lg overflow-hidden flex flex-col shadow-md">
              <div className="bg-white/30 backdrop-blur-sm px-4 py-3 border-b border-white/50">
                <p className="text-sm font-semibold text-slate-800">
                  Changed Files ({pendingChanges.length})
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {pendingChanges.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-start gap-2 px-3 py-2.5 rounded cursor-pointer hover:bg-white/50 transition-colors ${
                        selectedDiffFile === change.path
                          ? "bg-white/60 border-l-2 border-blue-500"
                          : ""
                      }`}
                      onClick={() => setSelectedDiffFile(change.path)}
                    >
                      <File className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-all text-slate-700">{change.path}</p>
                        <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          change.type === "create"
                            ? "bg-green-200 text-green-800"
                            : change.type === "delete"
                              ? "bg-red-200 text-red-800"
                              : "bg-blue-200 text-blue-800"
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
            <div className="flex-1 border border-white/50 bg-white/40 backdrop-blur-lg rounded-lg overflow-hidden flex flex-col shadow-md">
              {selectedDiffFile ? (
                <>
                  <div className="bg-white/30 backdrop-blur-sm px-4 py-3 border-b border-white/50">
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
                  <div className="text-center bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-lg">
                    <Code className="mx-auto h-12 w-12 text-blue-600 mb-3" />
                    <p className="mt-4 text-sm text-slate-700">
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
              className="border-slate-300 hover:bg-white/50 text-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndPush}
              disabled={isDeploying}
              className="gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-lg transition-all hover:scale-105"
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
    </>
  )
}

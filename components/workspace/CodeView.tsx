"use client"

import React, { useState, useCallback, useEffect } from "react"
import Editor from "@monaco-editor/react"
import {
  Code,
  Loader2,
  Eye,
  GitCommit,
  File as FileIcon,
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
import { FileTree } from "./FileTree"

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

  return (
    <>
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - File Explorer (Fixed, Static) */}
        <div className="w-64 border-r border-white/10 bg-white/5 backdrop-blur-md flex flex-col flex-shrink-0">
          <div className="border-b border-white/10 p-4 flex-shrink-0">
            <h2 className="text-sm font-semibold text-white">Files</h2>
          </div>
          <FileTree
            nodes={files}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Area - Code Editor */}
        <div className="flex-1 flex flex-col h-full bg-black/40 backdrop-blur-xl overflow-hidden min-h-0">
          {/* File Tab Bar (VS Code style) */}
          <div className="flex-shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-md h-10 flex items-center px-2">
            {selectedFile ? (
              <div className="flex items-center gap-2 h-full bg-black/40 border-b-2 border-purple-500 px-3 py-1.5 rounded-t shadow-[0_2px_10px_rgba(168,85,247,0.3)]">
                <Code className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-gray-200 font-mono font-medium truncate max-w-xs">
                  {selectedFile}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 ml-2 hover:bg-white/10"
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
              <span className="text-xs text-gray-500">No file selected</span>
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
                  theme="vs-dark"
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
            <div className="flex-1 flex items-center justify-center min-h-0 bg-[#1e1e1e]">
              <div className="text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400 mb-3 mx-auto drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]" />
                <p className="text-sm text-gray-400">Loading file...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-0 bg-[#1e1e1e]">
              <div className="text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                <Code className="mx-auto h-12 w-12 text-purple-400 mb-3 drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]" />
                <p className="text-sm text-gray-400">
                  Select a file to preview
                </p>
              </div>
            </div>
          )}

          {/* Pending Changes Banner at bottom */}
          {pendingChanges.length > 0 && (
            <div className="flex-shrink-0 border border-amber-500/30 bg-amber-950/20 backdrop-blur-md p-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]">
                    {pendingChanges.length} file(s) ready
                  </p>
                  <p className="text-xs text-amber-400/70">
                    Review before deploying
                  </p>
                </div>
                <Button
                  onClick={handleOpenReviewModal}
                  disabled={isDeploying}
                  size="sm"
                  className="gap-1 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
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
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col space-y-8 bg-gradient-to-br from-gray-900 via-black to-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Review Changes</DialogTitle>
            <DialogDescription className="text-base text-gray-400">
              Review the AI-generated changes before deploying to GitHub
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex gap-8 overflow-hidden">
            {/* File List Sidebar */}
            <div className="w-64 border border-white/10 bg-white/5 backdrop-blur-md rounded-lg overflow-hidden flex flex-col">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white">
                  Changed Files ({pendingChanges.length})
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {pendingChanges.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-start gap-2 px-3 py-2.5 rounded cursor-pointer hover:bg-white/10 transition-colors ${
                        selectedDiffFile === change.path
                          ? "bg-white/10 border-l-2 border-purple-500"
                          : ""
                      }`}
                      onClick={() => setSelectedDiffFile(change.path)}
                    >
                      <FileIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-all text-gray-200">{change.path}</p>
                        <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          change.type === "create"
                            ? "bg-green-500/30 text-green-300"
                            : change.type === "delete"
                              ? "bg-red-500/30 text-red-300"
                              : "bg-blue-500/30 text-blue-300"
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
            <div className="flex-1 border border-white/10 bg-white/5 backdrop-blur-md rounded-lg overflow-hidden flex flex-col">
              {selectedDiffFile ? (
                <>
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white">{selectedDiffFile}</p>
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
                  <div className="text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                    <Code className="mx-auto h-12 w-12 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]" />
                    <p className="mt-4 text-sm text-gray-400">
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
              className="border-white/20 hover:bg-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndPush}
              disabled={isDeploying}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
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

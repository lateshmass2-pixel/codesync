"use client"

import { DiffEditor } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"

interface CodeDiffViewerProps {
  originalContent: string
  modifiedContent: string
  language: string
  isLoading?: boolean
}

export function CodeDiffViewer({
  originalContent,
  modifiedContent,
  language,
  isLoading = false,
}: CodeDiffViewerProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <DiffEditor
      height="100%"
      language={language}
      original={originalContent}
      modified={modifiedContent}
      theme="vs-light"
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "off",
        automaticLayout: true,
      }}
    />
  )
}

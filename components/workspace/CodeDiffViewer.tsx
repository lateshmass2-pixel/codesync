"use client"

import { DiffEditor } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"

interface CodeDiffViewerProps {
  filePath?: string
  originalContent: string
  newContent: string
  language: string
  isLoading?: boolean
}

export function CodeDiffViewer({
  originalContent,
  newContent,
  language,
  isLoading = false,
}: CodeDiffViewerProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    )
  }

  return (
    <DiffEditor
      height="100%"
      language={language}
      original={originalContent}
      modified={newContent}
      theme="vs-dark"
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "off",
        automaticLayout: true,
      }}
    />
  )
}

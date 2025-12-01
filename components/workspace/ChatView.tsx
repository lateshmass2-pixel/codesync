"use client"

import React, { useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  changes?: Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>
}

interface ChatViewProps {
  messages: ChatMessage[]
  inputMessage: string
  isSendingMessage: boolean
  logs: string[]
  pendingChanges: Array<{ path: string; content?: string; type?: "create" | "update" | "delete" }>
  deployResult: { success: boolean; message: string } | null
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onOpenReviewModal: () => void
  repoFullName: string
}

export function ChatView({
  messages,
  inputMessage,
  isSendingMessage,
  logs,
  pendingChanges,
  deployResult,
  onInputChange,
  onSendMessage,
  onOpenReviewModal,
  repoFullName,
}: ChatViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-redirect to code view when code is generated
  useEffect(() => {
    if (pendingChanges.length > 0 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant" && lastMessage.changes && lastMessage.changes.length > 0) {
        // Show a subtle notification that code is ready
        // We'll show this in the pending changes banner
      }
    }
  }, [pendingChanges, messages])

  const handleAutoRedirectToCode = () => {
    const params = new URLSearchParams(searchParams)
    params.set("view", "code")
    router.push(`/workspace?${params.toString()}`)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900 overflow-hidden min-h-0">
      {/* Chat Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-zinc-800 px-6 py-4">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          AI Assistant
        </h3>
      </div>

      {/* Main Chat Area - Centered with max-width */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden min-h-0 px-4 py-6">
        <div className="w-full max-w-4xl flex flex-col h-full">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 flex flex-col min-h-0">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-zinc-500" />
                  <h3 className="mt-4 text-base font-semibold text-zinc-200">
                    Start Building
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    Describe what you want to build or modify. I&apos;ll analyze the repository and generate code changes.
                  </p>
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : message.role === "system"
                            ? "bg-red-900/30 text-red-300 border border-red-800/50"
                            : "bg-zinc-700 text-zinc-100"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                      {message.changes && message.changes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-xs font-semibold mb-2 opacity-90">
                            Changes ({message.changes.length} files):
                          </p>
                          <ul className="text-xs space-y-1">
                            {message.changes.map((change, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    change.type === "create"
                                      ? "bg-green-500/30 text-green-300"
                                      : change.type === "delete"
                                        ? "bg-red-500/30 text-red-300"
                                        : "bg-blue-500/30 text-blue-300"
                                  }`}
                                >
                                  {change.type === "create"
                                    ? "new"
                                    : change.type === "delete"
                                      ? "deleted"
                                      : "modified"}
                                </span>
                                <span className="text-zinc-300">{change.path}</span>
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
                    <div className="bg-zinc-700 text-zinc-100 rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Terminal Log Window - flex-shrink-0 to maintain fixed height */}
          {isSendingMessage && logs.length > 0 && (
            <div className="flex-shrink-0 border-t border-white/10 bg-black text-green-400 font-mono text-xs overflow-hidden rounded-t-lg">
              <div className="px-4 py-2 border-b border-green-800 bg-black/50">
                <span className="text-green-300 text-xs">🖥️ Terminal</span>
              </div>
              <div className="h-28 overflow-y-auto p-3 space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-green-400">
                    $ {log}
                  </div>
                ))}
                {isSendingMessage && (
                  <div className="flex items-center gap-1">
                    <span>$ </span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Changes Banner - flex-shrink-0 */}
          {pendingChanges.length > 0 && (
            <div className="flex-shrink-0 border-t border-white/10 bg-amber-950/30 border-amber-800/30 p-3 rounded-b-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-200">
                    {pendingChanges.length} file(s) ready to review
                  </p>
                  <p className="text-xs text-amber-300/70">
                    Code generated! Ready to deploy.
                  </p>
                </div>
                <Button
                  onClick={handleAutoRedirectToCode}
                  disabled={false}
                  size="sm"
                  className="gap-1 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="h-3 w-3" />
                  View Code
                </Button>
              </div>
            </div>
          )}

          {/* Deploy Result */}
          {deployResult && (
            <div
              className={`flex-shrink-0 border-t p-3 rounded-b-lg ${
                deployResult.success
                  ? "bg-green-900/20 border-green-800/30"
                  : "bg-red-900/20 border-red-800/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {deployResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                <p className={`text-xs ${deployResult.success ? "text-green-300" : "text-red-300"}`}>
                  {deployResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Chat Input - Distinct floating look pinned to bottom */}
          <div className="flex-shrink-0 border-t border-white/10 bg-zinc-800/50 p-3">
            <div className="relative">
              <textarea
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    onSendMessage()
                  }
                }}
                placeholder="Describe what you want to build or modify..."
                disabled={isSendingMessage}
                className="w-full bg-zinc-700/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 resize-none overflow-y-auto min-h-[60px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
              />
              <Button
                onClick={onSendMessage}
                disabled={!inputMessage.trim() || isSendingMessage}
                size="sm"
                className="absolute bottom-2 right-2 h-7 w-7"
              >
                {isSendingMessage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

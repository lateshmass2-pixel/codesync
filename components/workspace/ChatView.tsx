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
    <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-black/40 backdrop-blur-xl">
      {/* Chat Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-md px-6 py-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
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
                <div className="text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                  <MessageSquare className="mx-auto h-12 w-12 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]" />
                  <h3 className="mt-4 text-base font-semibold text-white">
                    Start Building
                  </h3>
                  <p className="mt-2 text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
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
                      className={`max-w-[85%] rounded-lg px-4 py-3 backdrop-blur-md border ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white border-purple-400/30 shadow-lg shadow-purple-500/30"
                          : message.role === "system"
                            ? "bg-red-900/30 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/20"
                            : "bg-white/10 text-white border-white/20 shadow-lg"
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
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-white rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Terminal Log Window - flex-shrink-0 to maintain fixed height */}
          {isSendingMessage && logs.length > 0 && (
            <div className="flex-shrink-0 border border-green-500/30 bg-black text-green-400 font-mono text-xs overflow-hidden rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <div className="px-4 py-2 border-b border-green-500/30 bg-black/80 backdrop-blur-sm">
                <span className="text-green-400 text-xs drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">🖥️ Terminal</span>
              </div>
              <div className="h-28 overflow-y-auto p-3 space-y-1 bg-black" style={{ textShadow: '0 0 5px rgba(34, 197, 94, 0.5)' }}>
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
            <div className="flex-shrink-0 border border-amber-500/30 bg-amber-950/20 backdrop-blur-md p-3 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]">
                    {pendingChanges.length} file(s) ready to review
                  </p>
                  <p className="text-xs text-amber-400/70">
                    Code generated! Ready to deploy.
                  </p>
                </div>
                <Button
                  onClick={handleAutoRedirectToCode}
                  disabled={false}
                  size="sm"
                  className="gap-1 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
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
              className={`flex-shrink-0 border p-3 rounded-lg backdrop-blur-md ${
                deployResult.success
                  ? "bg-green-900/20 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                  : "bg-red-900/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              }`}
            >
              <div className="flex items-center gap-2">
                {deployResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                )}
                <p className={`text-xs ${deployResult.success ? "text-green-300" : "text-red-300"}`}>
                  {deployResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Chat Input - Distinct floating look pinned to bottom */}
          <div className="flex-shrink-0 border-t border-white/10 bg-white/5 backdrop-blur-md p-3">
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
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none overflow-y-auto min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 focus-visible:shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50 transition-all duration-300"
              />
              <Button
                onClick={onSendMessage}
                disabled={!inputMessage.trim() || isSendingMessage}
                size="sm"
                className="absolute bottom-2 right-2 h-7 w-7 bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
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

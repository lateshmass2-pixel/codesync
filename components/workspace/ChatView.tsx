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
    <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-white/30 backdrop-blur-md">
      {/* Chat Header */}
      <div className="flex-shrink-0 border-b border-white/40 bg-white/20 backdrop-blur-md px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
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
                <div className="text-center bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-lg">
                  <MessageSquare className="mx-auto h-12 w-12 text-blue-600" />
                  <h3 className="mt-4 text-base font-semibold text-slate-800">
                    Start Building
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
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
                       className={`max-w-[80%] rounded-2xl px-4 py-2 backdrop-blur-md border shadow-md ${
                         message.role === "user"
                           ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-300/40 rounded-br-none"
                           : message.role === "system"
                             ? "bg-red-100 text-red-900 border border-red-300 rounded-bl-none"
                             : "bg-white/70 text-slate-800 border border-white/60 rounded-bl-none"
                       }`}
                     >
                       <p className="text-sm whitespace-pre-wrap leading-relaxed">
                         {message.content}
                       </p>
                       {message.changes && message.changes.length > 0 && (
                         <div className="mt-3 pt-3 border-t border-white/30">
                           <p className="text-xs font-semibold mb-2 opacity-90">
                             Changes ({message.changes.length} files):
                           </p>
                           <ul className="text-xs space-y-1">
                             {message.changes.map((change, idx) => (
                               <li key={idx} className="flex items-center gap-2">
                                 <span
                                   className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                     change.type === "create"
                                       ? "bg-green-200 text-green-800"
                                       : change.type === "delete"
                                         ? "bg-red-200 text-red-800"
                                         : "bg-blue-200 text-blue-800"
                                   }`}
                                 >
                                   {change.type === "create"
                                     ? "new"
                                     : change.type === "delete"
                                       ? "deleted"
                                       : "modified"}
                                 </span>
                                 <span className={message.role === "user" ? "text-blue-100" : "text-slate-700"}>{change.path}</span>
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
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-md text-slate-800 rounded-2xl rounded-bl-none px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Terminal Log Window - flex-shrink-0 to maintain fixed height */}
          {isSendingMessage && logs.length > 0 && (
            <div className="flex-shrink-0 border border-slate-300/50 bg-slate-50 text-slate-700 font-mono text-xs overflow-hidden rounded-lg shadow-md">
              <div className="px-4 py-2 border-b border-slate-300/40 bg-slate-100/80 backdrop-blur-sm">
                <span className="text-slate-700 text-xs font-semibold">🖥️ Terminal</span>
              </div>
              <div className="h-28 overflow-y-auto p-3 space-y-1 bg-slate-50">
                {logs.map((log, index) => (
                  <div key={index} className="text-slate-700">
                    $ {log}
                  </div>
                ))}
                {isSendingMessage && (
                  <div className="flex items-center gap-1 text-slate-700">
                    <span>$ </span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Changes Banner - flex-shrink-0 */}
          {pendingChanges.length > 0 && (
            <div className="flex-shrink-0 border border-amber-300/50 bg-amber-100/40 backdrop-blur-md p-3 rounded-lg shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-900">
                    {pendingChanges.length} file(s) ready to review
                  </p>
                  <p className="text-xs text-amber-700">
                    Code generated! Ready to deploy.
                  </p>
                </div>
                <Button
                  onClick={handleAutoRedirectToCode}
                  disabled={false}
                  size="sm"
                  className="gap-1 flex-shrink-0 bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-lg transition-all hover:scale-105"
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
              className={`flex-shrink-0 border p-3 rounded-lg backdrop-blur-md shadow-md ${
                deployResult.success
                  ? "bg-green-100/40 border-green-300/50"
                  : "bg-red-100/40 border-red-300/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {deployResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-700 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-700 flex-shrink-0" />
                )}
                <p className={`text-xs ${deployResult.success ? "text-green-800" : "text-red-800"}`}>
                  {deployResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Chat Input - Floating glass bar at the bottom */}
          <div className="flex-shrink-0 border-t border-white/40 bg-white/20 backdrop-blur-md p-4">
            <div className="m-0 p-1 bg-white/60 backdrop-blur-lg border border-white/50 rounded-2xl shadow-lg relative">
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
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 placeholder-slate-500 resize-none overflow-y-auto min-h-[60px] focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 transition-all duration-300"
              />
              <Button
                onClick={onSendMessage}
                disabled={!inputMessage.trim() || isSendingMessage}
                size="sm"
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-lg transition-all hover:scale-105"
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

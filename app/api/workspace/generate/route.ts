import { NextResponse } from "next/server"

import type { FileChange } from "@/lib/workspace/types"

interface RequestPayload {
  systemPrompt?: string
  userMessage?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPayload
    const { systemPrompt, userMessage } = body

    if (!systemPrompt || !userMessage) {
      return NextResponse.json(
        { error: "Both systemPrompt and userMessage are required." },
        { status: 400 }
      )
    }

    // Placeholder implementation.
    // Replace this with your AI provider integration (OpenAI, Anthropic, etc.)
    const normalizedMessage = userMessage.trim()
    const explanation = `Mock response for: ${normalizedMessage}`

    const mockChange: FileChange = {
      filename: "NOTES.md",
      content: `# Notes\n\n${normalizedMessage}\n\nGenerated via mock AI response.\n`,
      status: "modified",
    }

    return NextResponse.json({
      content: JSON.stringify({
        explanation,
        changes: [mockChange],
      }),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Invalid request body. Expected JSON with systemPrompt and userMessage.",
      },
      { status: 400 }
    )
  }
}

import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface FileChange {
  path: string
  content?: string
  type?: "create" | "update" | "delete"
}

interface GeminiResponse {
  explanation: string
  changes: FileChange[]
}

interface GroqResponse {
  thought_process: string
  changes: FileChange[]
}

export async function generateCode(userPrompt: string, fileContext: string): Promise<GeminiResponse> {
  try {
    const systemPrompt = `
  You are an expert Senior Software Engineer specializing in Next.js, React, and TypeScript.
  
  YOUR GOAL:
  You must analyze the user request and the provided file context to generate precise code changes.
  
  CRITICAL RULES:
  1.  **Thinking Phase:** Before writing code, you must internally analyze the dependency chain. If you change a component, check if it breaks the parent page.
  2.  **No Placeholders:** Never use comments like "// ... rest of code". Write the FULL file content every time.
  3.  **Strict JSON:** You must return a valid JSON object.
  
  FILE CONTEXT:
  ${fileContext}

  RETURN FORMAT (JSON):
  {
    "thought_process": "Briefly explain your reasoning here (e.g., 'I need to update imports in App.tsx because I moved the component...')",
    "changes": [
      {
        "path": "src/components/Example.tsx",
        "content": "export default function Example() { ... }",
        "type": "create" | "update" | "delete"
      }
    ]
  }
`.trim()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.1,
      top_p:0.1,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error("No content in response")
    }

    try {
      const parsed = JSON.parse(content) as GroqResponse

      if (!parsed.thought_process) {
        throw new Error("Missing thought_process in Groq response")
      }

      if (!Array.isArray(parsed.changes)) {
        throw new Error("Missing changes array in Groq response")
      }

      return {
        explanation: parsed.thought_process,
        changes: parsed.changes,
      }
    } catch (parseError) {
      console.error("Failed to parse Groq response as JSON:", content)
      throw new Error("Invalid response format from Groq")
    }
  } catch (error) {
    console.error("Groq API error:", error)
    throw new Error("Failed to generate code with Groq")
  }
}

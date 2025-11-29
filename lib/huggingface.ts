import { HfInference } from "@huggingface/inference"

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

interface FileChange {
  path: string
  content?: string
  type?: "create" | "update" | "delete"
}

interface HuggingFaceResponse {
  explanation: string
  changes: FileChange[]
}

export async function generateCode(userPrompt: string, fileContext: string): Promise<HuggingFaceResponse> {
  try {
    const systemPrompt = `
You are an expert Senior Software Engineer specializing in Next.js, React, and TypeScript.

YOUR GOAL:
You must analyze the user request and the provided file context to generate precise code changes.

CRITICAL RULES:
1. **Thinking Phase:** Before writing code, you must internally analyze the dependency chain. If you change a component, check if it breaks the parent page.
2. **No Placeholders:** Never use comments like "// ... rest of code". Write the FULL file content every time.
3. **Strict JSON:** You must return a valid JSON object.

FILE CONTEXT:
${fileContext}

RETURN FORMAT (JSON):
{
  "explanation": "Briefly explain your reasoning here (e.g., 'I need to update imports in App.tsx because I moved the component...')",
  "changes": [
    {
      "path": "src/components/Example.tsx",
      "content": "export default function Example() { ... }",
      "type": "create" | "update" | "delete"
    }
  ]
}
`.trim()

    const completion = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
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
      temperature: 0.2,
      max_tokens: 8192,
      top_p: 0.95,
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error("No content in response")
    }

    // Clean the output by stripping markdown JSON blocks and trimming whitespace
    let cleanedContent = content.trim()
    
    // Remove ```json and ``` tags if present
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.substring(7).trim()
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3).trim()
    }

    try {
      const parsed = JSON.parse(cleanedContent) as HuggingFaceResponse

      if (!parsed.explanation) {
        throw new Error("Missing explanation in Hugging Face response")
      }

      if (!Array.isArray(parsed.changes)) {
        throw new Error("Missing changes array in Hugging Face response")
      }

      return {
        explanation: parsed.explanation,
        changes: parsed.changes,
      }
    } catch (parseError) {
      console.error("Failed to parse Hugging Face response as JSON:", cleanedContent)
      console.error("Original content:", content)
      throw new Error("Invalid response format from Hugging Face")
    }
  } catch (error) {
    console.error("Hugging Face API error:", error)
    throw new Error("Failed to generate code with Hugging Face")
  }
}
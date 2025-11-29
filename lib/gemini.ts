import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface FileChange {
  path: string
  content: string
  type?: "create" | "update"
}

interface GeminiResponse {
  explanation: string
  changes: FileChange[]
}

export async function generateCode(userPrompt: string, fileContext: string): Promise<GeminiResponse> {
  try {
    const systemMessage = `You are an expert coding agent. You will be given a file structure and a user request. Return a JSON object with an explanation string and a changes array containing { path, content, type } where type is either "create" or "update".

File Structure:
${fileContext}

Always return valid JSON matching this schema:
{
  "explanation": "string describing the changes",
  "changes": [
    {
      "path": "file path",
      "content": "file content",
      "type": "create|update"
    }
  ]
}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4096,
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error("No content in response")
    }

    try {
      const parsed = JSON.parse(content) as GeminiResponse
      return parsed
    } catch (parseError) {
      console.error("Failed to parse Groq response as JSON:", content)
      throw new Error("Invalid response format from Groq")
    }
  } catch (error) {
    console.error("Groq API error:", error)
    throw new Error("Failed to generate code with Groq")
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface FileChange {
  path: string
  content: string
}

interface GeminiResponse {
  explanation: string
  changes: FileChange[]
}

export async function generateCode(prompt: string, fileContext: string): Promise<GeminiResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: "You are an expert coding agent. You will be given a file structure and a user request. Return a JSON object with an explanation string and a changes array containing { path, content }.",
    })

    const fullPrompt = `File Structure:\n${fileContext}\n\nUser Request:\n${prompt}`

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    try {
      const parsed = JSON.parse(text) as GeminiResponse
      return parsed
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text)
      throw new Error("Invalid response format from Gemini")
    }
  } catch (error) {
    console.error("Gemini API error:", error)
    throw new Error("Failed to generate code with Gemini")
  }
}
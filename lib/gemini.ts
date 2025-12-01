import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

export async function generateCode(userPrompt: string, fileContext: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // FIX: Use "gemini-1.5-flash-latest" which is often more stable for the API
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro", 
      generationConfig: { responseMimeType: "application/json" } 
    });

    console.log("🤖 Asking Gemini 2.5 Pro...");
    const systemPrompt = `
      You are an expert Senior Developer.
      
      FILE CONTEXT:
      ${fileContext}

      INSTRUCTION:
      ${userPrompt}

      OUTPUT RULES:
      1. Return a JSON object ONLY.
      2. Format:
      {
        "explanation": "Brief summary",
        "changes": [
          {
            "path": "path/to/file.ext",
            "content": "Full code content",
            "type": "create" | "update" | "delete"
          }
        ]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    let content = result.response.text();

    console.log("📝 Gemini Output:", content.substring(0, 100) + "...");

    // Clean Markdown
    content = content.replace(/```json/g, "").replace(/```/g, "");

    try {
      const fixedJson = jsonrepair(content);
      return JSON.parse(fixedJson);
    } catch (error) {
      console.error("JSON Repair Failed:", content);
      throw new Error("Gemini returned invalid JSON");
    }

  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback: If Flash fails (404), try the older stable model "gemini-pro"
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
       console.log("⚠️ Flash model not found. Retrying with 'gemini-pro'...");
       // Note: recursive retry logic would go here, but for now just throw readable error
       throw new Error("Gemini Flash 1.5 not found. Please run 'npm install @google/generative-ai@latest'");
    }
    throw error;
  }
}
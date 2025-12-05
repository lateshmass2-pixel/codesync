import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

// ✅ Ensure "export async function generateCode" is here exactly like this
export async function generateCode(userPrompt: string, fileContext: string, imageData?: string) {
  const modelName = "gemini-2.5-pro"; 

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    console.log(`🤖 Asking ${modelName}...`);
    
    const contentParts: any[] = [];
    
    const textPrompt = `
      You are an expert Senior Developer.
      ${imageData ? 'IMAGE CONTEXT: Analyze the attached image deeply.' : ''}
      FILE CONTEXT: ${fileContext}
      INSTRUCTION: ${userPrompt}
      OUTPUT RULES: Return JSON object ONLY. 
      Format: { "explanation": "string", "changes": [{ "path": "string", "content": "string", "type": "create" | "update" | "delete" }] }
    `;
    
    contentParts.push(textPrompt);
    
    if (imageData) {
      contentParts.push({
        inlineData: {
          data: imageData.split(',')[1], 
          mimeType: "image/png" 
        }
      });
    }

    const result = await model.generateContent(contentParts);
    let content = result.response.text();

    console.log("📝 Gemini Output:", content.substring(0, 100) + "...");

    content = content.replace(/```json/g, "").replace(/```/g, "");

    try {
      const fixedJson = jsonrepair(content);
      return JSON.parse(fixedJson);
    } catch (error) {
      console.error("JSON Repair Failed:", content);
      throw new Error("Gemini returned invalid JSON");
    }

  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("404") || error.message?.includes("not found")) {
        throw new Error(`Model '${modelName}' not found. Check API key access.`);
    }
    throw error;
  }
}
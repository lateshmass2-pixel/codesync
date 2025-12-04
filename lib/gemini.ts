import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

export async function generateCode(userPrompt: string, fileContext: string, imageData?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ CORRECT MODEL NAME: "gemini-2.0-flash-exp"
    // "gemini-2.5" does not exist. "gemini-1.5-flash" is the stable alternative.
    const modelName = "gemini-2.0-flash";
    
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    console.log(`🤖 Asking ${modelName} (Vision Enabled)...`);
    
    const contentParts: any[] = [];
    
    const textPrompt = `
      You are an expert Senior Developer.
      
      ${imageData ? 'IMAGE CONTEXT: Analyze the attached image deeply. Use it as the UI/UX reference.' : ''}
      
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
    
    contentParts.push(textPrompt);
    
    // Add image if provided
    if (imageData) {
      contentParts.push({
        inlineData: {
          data: imageData.split(',')[1], 
          mimeType: "image/png" // Assuming png, or parse from string
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
    
    // Fallback Advice
    if (error.message?.includes("404") || error.message?.includes("not found")) {
        throw new Error(`Model '${modelName}' not found. Your API key might not have access to Experimental models. Try changing the model string to 'gemini-1.5-flash-latest'`);
    }
    throw error;
  }
}
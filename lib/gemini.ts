import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

export async function generateCode(userPrompt: string, fileContext: string, imageData?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ USE GEMINI 2.0 FLASH (Experimental)
    // This model is Multimodal: It handles text AND images natively.
    // If "gemini-2.0-flash-exp" fails in your region, fallback to "gemini-1.5-flash"
    const modelName = "gemini-2.0-flash";
    
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    console.log(`🤖 Asking ${modelName}${imageData ? ' with Vision' : ''}...`);
    
    // Prepare the content parts
    const contentParts: any[] = [];
    
    // Add text prompt with context
    const textPrompt = `
      You are an expert Senior Developer with vision capabilities.
      
      ${imageData ? 'IMAGE CONTEXT: Analyze the attached image deeply. Use it as the reference for UI/UX.' : ''}
      
      FILE CONTEXT:
      ${fileContext}

      INSTRUCTION:
      ${userPrompt}

      OUTPUT RULES:
      1. Return a JSON object ONLY.
      2. Format:
      {
        "explanation": "Brief summary of changes",
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
          data: imageData.split(',')[1], // Remove the data:image/png;base64, prefix
          mimeType: imageData.split(';')[0].split(':')[1] // Extract mime type
        }
      });
    }

    // Call the API
    const result = await model.generateContent(contentParts);
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

  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Error Handling for Model Not Found
    if (error.message?.includes("404") || error.message?.includes("not found")) {
       console.log("⚠️ Gemini 2.0 Flash not found. Your API key might not have access to Experimental models yet.");
       console.log("👉 Suggestion: Change modelName to 'gemini-1.5-flash' in src/lib/gemini.ts");
       throw new Error("Gemini 2.0 model not found. Try switching back to gemini-1.5-flash.");
    }
    throw error;
  }
}
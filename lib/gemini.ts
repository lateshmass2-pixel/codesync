import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

export async function generateCode(userPrompt: string, fileContext: string, mediaData?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ FIX 1: Use the correct Experimental Model for Video
    // "gemini-2.5" does not exist. Use 2.0 Flash Experimental.
    const modelName = "gemini-2.5-flash";
    
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    console.log(`🤖 Asking ${modelName} (Media Enabled)...`);
    
    const contentParts: any[] = [];
    
    const textPrompt = `
      You are an expert Senior Developer.
      
      ${mediaData ? 'MEDIA CONTEXT: Analyze the attached image or video frame-by-frame. Replicate the layout, motion, and aesthetics exactly.' : ''}
      
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
    
    // ✅ FIX 2: Dynamic Media Handling (Video & Image)
    if (mediaData) {
      // 1. Extract the MIME type (e.g., "video/mp4" or "image/png")
      const mimeTypeMatch = mediaData.match(/^data:(.*?);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png"; // Default to png if unknown

      // 2. Clean the Base64 string (Remove the "data:video/mp4;base64," prefix)
      const cleanBase64 = mediaData.replace(/^data:.*?;base64,/, "");

      contentParts.push({
        inlineData: {
          data: cleanBase64, 
          mimeType: mimeType 
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
    if (error.message?.includes("404")) {
        throw new Error(`Model '${modelName}' not found. Your API Key might not have access to Experimental models yet.`);
    }
    throw error;
  }
}
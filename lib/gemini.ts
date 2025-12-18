import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateCode(userPrompt: string, fileContext: string, mediaData?: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in .env.local");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Use 1.5 Flash (Most stable for video)
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Asking ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const contentParts: any[] = [];
      
      const textPrompt = `
        You are an expert Senior Developer.
        ${mediaData ? 'MEDIA CONTEXT: Analyze the attached video frame-by-frame. Replicate layout & animations.' : ''}
        FILE CONTEXT: ${fileContext}
        INSTRUCTION: ${userPrompt}
        OUTPUT RULES:
        1. Return a JSON object ONLY.
        2. Format: { "explanation": "string", "changes": [{ "path": "string", "content": "string", "type": "create" | "update" | "delete" }] }
      `;
      contentParts.push(textPrompt);
      
      if (mediaData) {
        // 1. Get Mime Type
        const mimeTypeMatch = mediaData.match(/^data:(.*?);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "video/mp4";
        
        // 2. CLEANING: Remove header using precise replacement
        // "data:video/mp4;base64,AAAA..." -> "AAAA..."
        const base64Data = mediaData.replace(/^data:.*?;base64,/, "");

        // 🛑 STOP LOGGING RAW DATA
        // We only log the length to verify it's working without crashing the terminal
        console.log(`📹 Processing Video: ${mimeType} | Size: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

        contentParts.push({
          inlineData: {
            data: base64Data, 
            mimeType: mimeType 
          }
        });
      }

      // Retry Loop
      let attempt = 0;
      let result;
      while (attempt < 3) {
        try {
          result = await model.generateContent(contentParts);
          break; 
        } catch (e: any) {
          if (e.status === 503 || e.status === 504 || e.message?.includes("overloaded")) {
            console.warn(`⚠️ ${modelName} busy. Retrying (${attempt+1}/3)...`);
            await delay(3000 * (attempt + 1));
            attempt++;
          } else {
            throw e; 
          }
        }
      }

      if (!result) throw new Error("No result from AI");

      let content = result.response.text();
      console.log(`✅ Success! Output size: ${content.length} chars`);

      content = content.replace(/```json/g, "").replace(/```/g, "");

      try {
        const fixedJson = jsonrepair(content);
        return JSON.parse(fixedJson);
      } catch (parseError) {
        throw new Error("Invalid JSON received");
      }

    } catch (error: any) {
      console.error(`❌ ${modelName} Failed: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
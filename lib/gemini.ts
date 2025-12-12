import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

// Helper: Pause execution for a few seconds
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateCode(userPrompt: string, fileContext: string, mediaData?: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in .env.local");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // 🚀 STRATEGY: Try the newest model first, fallback to stable if busy
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash"];
  
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Attempting to use: ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const contentParts: any[] = [];
      
      const textPrompt = `
        You are an expert Senior Developer.
        ${mediaData ? 'MEDIA CONTEXT: Analyze the attached video/image frame-by-frame. Replicate layout & motion.' : ''}
        FILE CONTEXT: ${fileContext}
        INSTRUCTION: ${userPrompt}
        OUTPUT RULES:
        1. Return a JSON object ONLY.
        2. Format: { "explanation": "string", "changes": [{ "path": "string", "content": "string", "type": "create" | "update" | "delete" }] }
      `;
      
      contentParts.push(textPrompt);
      
      // Handle Media (Video/Image)
      if (mediaData) {
        const mimeTypeMatch = mediaData.match(/^data:(.*?);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "video/mp4";
        
        // Clean Base64 Data
        const base64Data = mediaData.includes("base64,") 
          ? mediaData.split("base64,")[1] 
          : mediaData;

        contentParts.push({
          inlineData: {
            data: base64Data, 
            mimeType: mimeType 
          }
        });
      }

      // 🔄 RETRY LOOP (For 503 Overloaded Errors on the same model)
      let attempt = 0;
      let result;
      while (attempt < 2) {
        try {
          result = await model.generateContent(contentParts);
          break; // Success!
        } catch (e: any) {
          if (e.status === 503) {
            console.warn(`⚠️ ${modelName} overloaded. Retrying...`);
            await delay(1500); // Wait 1.5s
            attempt++;
          } else {
            throw e; // Throw other errors to trigger the next model
          }
        }
      }

      if (!result) throw new Error(`${modelName} gave no result`);

      let content = result.response.text();
      console.log(`✅ Success with ${modelName}!`);
      console.log("📝 Output Preview:", content.substring(0, 100) + "...");

      content = content.replace(/```json/g, "").replace(/```/g, "");

      try {
        const fixedJson = jsonrepair(content);
        return JSON.parse(fixedJson);
      } catch (parseError) {
        console.error("JSON Repair Failed");
        throw new Error("Invalid JSON received");
      }

    } catch (error: any) {
      console.error(`❌ Failed with ${modelName}: ${error.message || error}`);
      lastError = error;
      // Loop continues to the next model in 'modelsToTry'
    }
  }

  // If all models fail
  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}
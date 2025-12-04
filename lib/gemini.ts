import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

export async function generateCode(userPrompt: string, fileContext: string, imageData?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use vision-capable model when image is provided
    const modelName = imageData ? "gemini-1.5-flash" : "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    console.log(`🤖 Asking Gemini ${modelName}${imageData ? ' with vision' : ''}...`);
    
    // Prepare the content parts
    const contentParts: any[] = [];
    
    // Add text prompt with context
    const textPrompt = `
      You are an expert Senior Developer with vision capabilities.
      
      ${imageData ? 'IMAGE CONTEXT: Analyze the attached image along with the file context below.' : ''}
      
      FILE CONTEXT:
      ${fileContext}

      INSTRUCTION:
      ${userPrompt}

      OUTPUT RULES:
      1. Return a JSON object ONLY.
      2. Format:
      {
        "explanation": "Brief summary${imageData ? ' of what you see in the image and' : ''} of the changes made",
        "changes": [
          {
            "path": "path/to/file.ext",
            "content": "Full code content",
            "type": "create" | "update" | "delete"
          }
        ]
      }
    `;
    
    contentParts.push({ text: textPrompt });
    
    // Add image if provided
    if (imageData) {
      contentParts.push({
        inlineData: {
          data: imageData.split(',')[1], // Remove the data:image/png;base64, prefix
          mimeType: imageData.split(';')[0].split(':')[1] // Extract mime type
        }
      });
    }

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

  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback: If Flash fails (404), try the older stable model "gemini-pro"
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
       console.log(`⚠️ ${imageData ? 'Gemini 1.5 Flash vision' : 'Gemini Flash 1.5'} not found. Please run 'npm install @google/generative-ai@latest'`);
       throw new Error(`${imageData ? 'Gemini 1.5 Flash vision' : 'Gemini Flash 1.5'} not found. Please run 'npm install @google/generative-ai@latest'`);
    }
    throw error;
  }
}
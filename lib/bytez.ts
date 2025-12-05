import { jsonrepair } from "jsonrepair";

// ✅ Ensure this function name matches exactly what workspace.ts is importing
export async function generateCodeWithBytez(userPrompt: string, fileContext: string, imageData?: string) {
  try {
    if (!process.env.BYTEZ_API_KEY) {
      throw new Error("Missing BYTEZ_API_KEY in .env.local");
    }

    const modelId = "anthropic/claude-opus-4-1"; 
    console.log(`🤖 Asking ${modelId} via Bytez...`);

    const systemMessage = {
      role: "system",
      content: `
        You are an expert Senior Developer.
        FILE CONTEXT: ${fileContext}
        
        OUTPUT RULES:
        1. Return a JSON object ONLY. No markdown.
        2. Format: { "explanation": "string", "changes": [{ "path": "string", "content": "string", "type": "create" | "update" | "delete" }] }
      `
    };

    const userMessage = {
      role: "user",
      content: `INSTRUCTION: ${userPrompt}`
    };

    if (imageData) {
       userMessage.content += "\n\n[Image Context Provided]"; 
    }

    const messages = [systemMessage, userMessage];

    const response = await fetch(`https://api.bytez.com/model/${modelId}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.BYTEZ_API_KEY}` 
      },
      body: JSON.stringify({
        input: messages,
        params: {
          temperature: 0.1,
          max_tokens: 4000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bytez API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let content = data.output; 

    // Formatting check
    if (typeof content !== 'string') {
        content = JSON.stringify(content);
    }
    
    console.log("📝 Bytez Output:", content?.substring(0, 100) + "...");

    content = content.replace(/```json/g, "").replace(/```/g, "");

    try {
      const fixedJson = jsonrepair(content);
      return JSON.parse(fixedJson);
    } catch (parseError) {
      console.error("JSON Repair Failed:", content);
      throw new Error("Bytez returned invalid JSON");
    }

  } catch (error: any) {
    console.error("Bytez Provider Error:", error);
    throw error;
  }
}
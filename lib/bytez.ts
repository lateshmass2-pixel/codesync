import { jsonrepair } from "jsonrepair";

export async function generateCodeWithBytez(userPrompt: string, fileContext: string, imageData?: string) {
  try {
    if (!process.env.BYTEZ_API_KEY) {
      throw new Error("Missing BYTEZ_API_KEY in .env.local");
    }

    // ✅ FIX 1: Use a widely supported Model ID
    // "claude-3-5-sonnet" is the current SOTA for coding.
    const modelId = "openai/o3"; 
    
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

    // ✅ FIX 2: Use the Standard OpenAI-Compatible Endpoint
    // This is much safer than guessing the custom /run URL
    const response = await fetch("https://api.bytez.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.BYTEZ_API_KEY}`
      },
      body: JSON.stringify({
        model: modelId, // Model goes here now
        messages: [systemMessage, userMessage],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" } // Try forcing JSON mode
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bytez API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // ✅ FIX 3: Parse standard OpenAI-style response
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
        console.log("Full Response:", JSON.stringify(data, null, 2));
        throw new Error("Bytez returned empty content");
    }

    console.log("📝 Bytez Output:", content.substring(0, 100) + "...");

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
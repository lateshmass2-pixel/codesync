import { HfInference } from "@huggingface/inference";
import { jsonrepair } from "jsonrepair"; // <--- Import the fixer

export async function generateCode(userPrompt: string, fileContext: string) {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("Missing HUGGINGFACE_API_KEY in .env.local");
    }

    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    // We stick with 7B because it's faster and less likely to timeout
    const model = "Qwen/Qwen2.5-Coder-7B-Instruct"; 

    console.log(`🤖 Asking ${model}...`);

    const systemPrompt = `
      You are an expert Coding Agent.
      
      FILE CONTEXT:
      ${fileContext}

      INSTRUCTION:
      ${userPrompt}

      OUTPUT RULES:
      1. Return a JSON object.
      2. No Markdown blocks.
      3. Format:
      {
        "explanation": "Brief summary",
        "changes": [
          {
            "path": "path/to/file.ext",
            "content": "Code content here",
            "type": "create" | "update"
          }
        ]
      }
    `;

    const response = await hf.chatCompletion({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, 
      max_tokens: 8000,
      top_p: 0.9
    });

    let content = response.choices[0].message.content || "";

    console.log("📝 Raw AI Output (Pre-fix):", content.substring(0, 100) + "...");

    // ---------------------------------------------------------
    // THE FIX: Use jsonrepair
    // ---------------------------------------------------------
    
    // 1. Strip Markdown (Common issue)
    content = content.replace(/```json/g, "").replace(/```/g, "");

    // 2. Find the object boundaries
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    
    if (firstBrace === -1) throw new Error("No JSON found in response");
    
    const potentialJson = content.substring(firstBrace, lastBrace + 1);

    // 3. Auto-Repair and Parse
    try {
      // jsonrepair will fix unescaped quotes, bad backslashes, trailing commas, etc.
      const fixedJson = jsonrepair(potentialJson);
      return JSON.parse(fixedJson);
    } catch (parseError) {
      console.error("JSON Repair Failed on:", potentialJson.substring(0, 200));
      throw new Error("AI generated unfixable JSON. Please try again.");
    }

  } catch (error) {
    console.error("Hugging Face Error:", error);
    throw error;
  }
}
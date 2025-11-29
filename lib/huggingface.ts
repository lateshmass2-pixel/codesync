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
      You are an expert Coding Agent specialized in code merging and file management.
      
      FILE CONTEXT:
      ${fileContext}

      INSTRUCTION:
      ${userPrompt}

      CRITICAL RULES FOR CODE MERGING:
      1. When updating a file, you must respect the existing logic provided in the context.
      2. Do not output partial code or placeholders like // ... rest of code or // ... rest of implementation
      3. Return the FULL merged file content including all existing code plus your changes
      4. Preserve imports, dependencies, and existing functions that are not being modified
      5. Only modify the specific parts that the instruction requests
      6. When merging code, ensure all imports, helper functions, and utilities are preserved
      7. Test the merged code mentally to ensure there are no broken references or missing dependencies

      FILE DELETION RULES:
      1. If you create a new file that replaces an old one (e.g., switching from Page.js to Page.tsx), you MUST explicitly output a delete action for the old file
      2. The delete action must come AFTER the create action in the changes array
      3. This cleanup ensures the repository doesn't accumulate orphaned files

      OUTPUT RULES:
      1. Return a JSON object.
      2. No Markdown blocks.
      3. Format:
      {
        "explanation": "Brief summary of changes",
        "changes": [
          {
            "path": "path/to/file.ext",
            "content": "Full code content here",
            "type": "create" | "update" | "delete"
          }
        ]
      }
      4. Type field is REQUIRED in each change object:
         - "create": New file being added to the repository
         - "update": Existing file being modified (must include FULL content)
         - "delete": File to be removed from the repository
      5. For delete operations, the content field can be empty, null, or omitted
      6. Always include complete file contents for create and update operations
      7. Never use type: "update" for new files - use type: "create" instead
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
// Simple test to verify Gemini integration
import { generateCode } from "../lib/gemini"

async function testGemini() {
  try {
    const result = await generateCode(
      "Create a simple hello world React component",
      "📁 src\n📄 App.js\n📄 index.js"
    )
    
    console.log("Gemini Response:", JSON.stringify(result, null, 2))
    console.log("✅ Gemini integration working!")
  } catch (error) {
    console.error("❌ Gemini integration failed:", error)
  }
}

// This would be run manually or in a test environment
// testGemini()
// Simple test to verify Hugging Face integration
import { generateCode } from "../lib/huggingface"

async function testHuggingFace() {
  try {
    const result = await generateCode(
      "Create a simple hello world React component",
      "📁 src\n📄 App.js\n📄 index.js"
    )
    
    console.log("Hugging Face Response:", JSON.stringify(result, null, 2))
    console.log("✅ Hugging Face integration working!")
  } catch (error) {
    console.error("❌ Hugging Face integration failed:", error)
  }
}

// This would be run manually or in a test environment
// testHuggingFace()
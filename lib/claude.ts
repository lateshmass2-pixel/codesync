import Anthropic from "@anthropic-ai/sdk"
import { jsonrepair } from "jsonrepair"

type MediaData = { data: string; mimeType: string }
type ClaudeImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/gif"

const SUPPORTED_IMAGE_TYPES: ClaudeImageMimeType[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

const normalizeImageMimeType = (mimeType: string): ClaudeImageMimeType | null => {
  const normalized = mimeType.toLowerCase()

  if (normalized === "image/jpg") {
    return "image/jpeg"
  }

  return SUPPORTED_IMAGE_TYPES.includes(normalized as ClaudeImageMimeType)
    ? (normalized as ClaudeImageMimeType)
    : null
}

export async function generateCodeWithClaude(
  userPrompt: string,
  fileContext: string,
  mediaData?: MediaData
) {
  const modelName = "claude-opus-4.5-20241022"

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment variables")
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const mediaContext = mediaData
    ? mediaData.mimeType.startsWith("image/")
      ? "IMAGE CONTEXT: Analyze the attached image deeply. Use it as the UI/UX reference."
      : "MEDIA CONTEXT: The user attached rich media, but Claude can currently analyze images only. Use the textual instructions as the primary guide."
    : ""

  const textPrompt = `You are an expert Senior Developer.

${mediaContext}

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
}`

  const userContent: Array<
    | { type: "text"; text: string }
    | {
        type: "image"
        source: { type: "base64"; media_type: ClaudeImageMimeType; data: string }
      }
  > = [
    {
      type: "text",
      text: textPrompt,
    },
  ]

  if (mediaData) {
    const normalizedMime = normalizeImageMimeType(mediaData.mimeType)

    if (normalizedMime) {
      const base64Payload = mediaData.data.includes(",")
        ? mediaData.data.split(",")[1]
        : mediaData.data

      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: normalizedMime,
          data: base64Payload,
        },
      })
    } else {
      userContent.push({
        type: "text",
        text: "NOTE: The provided media type is not supported by Claude vision. Proceed using the textual description and repository context.",
      })
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    })

    const responseText = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim()

    if (!responseText) {
      throw new Error("Claude returned an empty response")
    }

    const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "")

    try {
      const repaired = jsonrepair(cleaned)
      return JSON.parse(repaired)
    } catch (error) {
      console.error("Claude JSON parsing failed:", responseText)
      throw new Error("Claude returned invalid JSON")
    }
  } catch (error) {
    console.error("Claude Error:", error)
    throw error
  }
}

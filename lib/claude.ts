import { Anthropic } from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

export async function generateCodeWithClaude(
  userPrompt: string,
  fileContext: string,
  mediaData?: { data: string; mimeType: string }
) {
  const modelName = 'claude-3-5-sonnet-20241022';

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Missing ANTHROPIC_API_KEY in .env.local');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log(`🤖 Asking ${modelName} (Vision Enabled)...`);

    const messageContent: any[] = [];
    
    const textPrompt = `
      You are an expert Senior Developer.
      
      ${mediaData ? (mediaData.mimeType.startsWith('video/') 
        ? 'VIDEO CONTEXT: Analyze the attached video deeply. Pay attention to motion, transitions, user interactions, and animations shown in the video. Replicate these dynamics in the code.' 
        : 'IMAGE CONTEXT: Analyze the attached image deeply. Use it as the UI/UX reference.') 
        : ''}
      
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
      }
    `;
    
    messageContent.push({
      type: 'text',
      text: textPrompt,
    });
    
    if (mediaData) {
      messageContent.push({
        type: mediaData.mimeType.startsWith('video/') ? 'video' : 'image',
        source: {
          type: 'base64',
          media_type: mediaData.mimeType,
          data: mediaData.data.split(',')[1],
        },
      });
    }

    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    let content = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log('📝 Claude Output:', content.substring(0, 100) + '...');

    content = content.replace(/```json/g, '').replace(/```/g, '');

    try {
      const fixedJson = jsonrepair(content);
      return JSON.parse(fixedJson);
    } catch (error) {
      console.error('JSON Repair Failed:', content);
      throw new Error('Claude returned invalid JSON');
    }

  } catch (error: any) {
    console.error('Claude Error:', error);
    
    if (error.message?.includes('401') || error.message?.includes('authentication')) {
        throw new Error(`Authentication failed. Please check your ANTHROPIC_API_KEY environment variable.`);
    }
    if (error.message?.includes('400') || error.message?.includes('invalid')) {
        throw new Error(`Invalid request. The model '${modelName}' might not support this format or the media might be too large.`);
    }
    throw error;
  }
}
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { discoverAndStartSequence } from '@/lib/sequence';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Very simple intent parsing with a System Prompt
    const systemPrompt = `You are the Elvora AI Outreach Assistant.
Your goal is to parse user instructions into standard JSON commands if they ask to find leads or start sequences.
If the user asks to "Find care homes in [Region] rated [Rating]", output ONLY a strict JSON payload like this:
{"action": "START_SEQUENCE", "region": "South East", "rating": "Requires Improvement", "limit": 5}

If it's regular conversation, just reply naturally to the user.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Check if the response is our JSON action
    let actionPayload;
    try {
      actionPayload = JSON.parse(aiResponse);
    } catch(e) {
      // not JSON
    }

    if (actionPayload && actionPayload.action === 'START_SEQUENCE') {
        const { region, rating, limit } = actionPayload;
        
        // Trigger orchestrator asynchronously in the background so we don't block the chat
        discoverAndStartSequence({ region, rating, limit }).catch(err => {
            console.error('Sequence Failed:', err);
        });

        return NextResponse.json({
            role: 'assistant',
            content: `I have started the discovery process for ${region} care homes rated ${rating}. I will add matches to the pipeline and begin Phase 1 outreach.`
        });
    }

    // Regular conversation
    return NextResponse.json({
      role: 'assistant',
      content: aiResponse
    });

  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

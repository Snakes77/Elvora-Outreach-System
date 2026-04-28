import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { discoverAndStartSequence } from '@/lib/sequence';
import { supabaseAdmin } from '@/lib/supabase-admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `You are the Elvora Super System Assistant. You have access to powerful tools to discover new outreach leads and check live campaign metrics directly from the Supabase database. Output responses in a helpful and highly professional manner. Do not mention that you are an AI. You are a seamless UI element of the Elvora platform.`;

    const runner = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'start_sequence',
            description: 'Trigger a new outreach sequence finding care homes matching a specific region and rating.',
            parameters: {
              type: 'object',
              properties: {
                region: { type: 'string', description: 'e.g. South East, London, etc.' },
                rating: { type: 'string', description: 'e.g. Requires Improvement, Inadequate' },
                limit: { type: 'number', description: 'Max leads to find. Default 5.' }
              },
              required: ['region', 'rating']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'get_campaign_metrics',
            description: 'Retrieve live database metrics on how many leads are active, unsubscribed, and in each exact phase of the automated sequence pipeline.',
            parameters: { type: 'object', properties: {} }
          }
        }
      ],
      tool_choice: 'auto'
    });

    const responseMessage = runner.choices[0].message;

    if (responseMessage.tool_calls) {
        messages.push(responseMessage); // Add the assistant's tool call to conversation history

        for (const toolCall of responseMessage.tool_calls) {
            const funcCall = (toolCall as any).function;
            if (!funcCall) continue;
            
            const args = JSON.parse(funcCall.arguments);
            
            if (funcCall.name === 'start_sequence') {
                const { region, rating, limit = 5 } = args;
                
                // Trigger orchestrator asynchronously in the background so we don't block the chat
                discoverAndStartSequence({ region, rating, limit }).catch(err => {
                    console.error('Sequence Failed:', err);
                });
                
                messages.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: 'start_sequence',
                    content: `Success. The Elvora engine has started extracting up to ${limit} leads for ${region} rated ${rating}. They are currently being enriched and will automatically begin Phase 0.`
                });
            }

            if (funcCall.name === 'get_campaign_metrics') {
                const { data: allLeads, error } = await supabaseAdmin.from('leads').select('current_phase, status');
                if (error) {
                    messages.push({ tool_call_id: toolCall.id, role: 'tool', name: 'get_campaign_metrics', content: "Database Error: Could not fetch leads." });
                } else {
                    const active = allLeads.filter((l: any) => l.status === 'active').length;
                    const unsubscribed = allLeads.filter((l: any) => l.status === 'unsubscribed').length;
                    const phase0 = allLeads.filter((l: any) => l.current_phase === 0).length;
                    const phase1 = allLeads.filter((l: any) => l.current_phase === 1).length;
                    const phase2 = allLeads.filter((l: any) => l.current_phase === 2).length;
                    
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: 'get_campaign_metrics',
                        content: JSON.stringify({ 
                            total_leads: allLeads.length, 
                            active_leads: active, 
                            unsubscribed_leads: unsubscribed,
                            active_in_phase_0: phase0,
                            active_in_phase_1: phase1,
                            active_in_phase_2: phase2
                        })
                    });
                }
            }
        }

        // 2nd completion to form the final natural language answer
        const secondResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ]
        });

        return NextResponse.json({
            role: 'assistant',
            content: secondResponse.choices[0].message.content
        });
    }

    // Regular generic conversation
    return NextResponse.json({
      role: 'assistant',
      content: responseMessage.content
    });

  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

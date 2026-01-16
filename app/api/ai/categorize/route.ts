import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const CategorizationSchema = z.object({
  assignments: z.array(z.object({
    transaction_index: z.number(),
    category_id: z.string(),
    confidence: z.enum(['high', 'medium', 'low'])
  }))
});

export async function POST(request: Request) {
  try {
    const { transactions, categories } = await request.json();

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'Invalid categories data' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare prompt data
    const categoriesList = categories.map((c: any) => `${c.name} (ID: ${c.id})`).join('\n');
    const transactionsList = transactions.map((t: any, index: number) => 
      `Index ${index}: ${t.description} (Amount: ${t.amount})`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini as per project conventions
      messages: [
        {
          role: "system",
          content: `You are an expert financial transaction classifier. 
Match each transaction to the most appropriate category from the provided list.
Consider the transaction description and amount (positive = income, negative = expense).
Return the result as a list of assignments with transaction_index and category_id.
If you are unsure, pick the best guess and mark confidence as 'low'.

Available Categories:
${categoriesList}`
        },
        {
          role: "user",
          content: `Classify these transactions:
${transactionsList}`
        }
      ],
      response_format: zodResponseFormat(CategorizationSchema, "categorization"),
    });

    const message = completion.choices[0].message;
    
    if (message.refusal) {
      return NextResponse.json({ error: `AI Refusal: ${message.refusal}` }, { status: 400 });
    }

    if (!message.content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(message.content);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('AI Categorization Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to categorize transactions' },
      { status: 500 }
    );
  }
}

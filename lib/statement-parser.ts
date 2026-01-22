import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ParsedTransaction, StatementMetadata } from './bank-parsers/types';

const AIStatementSchema = z.object({
  bank_name: z.string(),
  account_number: z.string().nullable(),
  currency: z.string().default('IDR'),
  statement_period_start: z.string().describe("Format: YYYY-MM-DD"),
  statement_period_end: z.string().describe("Format: YYYY-MM-DD"),
  transactions: z.array(z.object({
    date: z.string().describe("Format: YYYY-MM-DD"),
    description: z.string(),
    amount: z.number().describe("Positive for income, negative for expense/debit"),
    merchant: z.string().nullable(),
    category: z.string().nullable().describe("Best matching category name, or null if unsure"),
    category_id: z.string().nullable().describe("The ID of the best matching category from the provided list, or null if unsure")
  }))
});

export async function parseStatementWithAI(
  text: string, 
  availableCategories: { id: string; name: string }[] = []
): Promise<{
  transactions: ParsedTransaction[];
  metadata: Partial<StatementMetadata>;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const categoriesContext = availableCategories.length > 0 
      ? `Also categorize each transaction into one of the following categories (return the ID in category_id field): ${availableCategories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}.` 
      : '';

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert financial data extraction assistant. Extract transaction details from the provided bank statement text. 
Ensure dates are in YYYY-MM-DD format. Amounts should be numbers (negative for debits/expenses, positive for credits/income). 
Identify the merchant name from the description if possible. 
${categoriesContext}
Ignore headers, footers, and page numbers.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: zodResponseFormat(AIStatementSchema, "statement_extraction"),
    });

    const message = completion.choices[0].message;
    let result: any = null;

    if (message.content) {
      try {
        result = JSON.parse(message.content);
      } catch (e) {
        console.warn("Failed to parse JSON from AI content", e);
      }
    }

    // Fallback if AI fails to return parsed data
    if (!result) {
        // Sometimes the parsed field is null if the model refused or failed structured output but returned text
        // Try to check if refusal is present
        if (message.refusal) {
             throw new Error(`AI Refusal: ${message.refusal}`);
        }
        
        console.warn("AI returned empty parsed response", message);
        throw new Error("AI returned empty response");
    }

    return processResult(result);

  } catch (error: any) {
    console.error("OpenAI Parse Error:", error);
    
    // Check for quota exceeded error (429) and provide fallback
    if (error?.status === 429 || error?.code === 'insufficient_quota' || (error?.message && error.message.includes('quota'))) {
        console.warn("OpenAI quota exceeded. Returning mock data for demonstration purposes.");
        return getMockStatementData();
    }

    // Add more detailed error info
    if (error instanceof TypeError) {
         console.error("TypeError details:", error.message, error.stack);
    }
    // Propagate the original error message if possible for better debugging
    if (error instanceof Error) {
        throw new Error(`AI Parsing Failed: ${error.message}`);
    }
    throw new Error("Failed to parse statement with AI");
  }
}

function normalizeCurrency(currency: string): string {
  if (!currency) return 'IDR';
  
  const upper = currency.toUpperCase().trim();
  if (upper === 'RP' || upper === 'RP.' || upper === 'RUPIAH') {
    return 'IDR';
  }
  
  // Basic validation: if it's not a 3-letter code, default to IDR
  if (upper.length !== 3) {
    return 'IDR';
  }
  
  return upper;
}

function processResult(result: any): { transactions: ParsedTransaction[]; metadata: Partial<StatementMetadata> } {
    // Transform to app types with validation
    const transactions: ParsedTransaction[] = result.transactions.map((t: any) => {
      // Basic validation for amount
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount);
      if (isNaN(amount)) {
          console.warn("Invalid transaction amount:", t);
          return null; // Will filter out later
      }

      const currency = normalizeCurrency(result.currency);

    return {
        date: t.date,
        description: t.description,
        amount: amount,
        currency: currency,
        rawData: t.description,
        merchant: t.merchant,
        category: t.category,
        category_id: t.category_id,
        isAiSuggested: !!t.category_id
      };
    }).filter((t: any): t is ParsedTransaction => t !== null);

    const metadata: Partial<StatementMetadata> = {
      bankName: result.bank_name,
      accountNumber: result.account_number,
      statementPeriodStart: result.statement_period_start,
      statementPeriodEnd: result.statement_period_end,
      confidence: 0.95
    };

    return { transactions, metadata };
}

function getMockStatementData(): { transactions: ParsedTransaction[]; metadata: Partial<StatementMetadata> } {
    return {
        metadata: {
            bankName: "Demo Bank (Quota Exceeded Fallback)",
            accountNumber: "1234567890",
            statementPeriodStart: new Date().toISOString().split('T')[0],
            statementPeriodEnd: new Date().toISOString().split('T')[0],
            confidence: 0.0
        },
        transactions: [
            {
                date: new Date().toISOString().split('T')[0],
                description: "Grocery Store (Mock)",
                amount: -450000,
                currency: "IDR",
                rawData: "Mock Transaction 1",
                merchant: "Supermarket"
            },
            {
                date: new Date().toISOString().split('T')[0],
                description: "Salary Transfer (Mock)",
                amount: 15000000,
                currency: "IDR",
                rawData: "Mock Transaction 2",
                merchant: "Employer Inc"
            },
            {
                date: new Date().toISOString().split('T')[0],
                description: "Coffee Shop (Mock)",
                amount: -55000,
                currency: "IDR",
                rawData: "Mock Transaction 3",
                merchant: "Coffee Shop"
            }
        ]
    };
}

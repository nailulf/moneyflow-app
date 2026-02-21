import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ParsedTransaction, StatementMetadata } from './bank-parsers/types'

const AIReceiptSchema = z.object({
  source_type: z.enum(['receipt', 'invoice', 'bank_statement', 'unknown']),
  merchant_name: z.string().nullable(),
  currency: z.string().default('IDR'),
  statement_period_start: z.string().nullable().describe('Format: YYYY-MM-DD, or null if unknown'),
  statement_period_end: z.string().nullable().describe('Format: YYYY-MM-DD, or null if unknown'),
  transactions: z.array(
    z.object({
      date: z.string().describe('Format: YYYY-MM-DD'),
      description: z.string(),
      amount: z.number().describe('Positive for income/refund, negative for expense/payment'),
      merchant: z.string().nullable(),
      category: z.string().nullable().describe('Best matching category name, or null if unsure'),
      category_id: z
        .string()
        .nullable()
        .describe('The ID of the best matching category from the provided list, or null if unsure'),
    })
  ),
})

export async function parseReceiptWithAI(
  base64Image: string,
  mimeType: string,
  availableCategories: { id: string; name: string }[] = []
): Promise<{
  transactions: ParsedTransaction[]
  metadata: Partial<StatementMetadata>
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const categoriesContext =
    availableCategories.length > 0
      ? `Categorize each transaction into one of the following categories (return the ID in category_id field): ${availableCategories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}.`
      : ''

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a financial data extraction assistant. Analyze the image provided.
- If it is a single receipt or invoice: extract ONE transaction representing the total amount paid (negative number for expenses).
- If it is a bank statement, transaction list, or contains multiple transactions: extract all individual transaction rows.
Use YYYY-MM-DD format for dates. Use today's date if the date is not visible.
Amounts should be negative for expenses/payments and positive for income/refunds.
Identify the merchant name when visible.
${categoriesContext}
Return null for unknown or unclear fields.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'Extract financial transactions from this image.',
            },
          ],
        },
      ],
      response_format: zodResponseFormat(AIReceiptSchema, 'receipt_extraction'),
    })

    const message = completion.choices[0].message
    let result: any = null

    if (message.content) {
      try {
        result = JSON.parse(message.content)
      } catch (e) {
        console.warn('Failed to parse JSON from AI content', e)
      }
    }

    if (!result) {
      if (message.refusal) {
        throw new Error(`AI Refusal: ${message.refusal}`)
      }
      throw new Error('AI returned empty response')
    }

    return processReceiptResult(result)
  } catch (error: any) {
    console.error('OpenAI Receipt Parse Error:', error)

    if (
      error?.status === 429 ||
      error?.code === 'insufficient_quota' ||
      (error?.message && error.message.includes('quota'))
    ) {
      console.warn('OpenAI quota exceeded. Returning mock receipt data.')
      return getMockReceiptData()
    }

    if (error instanceof Error) {
      throw new Error(`Receipt Parsing Failed: ${error.message}`)
    }
    throw new Error('Failed to parse receipt with AI')
  }
}

function normalizeCurrency(currency: string): string {
  if (!currency) return 'IDR'
  const upper = currency.toUpperCase().trim()
  if (upper === 'RP' || upper === 'RP.' || upper === 'RUPIAH') return 'IDR'
  if (upper.length !== 3) return 'IDR'
  return upper
}

function processReceiptResult(result: any): {
  transactions: ParsedTransaction[]
  metadata: Partial<StatementMetadata>
} {
  const currency = normalizeCurrency(result.currency)

  const transactions: ParsedTransaction[] = result.transactions
    .map((t: any) => {
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount)
      if (isNaN(amount)) {
        console.warn('Invalid transaction amount:', t)
        return null
      }

      return {
        date: t.date,
        description: t.description,
        amount,
        currency,
        rawData: t.description,
        merchant: t.merchant,
        category: t.category,
        category_id: t.category_id,
        isAiSuggested: !!t.category_id,
      } satisfies ParsedTransaction
    })
    .filter((t: ParsedTransaction | null): t is ParsedTransaction => t !== null)

  const today = new Date().toISOString().split('T')[0]
  const metadata: Partial<StatementMetadata> = {
    bankName: result.merchant_name ?? 'Receipt',
    accountNumber: undefined,
    statementPeriodStart: result.statement_period_start ?? today,
    statementPeriodEnd: result.statement_period_end ?? today,
    confidence: 0.9,
  }

  return { transactions, metadata }
}

function getMockReceiptData(): { transactions: ParsedTransaction[]; metadata: Partial<StatementMetadata> } {
  const today = new Date().toISOString().split('T')[0]
  return {
    metadata: {
      bankName: 'Demo Receipt (Quota Exceeded)',
      statementPeriodStart: today,
      statementPeriodEnd: today,
      confidence: 0,
    },
    transactions: [
      {
        date: today,
        description: 'Purchase (Mock)',
        amount: -150000,
        currency: 'IDR',
        rawData: 'Mock Receipt Transaction',
        merchant: 'Demo Store',
      },
    ],
  }
}

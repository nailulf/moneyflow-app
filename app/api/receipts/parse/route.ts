import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { parseReceiptWithAI } from '@/lib/receipt-parser'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cost guard: cap AI receipt-parsing (vision) calls per user.
    const limited = await enforceRateLimit(`ai:receipts:${user.id}`, RATE_LIMITS.ai)
    if (limited) return limited

    const formData = await request.formData()
    const file = formData.get('file') as File
    const useAI = formData.get('useAI') === 'true'
    const userId = user.id

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, WEBP, or GIF image.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
    const base64Image = buffer.toString('base64')
    const today = new Date().toISOString().split('T')[0]

    // Mockup mode
    if (!useAI) {
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({
        success: true,
        preview: {
          statement: {
            bank_name: 'Mockup Store',
            account_number: null,
            statement_period_start: today,
            statement_period_end: today,
            opening_balance: 0,
            closing_balance: 0,
            total_transactions: 1,
          },
          transactions: [
            {
              date: today,
              description: 'MOCKUP PURCHASE',
              amount: -150000,
              type: 'EXPENSE',
              merchant: 'Mockup Store',
              currency: 'IDR',
              rawData: 'Mock receipt transaction',
            },
          ],
          duplicates: [],
          warnings: ['Using mockup data — AI parsing was disabled'],
        },
        metadata: {
          bankName: 'Mockup Store',
          statementPeriodStart: today,
          statementPeriodEnd: today,
          confidence: 1.0,
          file: { name: file.name, size: file.size, checksum },
        },
      })
    }

    // Fetch user categories (authenticated user only)
    let availableCategories: { id: string; name: string }[] = []
    try {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_active', true)
      if (categories) availableCategories = categories
    } catch (error) {
      console.warn('Failed to fetch user categories', error)
    }

    try {
      const { transactions, metadata } = await parseReceiptWithAI(base64Image, file.type, availableCategories)

      const periodStart = metadata.statementPeriodStart ?? today
      const periodEnd = metadata.statementPeriodEnd ?? today

      return NextResponse.json({
        success: true,
        preview: {
          statement: {
            bank_name: metadata.bankName,
            account_number: null,
            statement_period_start: periodStart,
            statement_period_end: periodEnd,
            opening_balance: 0,
            closing_balance: 0,
            total_transactions: transactions.length,
          },
          transactions: transactions.map(t => ({
            ...t,
            type: t.amount >= 0 ? 'INCOME' : 'EXPENSE',
          })),
          duplicates: [],
          warnings: [],
        },
        metadata: {
          ...metadata,
          file: { name: file.name, size: file.size, checksum },
        },
      })
    } catch (aiError) {
      console.error('AI Receipt Parse Error', aiError)
      return NextResponse.json(
        {
          error: 'AI parsing failed',
          details: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Receipt Parse API Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

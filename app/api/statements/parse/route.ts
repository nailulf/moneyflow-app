import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { parseStatementWithAI } from '@/lib/statement-parser';
import { createServerComponentClient } from '@/lib/supabase';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';

// Force dynamic since we're handling file uploads
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout for AI processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const useAI = formData.get('useAI') === 'true';
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Please upload a PDF file.' }, { status: 400 });
    }

    // Max file size 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Extract text from PDF using pdf-parse (more stable for serverless)
    let text = '';
    let numpages = 0;
    
    try {
        const data = await pdf(buffer);
        text = data.text;
        numpages = data.numpages;
        
        // Basic validation of extracted text
        if (!text || text.trim().length === 0) {
            throw new Error('Empty text extracted');
        }
    } catch (e) {
        console.error("PDF Parse Error", e);
        return NextResponse.json({ error: 'Failed to extract text from PDF. The file might be corrupted or encrypted.' }, { status: 500 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Mockup Mode
    if (!useAI) {
        // Wait a bit to simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return NextResponse.json({
          success: true,
          preview: {
            statement: {
                bank_name: "Mockup Bank",
                account_number: "1234-5678-9012",
                statement_period_start: "2024-01-01",
                statement_period_end: "2024-01-31",
                opening_balance: 10000000,
                closing_balance: 12500000,
                total_transactions: 2
            },
            transactions: [
                {
                    date: "2024-01-15",
                    description: "MOCKUP TRANSFER IN",
                    amount: 5000000,
                    type: "INCOME",
                    merchant: "John Doe",
                    rawData: "TRANSFER FROM JOHN DOE"
                },
                {
                    date: "2024-01-20",
                    description: "MOCKUP GROCERIES",
                    amount: -2500000,
                    type: "EXPENSE",
                    merchant: "Supermarket",
                    rawData: "PURCHASE AT SUPERMARKET"
                }
            ],
            duplicates: [],
            warnings: ["Using mockup data - AI parsing was disabled"]
          },
          metadata: {
            bankName: "Mockup Bank",
            accountNumber: "1234-5678-9012",
            statementPeriodStart: "2024-01-01",
            statementPeriodEnd: "2024-01-31",
            pages: numpages,
            confidence: 1.0,
            file: {
                name: file.name,
                size: file.size,
                checksum: checksum
            }
          }
        });
    }

    // Parse with AI
    try {
        // Fetch user categories if userId is present
        let availableCategories: { id: string; name: string }[] = [];
        if (userId) {
            try {
                const supabase = createServerComponentClient();
                const { data: categories } = await supabase
                    .from('categories')
                    .select('id, name')
                    .eq('user_id', userId)
                    .eq('is_active', true);
                
                if (categories) {
                    availableCategories = categories;
                }
            } catch (error) {
                console.warn("Failed to fetch user categories", error);
                // Continue without categories
            }
        }

        const { transactions, metadata } = await parseStatementWithAI(text, availableCategories);

        return NextResponse.json({
          success: true,
          preview: {
            statement: {
                bank_name: metadata.bankName,
                account_number: metadata.accountNumber,
                statement_period_start: metadata.statementPeriodStart,
                statement_period_end: metadata.statementPeriodEnd,
                opening_balance: 0, // Placeholder
                closing_balance: 0, // Placeholder
                total_transactions: transactions.length
            },
            transactions: transactions.map(t => ({
                ...t,
                type: t.amount >= 0 ? 'INCOME' : 'EXPENSE'
            })),
            duplicates: [],
            warnings: []
          },
          metadata: {
            ...metadata,
            pages: numpages,
            file: {
                name: file.name,
                size: file.size,
                checksum: checksum
            }
          }
        });
    } catch (aiError) {
        console.error("AI Parse Error", aiError);
        return NextResponse.json({ 
            error: 'AI Parsing failed', 
            details: aiError instanceof Error ? aiError.message : 'Unknown AI error' 
        }, { status: 500 });
    }

  } catch (error) {
    console.error('Parse API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process file', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

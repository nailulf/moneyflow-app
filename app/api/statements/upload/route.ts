import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 });
    }

    const supabase = createServerComponentClient();
    
    // Parse JSON data from client-side parsing
    const body = await request.json();
    const { 
      userId, 
      accountId, 
      statement, 
      transactions, 
      metadata 
    } = body;

    // Validate required fields
    if (!userId || !statement || !transactions) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'userId, statement, and transactions are required' 
      }, { status: 400 });
    }

    // Validate transactions array
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid transactions data', 
        details: 'Transactions must be a non-empty array' 
      }, { status: 400 });
    }

    try {
      // Check for duplicate statements based on metadata
      const { data: existingStatements, error: duplicateError } = await supabase
        .from('statements')
        .select('id, file_name')
        .eq('user_id', userId)
        .eq('bank_name', statement.bank_name)
        .eq('account_number', statement.account_number)
        .eq('statement_period_start', statement.statement_period_start)
        .eq('statement_period_end', statement.statement_period_end);

      if (duplicateError) {
        console.error('Error checking for duplicates:', duplicateError);
      }

      if (existingStatements && existingStatements.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Duplicate statement detected',
          isDuplicate: true,
          duplicateStatementId: existingStatements[0].id,
          message: 'This statement has already been uploaded'
        }, { status: 409 });
      }

      // Return success response for client-side parsed data
      return NextResponse.json({
        success: true,
        message: 'Statement data received and validated successfully',
        preview: {
          statement: {
            bank_name: statement.bank_name || 'Unknown',
            account_number: statement.account_number || 'Unknown',
            statement_period_start: statement.statement_period_start || '',
            statement_period_end: statement.statement_period_end || '',
            opening_balance: statement.opening_balance || 0,
            closing_balance: statement.closing_balance || 0,
            total_transactions: transactions.length
          },
          transactions: transactions.map((t: any) => ({
            date: t.date,
            description: t.description,
            amount: Math.abs(t.amount),
            type: t.amount >= 0 ? 'INCOME' : 'EXPENSE' as 'INCOME' | 'EXPENSE'
          })),
          duplicates: [],
          warnings: metadata?.warnings || []
        },
        metadata: {
          processed: new Date().toISOString(),
          bankDetection: {
            detectedBank: statement.bank_name || 'Unknown',
            confidence: metadata?.confidence || 1,
            method: 'client_side_parsing'
          },
          warnings: metadata?.warnings || []
        }
      });

    } catch (error) {
      console.error('Statement processing error:', error);
      return NextResponse.json({
        success: false,
        error: 'Statement processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Statement upload API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve statement upload history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = createServerComponentClient();

    const { data: statements, error } = await supabase
      .from('statements')
      .select(`
        id,
        file_name,
        file_size,
        bank_name,
        statement_period_start,
        statement_period_end,
        total_transactions,
        processing_status,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching statements:', error);
      return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      statements: statements || [],
      pagination: {
        limit,
        offset,
        total: statements?.length || 0
      }
    });

  } catch (error) {
    console.error('Statement history API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
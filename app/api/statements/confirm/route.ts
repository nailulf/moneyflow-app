import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';
import { ParsedTransaction } from '@/lib/bank-parsers/types';

interface ConfirmStatementRequest {
  userId: string;
  accountId?: string;
  file: {
    name: string;
    size: number;
    checksum: string;
  };
  metadata: {
    bankName: string;
    accountNumber?: string;
    statementPeriodStart?: string;
    statementPeriodEnd?: string;
    pages: number;
    confidence: number;
    detectedBank?: string;
  };
  transactions: ParsedTransaction[];
  warnings?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 });
    }

    const supabase = createServerComponentClient();
    
    // Parse request body
    const body: ConfirmStatementRequest = await request.json();
    const { userId, accountId, file, metadata, transactions, warnings } = body;

    // Validate required fields
    if (!userId || !file || !metadata || !transactions) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'userId, file, metadata, and transactions are required' 
      }, { status: 400 });
    }

    if (transactions.length === 0) {
      return NextResponse.json({ 
        error: 'No transactions to process', 
        details: 'At least one transaction is required' 
      }, { status: 400 });
    }

    try {
      // Start transaction
      const { data, error } = await supabase.rpc('begin_transaction');
      if (error) {
        console.error('Error starting transaction:', error);
        return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
      }

      // Create statement record
      const statementData = {
        user_id: userId,
        account_id: accountId || null,
        file_name: file.name,
        file_size: file.size,
        file_checksum: file.checksum,
        bank_name: metadata.bankName,
        statement_period_start: metadata.statementPeriodStart || null,
        statement_period_end: metadata.statementPeriodEnd || null,
        total_transactions: transactions.length,
        processing_status: 'completed' as const,
        raw_metadata: {
          pages: metadata.pages,
          confidence: metadata.confidence,
          detectedBank: metadata.detectedBank,
          warnings: warnings || [],
          accountNumber: metadata.accountNumber
        }
      };

      const { data: statement, error: statementError } = await supabase
        .from('statements')
        .insert(statementData)
        .select()
        .single();

      if (statementError) {
        console.error('Error creating statement:', statementError);
        return NextResponse.json({ 
          error: 'Failed to create statement record', 
          details: statementError.message 
        }, { status: 500 });
      }

      // Prepare transaction records
      const transactionRecords = transactions.map(transaction => ({
        user_id: userId,
        account_id: accountId || null,
        statement_id: statement.id,
        date: transaction.date,
        posting_date: transaction.postingDate || transaction.date,
        description: transaction.description,
        merchant: transaction.merchant || null,
        amount: transaction.amount,
        type: transaction.amount >= 0 ? 'INCOME' as const : 'EXPENSE' as const,
        currency: transaction.currency,
        raw_data: transaction.rawData,
        is_duplicate: false,
        duplicate_of: null
      }));

      // Insert transactions in batches (Supabase has a limit)
      const batchSize = 100;
      const insertedTransactions = [];
      
      for (let i = 0; i < transactionRecords.length; i += batchSize) {
        const batch = transactionRecords.slice(i, i + batchSize);
        
        const { data: batchResult, error: batchError } = await supabase
          .from('transactions')
          .insert(batch)
          .select();

        if (batchError) {
          console.error('Error inserting transaction batch:', batchError);
          // Rollback by deleting the statement
          await supabase.from('statements').delete().eq('id', statement.id);
          return NextResponse.json({ 
            error: 'Failed to insert transactions', 
            details: batchError.message 
          }, { status: 500 });
        }

        insertedTransactions.push(...(batchResult || []));
      }

      // Update statement with final transaction count
      await supabase
        .from('statements')
        .update({ total_transactions: insertedTransactions.length })
        .eq('id', statement.id);

      return NextResponse.json({
        success: true,
        statement: {
          id: statement.id,
          fileName: statement.file_name,
          bankName: statement.bank_name,
          totalTransactions: insertedTransactions.length,
          statementPeriod: {
            start: statement.statement_period_start,
            end: statement.statement_period_end
          },
          createdAt: statement.created_at
        },
        transactions: insertedTransactions.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type
        })),
        summary: {
          totalTransactions: insertedTransactions.length,
          totalAmount: insertedTransactions.reduce((sum, t) => sum + t.amount, 0),
          incomeCount: insertedTransactions.filter(t => t.amount >= 0).length,
          expenseCount: insertedTransactions.filter(t => t.amount < 0).length
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database operation failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Statement confirmation API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve a specific statement with its transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statementId = searchParams.get('statementId');
    const userId = searchParams.get('userId');

    if (!statementId || !userId) {
      return NextResponse.json({ 
        error: 'statementId and userId are required' 
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();

    // Get statement details
    const { data: statement, error: statementError } = await supabase
      .from('statements')
      .select('*')
      .eq('id', statementId)
      .eq('user_id', userId)
      .single();

    if (statementError) {
      console.error('Error fetching statement:', statementError);
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    // Get associated transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        posting_date,
        description,
        merchant,
        amount,
        type,
        currency,
        is_duplicate,
        created_at
      `)
      .eq('statement_id', statementId)
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      statement,
      transactions: transactions || [],
      summary: {
        totalTransactions: transactions?.length || 0,
        totalAmount: transactions?.reduce((sum, t) => sum + t.amount, 0) || 0,
        incomeCount: transactions?.filter(t => t.amount >= 0).length || 0,
        expenseCount: transactions?.filter(t => t.amount < 0).length || 0
      }
    });

  } catch (error) {
    console.error('Statement details API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
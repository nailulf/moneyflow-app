import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';
import { ParsedTransaction } from '@/lib/bank-parsers/types';
import { z } from 'zod';
import { apiTransactionSchema } from '@/lib/validations';

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
  transactions: any[]; // Using any[] to allow for extended fields like category_id
  warnings?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 });
    }

    const supabase = createServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body: ConfirmStatementRequest = await request.json();
    const { userId: bodyUserId, accountId, file, metadata, transactions, warnings } = body;

    // Validate user matches session
    if (bodyUserId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const userId = user.id;

    // Validate required fields
    if (!file || !metadata || !transactions) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'file, metadata, and transactions are required' 
      }, { status: 400 });
    }

    if (transactions.length === 0) {
      return NextResponse.json({ 
        error: 'No transactions to process', 
        details: 'At least one transaction is required' 
      }, { status: 400 });
    }

    const startTime = performance.now();
    console.log(`[Statement Confirm] Starting processing of ${transactions.length} transactions`);

    try {
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

      // Validate and prepare transaction records
      const validTransactions = [];
      const validationErrors = [];
      const transactionWarnings: string[] = [];

      for (const [index, item] of transactions.entries()) {
        try {
          // Prepare item for validation (inject user_id if missing)
          const itemToValidate = {
            ...item,
            user_id: userId,
            // Ensure type matches enum if not provided, otherwise trust the input
            type: item.type || (item.amount >= 0 ? 'INCOME' : 'EXPENSE'),
            // Ensure currency is set
            currency: item.currency || 'IDR'
          };

          // Parse and validate using Zod schema
          const parsed = apiTransactionSchema.parse(itemToValidate);

          // Check for missing optional but recommended fields
          if (!parsed.merchant) {
            transactionWarnings.push(`Transaction at index ${index}: Missing merchant information`);
          }
          if (!parsed.category_id) {
            transactionWarnings.push(`Transaction at index ${index}: Missing category assignment`);
          }

          validTransactions.push({
            ...parsed,
            statement_id: statement.id, // Link to statement
            posting_date: item.postingDate || parsed.date, // Preserve posting date if available
            raw_data: item.rawData, // Preserve raw data
            created_at: new Date().toISOString()
          });

        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            validationErrors.push({
              index,
              description: item.description || 'Unknown',
              errors: (validationError as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
            });
          } else {
             validationErrors.push({
              index,
              error: 'Unknown validation error'
            });
          }
        }
      }

      // If validation fails for some, we currently fail all to ensure consistency.
      // Alternatively, we could filter out bad ones, but user wants "complete synchronization".
      if (validationErrors.length > 0) {
        console.error('[Statement Confirm] Validation failed for some items:', validationErrors);
        // Clean up the statement we just created
        await supabase.from('statements').delete().eq('id', statement.id);
        
        return NextResponse.json({ 
          error: 'Validation failed for some transactions', 
          details: validationErrors,
          warnings: transactionWarnings
        }, { status: 400 });
      }

      // Insert transactions in batches
      const batchSize = 100;
      const insertedTransactions = [];
      
      for (let i = 0; i < validTransactions.length; i += batchSize) {
        const batch = validTransactions.slice(i, i + batchSize);
        
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

        if (batchResult) {
            insertedTransactions.push(...batchResult);
        }
      }

      // Update statement with final transaction count
      await supabase
        .from('statements')
        .update({ total_transactions: insertedTransactions.length })
        .eq('id', statement.id);

      const duration = performance.now() - startTime;
      console.log(`[Statement Confirm] Successfully processed ${insertedTransactions.length} transactions in ${duration.toFixed(2)}ms`);

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
        transactions: insertedTransactions,
        summary: {
          totalTransactions: insertedTransactions.length,
          totalAmount: insertedTransactions.reduce((sum, t) => sum + t.amount, 0),
          incomeCount: insertedTransactions.filter(t => t.amount >= 0).length,
          expenseCount: insertedTransactions.filter(t => t.amount < 0).length
        },
        performance: {
          durationMs: duration,
          itemsPerSecond: (insertedTransactions.length) / (duration / 1000)
        },
        warnings: transactionWarnings
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
    const paramUserId = searchParams.get('userId');

    const supabase = createServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (paramUserId && paramUserId !== user.id) {
       return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const userId = user.id;

    if (!statementId) {
      return NextResponse.json({ 
        error: 'statementId is required' 
      }, { status: 400 });
    }

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
        created_at,
        category_id
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

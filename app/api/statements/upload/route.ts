import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const normalizeText = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const toKey = (date: string, amount: number, descriptor: string) =>
  `${date}|${amount.toFixed(2)}|${descriptor}`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse JSON data from client-side parsing
    const body = await request.json();
    const { 
      userId: bodyUserId, 
      accountId, 
      statement, 
      transactions, 
      metadata 
    } = body;

    // Validate user matches session
    if (bodyUserId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const userId = user.id;

    // Validate required fields
    if (!statement || !transactions) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'statement and transactions are required' 
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
      const checksum = metadata?.file?.checksum;

      if (checksum) {
        const { data: existingChecksum, error: checksumError } = await supabase
          .from('statements')
          .select('id, file_name')
          .eq('user_id', userId)
          .eq('file_checksum', checksum)
          .maybeSingle();

        if (checksumError) {
          console.error('Error checking checksum duplicates:', checksumError);
        }

        if (existingChecksum) {
          return NextResponse.json({
            success: false,
            error: 'Duplicate statement detected',
            isDuplicate: true,
            duplicateStatementId: existingChecksum.id,
            message: 'This statement has already been uploaded'
          }, { status: 409 });
        }
      }

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

      const normalizedTransactions = transactions.map((t: any) => {
        const normalizedDate = normalizeDate(t.postingDate || t.date);
        return {
          ...t,
          date: normalizedDate,
          postingDate: t.postingDate ? normalizeDate(t.postingDate) : undefined
        };
      });

      let duplicates: Array<{ transactionIndex: number; duplicateOfId: string; reason: string; confidence: number }> = [];

      if (accountId) {
        const dates = normalizedTransactions
          .map((t: any) => normalizeDate(t.postingDate || t.date))
          .filter(Boolean)
          .sort();

        if (dates.length > 0) {
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];

          const { data: existingTransactions, error: existingError } = await supabase
            .from('transactions')
            .select('id, date, amount, description, merchant')
            .eq('user_id', userId)
            .eq('account_id', accountId)
            .gte('date', minDate)
            .lte('date', maxDate);

          if (existingError) {
            console.error('Error checking for duplicate transactions:', existingError);
          }

          const existingMap = new Map<string, { id: string }>();
          (existingTransactions || []).forEach((existing: any) => {
            const existingDate = normalizeDate(existing.date);
            const descriptor = normalizeText(existing.merchant || existing.description);
            const key = toKey(existingDate, Number(existing.amount), descriptor);
            if (!existingMap.has(key)) {
              existingMap.set(key, { id: existing.id });
            }
          });

          normalizedTransactions.forEach((transaction: any, index: number) => {
            const descriptor = normalizeText(transaction.merchant || transaction.description);
            const transactionDate = normalizeDate(transaction.postingDate || transaction.date);
            const key = toKey(transactionDate, Number(transaction.amount), descriptor);
            const match = existingMap.get(key);
            if (match) {
              transaction.isDuplicate = true;
              transaction.duplicateReason = 'Same date, amount, and merchant/description';
              duplicates.push({
                transactionIndex: index,
                duplicateOfId: match.id,
                reason: transaction.duplicateReason,
                confidence: 0.9
              });
            } else {
              transaction.isDuplicate = false;
            }
          });
        }
      }

      const previewTransactions = normalizedTransactions.map((t: any) => ({
        ...t,
        type: t.type || (t.amount >= 0 ? 'INCOME' : 'EXPENSE')
      }));

      const totalAmount = previewTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const currency = previewTransactions.find((t: any) => t.currency)?.currency || metadata?.currency || 'IDR';

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
            total_transactions: previewTransactions.length
          },
          transactions: previewTransactions,
          duplicates,
          warnings: metadata?.warnings || [],
          summary: {
            totalTransactions: previewTransactions.length,
            totalAmount,
            duplicateCount: duplicates.length,
            currency
          }
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
    const paramUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (paramUserId && paramUserId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const userId = user.id;

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

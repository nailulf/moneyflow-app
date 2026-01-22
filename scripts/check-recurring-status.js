const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPendingTransactions() {
  console.log('Checking for pending recurring transactions...');
  console.log('Current Time:', new Date().toISOString());

  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const { data: recurringTransactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_recurring', true);

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  console.log(`Found ${recurringTransactions.length} recurring transactions configuration(s).`);

  const pending = [];

  for (const transaction of recurringTransactions) {
    // Logic from lib/recurring-processor.ts
    
    // Check end date
    if (transaction.recurring_end_date) {
      const endDate = new Date(transaction.recurring_end_date);
      endDate.setHours(23, 59, 59, 999);
      if (now > endDate) continue;
    }

    const frequency = transaction.recurring_frequency || 'monthly';
    const originalDate = new Date(transaction.date);
    originalDate.setHours(12, 0, 0, 0);

    const lastProcessed = transaction.last_processed_date
      ? new Date(transaction.last_processed_date)
      : new Date(transaction.date);
    lastProcessed.setHours(12, 0, 0, 0);

    // Skip if already processed today
    if (lastProcessed.getTime() === now.getTime()) continue;

    let shouldRun = false;

    if (frequency === 'daily') {
      if (now >= originalDate) shouldRun = true;
    } else if (frequency === 'weekly') {
      const daysSinceLastRun = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24);
      if (now.getDay() === originalDate.getDay() && daysSinceLastRun >= 6) {
        shouldRun = true;
      }
    } else if (frequency === 'monthly') {
      if (now.getDate() === originalDate.getDate()) {
        const isSameMonthAsLast = lastProcessed.getMonth() === now.getMonth() && lastProcessed.getFullYear() === now.getFullYear();
        if (!isSameMonthAsLast) shouldRun = true;
      }
    } else if (frequency === 'yearly') {
      if (now.getDate() === originalDate.getDate() && now.getMonth() === originalDate.getMonth()) {
        const isSameYearAsLast = lastProcessed.getFullYear() === now.getFullYear();
        if (!isSameYearAsLast) shouldRun = true;
      }
    }

    if (shouldRun) {
      pending.push({
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        frequency: frequency,
        lastProcessed: lastProcessed.toISOString().split('T')[0],
        nextRun: now.toISOString().split('T')[0]
      });
    }
  }

  if (pending.length > 0) {
    console.log('\nPending Transactions (Planned for Today):');
    console.table(pending);
  } else {
    console.log('\nNo transactions pending for today.');
  }
}

checkPendingTransactions().catch(console.error);
# Recurring Transactions System

This document describes the automated recurring transaction system that generates new transactions on a monthly basis.

## Overview

The system automatically processes recurring transactions and creates new transaction entries based on the original transaction's details. It runs monthly via a Vercel cron job.

## Components

### 1. Database Schema

- **`is_recurring`**: Boolean field in the `transactions` table to mark transactions as recurring
- **`last_processed_date`**: Timestamp field to track when a recurring transaction was last processed

### 2. API Endpoint

**Endpoint**: `/api/recurring-transactions`

**Methods**:
- `POST`: Processes recurring transactions (called by cron job)
- `GET`: Returns status and test information
- `GET?test=true`: Shows pending recurring transactions

### 3. Cron Job Configuration

**Schedule**: `0 0 1 * *` (1st day of every month at midnight UTC)
**File**: `vercel.json`

## How It Works

1. **Monthly Trigger**: Vercel cron job calls the API endpoint on the 1st of each month
2. **Transaction Identification**: System finds all recurring transactions that haven't been processed this month
3. **Date Calculation**: Calculates the next occurrence date based on the original transaction date
4. **New Transaction Creation**: Creates a new transaction with the same details but updated date
5. **Tracking Update**: Updates the `last_processed_date` field to prevent duplicate processing

## Security

The cron endpoint is protected by a secret token (`CRON_SECRET`) that must be provided in the Authorization header.

## Environment Variables

```env
# Required for cron job authentication
CRON_SECRET=your-secure-random-string
```

## Database Migration

Run the following migration to add the required fields:

```sql
-- Migration: 012_add_last_processed_date_to_transactions.sql
ALTER TABLE transactions 
ADD COLUMN last_processed_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_transactions_recurring_processed 
ON transactions (is_recurring, last_processed_date) 
WHERE is_recurring = true;
```

## Testing

### Manual Testing

1. **Check pending transactions**:
   ```bash
   curl "http://localhost:3001/api/recurring-transactions?test=true"
   ```

2. **Manually trigger processing** (requires CRON_SECRET):
   ```bash
   curl -X POST "http://localhost:3001/api/recurring-transactions" \
     -H "Authorization: Bearer your-cron-secret"
   ```

### Creating Test Data

1. Create a transaction with `is_recurring: true`
2. Set the `last_processed_date` to null or a date from the previous month
3. Run the manual trigger to test the system

## Deployment Notes

1. **Environment Variables**: Ensure `CRON_SECRET` is set in your Vercel environment variables
2. **Database Migration**: Apply the migration before deploying the cron job
3. **Monitoring**: Check Vercel function logs to monitor cron job execution

## Troubleshooting

### Common Issues

1. **Cron job not running**: Check Vercel dashboard for cron job status
2. **Unauthorized errors**: Verify `CRON_SECRET` is correctly set
3. **Duplicate transactions**: Check `last_processed_date` logic and database constraints
4. **Missing transactions**: Verify the date calculation logic and timezone handling

### Logs

Check the following for debugging:
- Vercel function logs
- Database query logs
- API endpoint response logs

## Future Enhancements

- Support for different recurring intervals (weekly, quarterly, yearly)
- User-configurable recurring transaction settings
- Email notifications for processed recurring transactions
- Dashboard to view and manage recurring transactions
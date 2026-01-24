# Recurring Transactions System

This document describes the automated recurring transaction system that generates new transactions on a monthly basis.

## Overview

The system automatically processes recurring transactions and creates new transaction entries based on the original transaction's details. It runs daily via a GitHub Actions workflow (free alternative to Vercel Cron, which requires a Pro plan).

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

**Schedule**: `0 0 * * *` (Daily at midnight UTC)
**File**: `.github/workflows/recurring-transactions.yml`
**Method**: GitHub Actions (free, works on all Vercel plans)

## How It Works

1. **Daily Trigger**: GitHub Actions workflow calls the API endpoint daily at midnight UTC
2. **Transaction Identification**: System finds all recurring transactions that need processing based on their frequency (daily, weekly, monthly, yearly)
3. **Date Calculation**: Calculates if the transaction should run today based on the original transaction date and frequency
4. **New Transaction Creation**: Creates a new transaction with the same details but updated date
5. **Tracking Update**: Updates the `last_processed_date` field to prevent duplicate processing

## Security

The cron endpoint is protected by a secret token (`CRON_SECRET`) that must be provided in the Authorization header.

## Setup Instructions

### 1. Generate a CRON_SECRET

Generate a secure random string:
```bash
openssl rand -base64 32
```

### 2. Configure Vercel Environment Variables

Add to your Vercel project settings:
```env
CRON_SECRET=your-generated-secure-random-string
```

### 3. Configure GitHub Secrets

In your GitHub repository settings (Settings → Secrets and variables → Actions), add:
- `CRON_SECRET`: The same value you used in Vercel
- `APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### 4. Enable GitHub Actions

GitHub Actions should be enabled by default. The workflow file at `.github/workflows/recurring-transactions.yml` will run automatically daily at midnight UTC.

### 5. Manual Testing

You can manually trigger the workflow from the GitHub Actions tab:
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Process Recurring Transactions"
4. Click "Run workflow"

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

1. **Environment Variables**: Ensure `CRON_SECRET` is set in both Vercel and GitHub Secrets
2. **GitHub Secrets**: Set `APP_URL` to your Vercel deployment URL
3. **Database Migration**: Apply the migration before enabling the cron job
4. **Monitoring**: Check GitHub Actions logs and Vercel function logs to monitor execution

## Troubleshooting

### Common Issues

1. **GitHub Action not running**:
   - Check the "Actions" tab in your GitHub repository
   - Ensure GitHub Actions is enabled for your repository
   - Verify the workflow file syntax is correct

2. **Unauthorized (401) errors**:
   - Verify `CRON_SECRET` matches in both Vercel and GitHub Secrets
   - Check that the Authorization header is being sent correctly
   - Look at Vercel function logs for the actual error

3. **Environment not configured (500) errors**:
   - Ensure `CRON_SECRET` is set in Vercel environment variables
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
   - Redeploy your app after adding environment variables

4. **Duplicate transactions**:
   - Check `last_processed_date` logic and database constraints
   - Verify the workflow isn't running multiple times

5. **Missing transactions**:
   - Verify the date calculation logic and timezone handling
   - Test with `GET /api/recurring-transactions?test=true` to see pending transactions
   - Check that `is_recurring` is set to `true` and frequency is correct

### Logs

Check the following for debugging:
- GitHub Actions logs (Actions tab → workflow run)
- Vercel function logs (Vercel dashboard → Functions → Logs)
- Database query logs
- API endpoint response in GitHub Actions output

## Current Features

- ✅ Support for multiple recurring intervals: daily, weekly, monthly, yearly
- ✅ Automatic transaction generation based on frequency
- ✅ Prevents duplicate processing with `last_processed_date` tracking
- ✅ Test endpoint to preview pending transactions
- ✅ Manual workflow trigger via GitHub Actions UI

## Future Enhancements

- Quarterly recurring interval support
- Email notifications for processed recurring transactions
- Dashboard to view and manage recurring transactions
- Pause/resume recurring transactions
- Bulk management of recurring transactions
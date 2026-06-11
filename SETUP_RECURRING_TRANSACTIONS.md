# Setup Guide: Recurring Transactions with GitHub Actions

This guide will help you set up the recurring transactions feature using GitHub Actions (free alternative to Vercel Cron).

## Why GitHub Actions?

Vercel Cron Jobs are only available on Pro and Enterprise plans. GitHub Actions is completely free and works perfectly for this use case.

## Prerequisites

- GitHub repository for your project
- Vercel deployment
- Supabase database configured

## Step-by-Step Setup

### Step 1: Generate a CRON_SECRET

Open your terminal and generate a secure random string:

```bash
openssl rand -base64 32
```

Copy the output - you'll need it for the next steps.

### Step 2: Add CRON_SECRET to Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Navigate to **Environment Variables**
4. Add a new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: The string you generated in Step 1
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy Your Application

After adding the environment variable, you need to redeploy:

1. Go to **Deployments** in your Vercel dashboard
2. Click the three dots (...) on your latest deployment
3. Click **Redeploy**

Or simply push a new commit to trigger a deployment.

### Step 4: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** (repository settings, not your account)
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret** and add:
   - **Name**: `CRON_SECRET`
   - **Value**: The same string you used in Vercel
5. Click **Add secret**
6. Click **New repository secret** again and add:
   - **Name**: `APP_URL`
   - **Value**: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - ⚠️ **Important**: Do NOT include a trailing slash
7. Click **Add secret**

### Step 5: Commit and Push the GitHub Actions Workflow

The workflow file has already been created at `.github/workflows/recurring-transactions-cron.yml`.

Commit and push these changes:

```bash
git add .github/workflows/recurring-transactions-cron.yml
git add vercel.json
git commit -m "feat: add GitHub Actions workflow for recurring transactions"
git push
```

### Step 6: Verify GitHub Actions is Enabled

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. If you see a message saying Actions is disabled, click **Enable Actions**

### Step 7: Test the Setup

You can manually trigger the workflow to test it:

1. Go to the **Actions** tab in your GitHub repository
2. Click on **Process Recurring Transactions** in the left sidebar
3. Click **Run workflow** (on the right side)
4. Select the branch (usually `main` or `devsupa`)
5. Click the green **Run workflow** button

Wait a few seconds, then refresh the page. You should see a new workflow run.

### Step 8: Check the Results

1. Click on the workflow run to see the details
2. Click on the **process-recurring** job
3. Expand the **Trigger recurring transactions processing** step
4. You should see output like:
   ```
   HTTP Status: 200
   Response: {"success":true,"processedCount":0,...}
   Successfully processed recurring transactions
   ```

## Testing with Recurring Transactions

To test if recurring transactions are being created:

1. Create a test transaction with:
   - `is_recurring`: `true`
   - `recurring_frequency`: `daily` (for quick testing)
   - `date`: Today's date

2. Wait for the next scheduled run (02:00 UTC) or manually trigger the workflow

3. Check your transactions to see if a new one was created

## Scheduled Execution

The workflow is scheduled to run daily at **02:00 UTC**.

To change the schedule, edit `.github/workflows/recurring-transactions-cron.yml` and modify the cron expression:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 02:00 UTC
```

Common cron schedules:
- `0 0 * * *` - Daily at midnight
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

## Troubleshooting

### Workflow fails with "Unauthorized" error

**Problem**: The CRON_SECRET doesn't match between GitHub and Vercel.

**Solution**:
1. Verify the secret in GitHub Secrets matches exactly with Vercel
2. Make sure there are no extra spaces or newlines
3. Redeploy your Vercel app after changing environment variables

### Workflow fails with "Environment variables not configured"

**Problem**: Supabase environment variables are missing in Vercel.

**Solution**:
1. Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel
2. Redeploy your app

### No transactions are being created

**Possibilities**:
1. No recurring transactions in the database with `is_recurring = true`
2. The `last_processed_date` is already today
3. The date/frequency logic isn't matching today's date

**Debug**:
- Test with: `curl "https://your-app.vercel.app/api/recurring-transactions?test=true"`
- This will show you which transactions would be processed today

### Workflow doesn't run at scheduled time

**Check**:
1. GitHub Actions is enabled in your repository settings
2. The workflow file is in the correct location: `.github/workflows/recurring-transactions-cron.yml`
3. The YAML syntax is valid

## Monitoring

You can monitor the cron job execution:

1. **GitHub Actions**: Check the Actions tab for workflow runs and their status
2. **Vercel Logs**: Check the Functions logs in your Vercel dashboard to see API calls
3. **Email Notifications**: GitHub will email you if a workflow fails

## Need Help?

If you encounter issues:
1. Check the GitHub Actions workflow run logs
2. Check Vercel function logs
3. Test the API endpoint directly with curl
4. Review the detailed documentation in `RECURRING_TRANSACTIONS.md`

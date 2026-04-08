# Cakto Webhook — Deploy Instructions

## 1. Run the SQL migration
Open Supabase → SQL Editor and run:
```
database/migration_cakto.sql
```

## 2. Install Supabase CLI (if not already)
```bash
npm install -g supabase
```

## 3. Link the project
```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

## 4. Deploy the Edge Function
```bash
supabase functions deploy cakto-webhook --no-verify-jwt
```
`--no-verify-jwt` is required because Cakto calls this endpoint unauthenticated.

## 5. Set the webhook secret env var
```bash
supabase secrets set CAKTO_WEBHOOK_SECRET=<your_secret_here>
```

## 6. Configure Cakto
In Cakto dashboard → Webhooks, add:
- URL: `https://<project-ref>.supabase.co/functions/v1/cakto-webhook`
- Secret: same value as CAKTO_WEBHOOK_SECRET
- Events: purchase_approved, subscription_created, subscription_renewed,
          subscription_canceled, refund, chargeback,
          subscription_overdue, payment_overdue, dunning_started

## Testing locally
```bash
supabase functions serve cakto-webhook --env-file .env.local
```
Then POST to `http://localhost:54321/functions/v1/cakto-webhook`.

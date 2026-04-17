// LAB11 — Cakto Webhook Handler (Supabase Edge Function / Deno)
// Deploy: supabase functions deploy cakto-webhook
// Webhook URL: https://<project>.supabase.co/functions/v1/cakto-webhook
//
// Required env var in Supabase dashboard (Settings → Edge Functions):
//   CAKTO_WEBHOOK_SECRET  — the secret configured in Cakto's webhook settings

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRANT_EVENTS  = ['purchase_approved', 'subscription_created', 'subscription_renewed']
const REVOKE_EVENTS = ['subscription_canceled', 'refund', 'chargeback']
const OVERDUE_EVENTS = ['subscription_overdue', 'payment_overdue', 'dunning_started']

// Maps Cakto event → subscription_status value stored on the profile
const EVENT_STATUS: Record<string, string> = {
  purchase_approved:    'active',
  subscription_created: 'active',
  subscription_renewed: 'active',
  subscription_canceled:'canceled',
  refund:               'refunded',
  chargeback:           'chargeback',
  subscription_overdue: 'overdue',
  payment_overdue:      'overdue',
  dunning_started:      'overdue',
}

interface CaktoPayload {
  event: string
  secret?: string
  data: {
    customer?: { email: string; name: string }
    // Some Cakto payloads send customer fields at data root level
    email?: string
    name?: string
    subscription?: { id: string }
    transaction?:  { id: string }
    product?:      { id: string; name?: string }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let payload: CaktoPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  // Validate Cakto secret — check body field first (Cakto sends it in JSON), then headers as fallback
  const secret = payload.secret ?? req.headers.get('x-cakto-secret') ?? req.headers.get('authorization')
  const expectedSecret = Deno.env.get('CAKTO_WEBHOOK_SECRET')
  if (expectedSecret && secret !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { event, data } = payload
  // Cakto may send customer info nested or at data root level
  const email = data.customer?.email ?? data.email
  const name  = data.customer?.name  ?? data.name ?? ''
  if (!email) {
    return json({ error: 'Missing customer email' }, 400)
  }
  const caktoSubscriptionId = data.subscription?.id
  const caktoTransactionId  = data.transaction?.id
  const subscriptionStatus  = EVENT_STATUS[event] ?? 'unknown'

  // Audit log — always record every event
  const { data: logRow } = await supabase
    .from('cakto_webhook_events')
    .insert({ event_type: event, customer_email: email, payload, processed: false })
    .select('id')
    .single()

  const logId: string | undefined = logRow?.id

  try {
    if (GRANT_EVENTS.includes(event)) {
      await grantAccess({ supabase, email, name, caktoSubscriptionId, caktoTransactionId, subscriptionStatus })
    } else if (REVOKE_EVENTS.includes(event)) {
      await revokeAccess({ supabase, email, subscriptionStatus })
    } else if (OVERDUE_EVENTS.includes(event)) {
      await markOverdue({ supabase, email, subscriptionStatus })
    }
    // Unknown events are logged but otherwise ignored (return 200 to avoid Cakto retries)

    if (logId) {
      await supabase
        .from('cakto_webhook_events')
        .update({ processed: true })
        .eq('id', logId)
    }

    return json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cakto-webhook] Error:', message)

    if (logId) {
      await supabase
        .from('cakto_webhook_events')
        .update({ processed: false, error_message: message })
        .eq('id', logId)
    }

    return json({ error: message }, 500)
  }
})

// ---------------------------------------------------------------------------

async function grantAccess({ supabase, email, name, caktoSubscriptionId, caktoTransactionId, subscriptionStatus }: {
  supabase: ReturnType<typeof createClient>
  email: string
  name: string
  caktoSubscriptionId?: string
  caktoTransactionId?: string
  subscriptionStatus: string
}) {
  const now = new Date().toISOString()

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    // Reactivate existing user — clear any grace period expiration
    await supabase
      .from('profiles')
      .update({ is_active: true, subscription_status: subscriptionStatus, subscription_updated_at: now, access_expires_at: null })
      .eq('id', existing.id)

    console.log(`[grantAccess] Reactivated existing user: ${email} → status=${subscriptionStatus}`)
  } else {
    // New purchase — create user with default password (user must change on first login)
    const { data: invited, error: inviteError } = await supabase.auth.admin.createUser({
      email,
      password: 'poker2026',
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (inviteError || !invited?.user) {
      throw new Error(`Erro ao criar usuário: ${inviteError?.message ?? 'unknown'}`)
    }

    // Use upsert because the handle_new_user trigger may have already created
    // the profile row when createUser inserted into auth.users
    await supabase.from('profiles').upsert({
      id:                    invited.user.id,
      email,
      full_name:             name,
      is_active:             true,
      is_admin:              false,
      must_change_password:  true,
      subscription_status:   subscriptionStatus,
      subscription_updated_at: now,
    }, { onConflict: 'id' })

    console.log(`[grantAccess] New user created and invited: ${email} → status=${subscriptionStatus}`)
  }

  if (caktoSubscriptionId || caktoTransactionId) {
    console.log(`[grantAccess] subscription=${caktoSubscriptionId} transaction=${caktoTransactionId}`)
  }
}

async function revokeAccess({ supabase, email, subscriptionStatus }: {
  supabase: ReturnType<typeof createClient>
  email: string
  subscriptionStatus: string
}) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, subscription_status: subscriptionStatus, subscription_updated_at: now })
    .eq('email', email)

  if (error) throw new Error(`Erro ao revogar acesso: ${error.message}`)

  console.log(`[revokeAccess] Access revoked for: ${email} → status=${subscriptionStatus}`)
}

async function markOverdue({ supabase, email, subscriptionStatus }: {
  supabase: ReturnType<typeof createClient>
  email: string
  subscriptionStatus: string
}) {
  // Overdue: keep is_active = true but set access_expires_at = now + 3 days (grace period)
  // After 3 days, the client-side check will auto-block the user on next login/session restore
  const now = new Date()
  const gracePeriodEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 days

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscriptionStatus,
      subscription_updated_at: now.toISOString(),
      access_expires_at: gracePeriodEnd.toISOString(),
    })
    .eq('email', email)

  if (error) throw new Error(`Erro ao marcar inadimplência: ${error.message}`)

  console.log(`[markOverdue] Overdue flagged for: ${email} → status=${subscriptionStatus}, grace until ${gracePeriodEnd.toISOString()}`)
}

// ---------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

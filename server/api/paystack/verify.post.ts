import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type VerifyBody = {
  reference: string
}

type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: {
    id: number
    status: string
    reference: string
    amount: number
    currency: string
    paid_at?: string
    channel?: string
    customer?: {
      email?: string
    }
  }
}

function generateClaimCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = (await readBody<VerifyBody>(event)) || ({} as any)
  const reference = String((body as any)?.reference || '').trim()

  if (!reference) {
    throw createError({ statusCode: 400, statusMessage: 'reference is required' })
  }

  const paystackSecret = config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY
  if (!paystackSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Paystack secret key not configured' })
  }

  const supabaseUrl =
    ((config.public as any)?.supabase?.url as string | undefined) ||
    (process.env.SUPABASE_URL as string | undefined)

  const serviceRoleKey =
    (config.supabaseServiceRoleKey as string | undefined) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined)

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Server not configured' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as ReturnType<typeof createClient<Database>>

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${paystackSecret}`
    }
  })

  const verifyJson = (await verifyRes.json()) as PaystackVerifyResponse

  if (!verifyRes.ok || !verifyJson.status) {
    throw createError({
      statusCode: 400,
      statusMessage: verifyJson.message || 'Failed to verify transaction'
    })
  }

  const tx = verifyJson.data
  if (!tx?.reference) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Paystack verify response' })
  }

  const { data: orderRow, error: orderErr } = await (admin as any)
    .from('orders')
    .select('id, status, total_amount, delivery_method, confirmation_code, metadata')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (orderErr) {
    throw createError({ statusCode: 500, statusMessage: orderErr.message })
  }

  if (!orderRow) {
    return {
      ok: false,
      verified: tx.status === 'success',
      reason: 'Order not found for reference'
    }
  }

  if (String(orderRow.status) === 'paid') {
    return { ok: true, verified: true, order_id: orderRow.id }
  }

  const isSuccess = String(tx.status) === 'success'
  if (!isSuccess) {
    return { ok: true, verified: false, order_id: orderRow.id, status: tx.status }
  }

  const amountNaira = Number(tx.amount || 0) / 100
  const expected = Number(orderRow.total_amount || 0)
  if (Number.isFinite(expected) && expected > 0 && Math.abs(amountNaira - expected) > 0.01) {
    return {
      ok: false,
      verified: false,
      order_id: orderRow.id,
      reason: 'Amount mismatch'
    }
  }

  const isPickup = String(orderRow.delivery_method) === 'pickup'
  const claimCode = isPickup ? (orderRow.confirmation_code || generateClaimCode()) : null
  const qrPayload =
    isPickup && claimCode ? JSON.stringify({ order_id: orderRow.id, claim_code: claimCode }) : null

  const mergedMetadata = {
    ...(orderRow.metadata || {}),
    payment_channel: tx.channel,
    customer_email: tx.customer?.email,
    currency: tx.currency,
    ...(isPickup && claimCode ? { pickup_claim_qr: qrPayload } : {})
  }

  const { error: updateErr } = await (admin as any)
    .from('orders')
    .update({
      status: 'paid',
      paystack_transaction_id: String(tx.id),
      paid_at: tx.paid_at || new Date().toISOString(),
      confirmation_code: isPickup ? claimCode : undefined,
      metadata: mergedMetadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderRow.id)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  return { ok: true, verified: true, order_id: orderRow.id }
})

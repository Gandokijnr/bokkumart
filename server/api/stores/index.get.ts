import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabaseUrl = ((config.public as any)?.supabase?.url as string | undefined) || process.env.SUPABASE_URL
  const serviceRoleKey = (config.supabaseServiceRoleKey as string | undefined) || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured'
    })
  }

  // Use service role to bypass RLS
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as ReturnType<typeof createClient<Database>>

  try {
    const { data, error } = await (admin as any)
      .from('stores')
      .select('id, name, code, address, city, latitude, longitude, phone, base_delivery_fee, is_flagship, is_active, operating_hours, pickup_instructions')
      .eq('is_active', true)
      .order('is_flagship', { ascending: false })
      .order('name')

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch stores: ${error.message}`
      })
    }

    return {
      success: true,
      stores: data || []
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to fetch stores'
    })
  }
})

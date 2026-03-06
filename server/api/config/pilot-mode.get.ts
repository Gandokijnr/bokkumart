import { defineEventHandler, createError } from 'h3'

interface PilotModeResponse {
  enabled: boolean;
  pilotBranchId: string | null;
  pilotBranchName: string | null;
  effectiveStoreIds: string[];
  isScoped: boolean;
}

export default defineEventHandler(async (event): Promise<PilotModeResponse> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const config = useRuntimeConfig()

    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceRoleKey as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Find the pilot branch
    const { data: pilotStore, error } = await supabase
      .from('stores')
      .select('id, name, is_pilot_branch, pilot_mode_enabled')
      .eq('is_pilot_branch', true)
      .eq('pilot_mode_enabled', true)
      .eq('is_active', true)
      .single()

    if (error || !pilotStore) {
      // No pilot mode configured - return all active stores
      const { data: allStores } = await supabase
        .from('stores')
        .select('id')
        .eq('is_active', true)

      return {
        enabled: false,
        pilotBranchId: null,
        pilotBranchName: null,
        effectiveStoreIds: (allStores || []).map(s => s.id),
        isScoped: false
      }
    }

    // Pilot mode is enabled - return only pilot branch
    return {
      enabled: true,
      pilotBranchId: pilotStore.id,
      pilotBranchName: pilotStore.name,
      effectiveStoreIds: [pilotStore.id],
      isScoped: true
    }
  } catch (err: any) {
    console.error('Error checking pilot mode:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to check pilot mode'
    })
  }
})

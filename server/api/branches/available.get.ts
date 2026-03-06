import { defineEventHandler, createError } from 'h3'

interface BranchInfo {
  id: string
  name: string
  code: string
  address: string
  city: string
  phone: string | null
  email: string | null
  is_active: boolean
  is_pilot_branch: boolean
  distance_km?: number
}

interface AvailableBranchesResponse {
  branches: BranchInfo[]
  pilot_mode_enabled: boolean
  pilot_branch_id: string | null
}

export default defineEventHandler(async (event): Promise<AvailableBranchesResponse> => {
  try {
    const query = getQuery(event)
    const { lat, lng } = query

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

    // Check pilot mode first
    const { data: pilotStore } = await supabase
      .from('stores')
      .select('id, name, is_pilot_branch, pilot_mode_enabled')
      .eq('is_pilot_branch', true)
      .eq('pilot_mode_enabled', true)
      .eq('is_active', true)
      .single()

    // If pilot mode is enabled, only return the pilot branch
    if (pilotStore?.pilot_mode_enabled) {
      const { data: branch } = await supabase
        .from('stores')
        .select('id, name, code, address, city, phone, email, is_active, is_pilot_branch, latitude, longitude')
        .eq('id', pilotStore.id)
        .single()

      if (branch) {
        const result: BranchInfo = {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          city: branch.city,
          phone: branch.phone,
          email: branch.email,
          is_active: branch.is_active,
          is_pilot_branch: branch.is_pilot_branch
        }

        // Calculate distance if lat/lng provided
        if (lat && lng && branch.latitude && branch.longitude) {
          result.distance_km = calculateDistance(
            parseFloat(lat as string),
            parseFloat(lng as string),
            branch.latitude,
            branch.longitude
          )
        }

        return {
          branches: [result],
          pilot_mode_enabled: true,
          pilot_branch_id: pilotStore.id
        }
      }
    }

    // Return all active branches
    const { data: branches, error } = await supabase
      .from('stores')
      .select('id, name, code, address, city, phone, email, is_active, is_pilot_branch, latitude, longitude')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch branches'
      })
    }

    const results: BranchInfo[] = (branches || []).map(branch => {
      const result: BranchInfo = {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        phone: branch.phone,
        email: branch.email,
        is_active: branch.is_active,
        is_pilot_branch: branch.is_pilot_branch
      }

      // Calculate distance if lat/lng provided
      if (lat && lng && branch.latitude && branch.longitude) {
        result.distance_km = calculateDistance(
          parseFloat(lat as string),
          parseFloat(lng as string),
          branch.latitude,
          branch.longitude
        )
      }

      return result
    })

    // Sort by distance if location provided
    if (lat && lng) {
      results.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
    }

    return {
      branches: results,
      pilot_mode_enabled: false,
      pilot_branch_id: null
    }
  } catch (err: any) {
    console.error('Error fetching available branches:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch branches'
    })
  }
})

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10 // Round to 1 decimal place
}

function getQuery(event: any) {
  return event.context?.params || {}
}

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div class="mb-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Drivers</h1>
            <p class="mt-1 text-sm text-gray-600">Monitor available/on_delivery/offline drivers and active deliveries.</p>
          </div>

          <button
            type="button"
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            :disabled="loading"
            @click="refresh"
          >
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div v-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ error }}
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-900">Available</p>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ counts.available }}</p>
          <p class="mt-1 text-xs text-gray-500">Available for dispatch when idle.</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-900">On Delivery</p>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ counts.on_delivery }}</p>
          <p class="mt-1 text-xs text-gray-500">Currently handling deliveries.</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-900">Offline</p>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ counts.offline }}</p>
          <p class="mt-1 text-xs text-gray-500">Not available.</p>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900">Driver Roster</p>
            <p class="mt-1 text-xs text-gray-500">Realtime updates as drivers go available/on_delivery/offline.</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <select v-model="filter" class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="on_delivery">On Delivery</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div
            v-for="d in filteredDrivers"
            :key="d.id"
            class="rounded-2xl border border-gray-200 bg-white p-4"
            :class="d.driver_status === 'available' ? 'border-emerald-200 bg-emerald-50' : d.driver_status === 'on_delivery' ? 'border-amber-200 bg-amber-50' : ''"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-gray-900">{{ d.full_name || 'Driver' }}</p>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="d.driver_status === 'available' ? 'bg-emerald-200 text-emerald-900' : d.driver_status === 'on_delivery' ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-700'"
                  >
                    {{ d.driver_status }}
                  </span>
                </div>

                <p class="mt-1 text-xs text-gray-600">{{ d.phone_number || 'No phone number' }}</p>

                <div class="mt-3 grid gap-2 sm:grid-cols-3">
                  <div class="rounded-xl bg-white/60 p-3">
                    <p class="text-[11px] font-semibold text-gray-600">Active</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">{{ d.active_count }}</p>
                  </div>
                  <div class="rounded-xl bg-white/60 p-3">
                    <p class="text-[11px] font-semibold text-gray-600">Assigned</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">{{ d.assigned_count }}</p>
                  </div>
                  <div class="rounded-xl bg-white/60 p-3">
                    <p class="text-[11px] font-semibold text-gray-600">Delivered Today</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">{{ d.delivered_today }}</p>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 sm:justify-end">
                <a
                  v-if="d.phone_number"
                  :href="`tel:${d.phone_number}`"
                  class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Call
                </a>
                <a
                  v-if="d.phone_number"
                  :href="getWhatsAppUrl(d.phone_number)"
                  target="_blank"
                  rel="noreferrer"
                  class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div v-if="!loading && drivers.length === 0" class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            No drivers found.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Database } from '~/types/database.types'

useHead({ title: 'Drivers - HomeAffairs' })

definePageMeta({
  layout: 'admin',
  middleware: ['staff']
})

type DriverStatus = 'available' | 'offline' | 'on_delivery'

type DriverCard = {
  id: string
  full_name: string | null
  phone_number: string | null
  driver_status: DriverStatus
  active_count: number
  assigned_count: number
  delivered_today: number
}

const supabase = useSupabaseClient<Database>()

const loading = ref(false)
const error = ref<string | null>(null)
const filter = ref<'all' | DriverStatus>('all')

const drivers = ref<DriverCard[]>([])

let driversChannel: any = null

const counts = computed(() => {
  const result = { available: 0, on_delivery: 0, offline: 0 }
  for (const d of drivers.value) {
    if (d.driver_status === 'available') result.available++
    else if (d.driver_status === 'on_delivery') result.on_delivery++
    else result.offline++
  }
  return result
})

const filteredDrivers = computed(() => {
  if (filter.value === 'all') return drivers.value
  return drivers.value.filter(d => d.driver_status === filter.value)
})

const getWhatsAppUrl = (phone: string) => {
  const normalized = phone.replace(/[^\d+]/g, '')
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  return `https://wa.me/${digits}`
}

const refresh = async () => {
  loading.value = true
  error.value = null

  try {
    const { data: driverRows, error: driverError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, driver_status, role')
      .eq('role', 'driver')
      .order('updated_at', { ascending: false })

    if (driverError) throw driverError

    const ids = (driverRows || []).map((d: any) => d.id)

    let activeMap = new Map<string, number>()
    let assignedMap = new Map<string, number>()
    let deliveredTodayMap = new Map<string, number>()

    if (ids.length > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('driver_id, status, delivered_at')
        .in('driver_id', ids)

      if (ordersError) throw ordersError

      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      const end = start + 24 * 60 * 60 * 1000

      for (const o of (orders || []) as any[]) {
        const driverId = o.driver_id
        if (!driverId) continue

        if (['assigned', 'picked_up', 'arrived'].includes(o.status)) {
          activeMap.set(driverId, (activeMap.get(driverId) || 0) + 1)
        }

        if (o.status === 'assigned') {
          assignedMap.set(driverId, (assignedMap.get(driverId) || 0) + 1)
        }

        if (o.status === 'delivered' && o.delivered_at) {
          const t = new Date(o.delivered_at).getTime()
          if (t >= start && t < end) {
            deliveredTodayMap.set(driverId, (deliveredTodayMap.get(driverId) || 0) + 1)
          }
        }
      }
    }

    drivers.value = (driverRows || []).map((d: any) => ({
      id: d.id,
      full_name: d.full_name,
      phone_number: d.phone_number,
      driver_status: (d.driver_status || 'offline') as DriverStatus,
      active_count: activeMap.get(d.id) || 0,
      assigned_count: assignedMap.get(d.id) || 0,
      delivered_today: deliveredTodayMap.get(d.id) || 0
    }))
  } catch (e: any) {
    error.value = e?.message || 'Failed to load drivers dashboard'
  } finally {
    loading.value = false
  }
}

const setupRealtime = () => {
  driversChannel = supabase
    .channel('drivers-dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async (payload: any) => {
      if ((payload?.new as any)?.role === 'driver' || (payload?.old as any)?.role === 'driver') {
        await refresh()
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
      await refresh()
    })
    .subscribe()
}

onMounted(async () => {
  await refresh()
  setupRealtime()
})

onUnmounted(() => {
  if (driversChannel) supabase.removeChannel(driversChannel)
})
</script>

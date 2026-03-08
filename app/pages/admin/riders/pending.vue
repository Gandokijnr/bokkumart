<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

useHead({ title: "Pending Riders - HomeAffairs" });

const loading = ref(false);
const error = ref<string | null>(null);
const riders = ref<any[]>([]);
const branches = ref<Record<string, { name: string; city: string }>>({});
const rejectingId = ref<string | null>(null);
const rejectionReason = ref("");

const pendingCount = computed(() => riders.value.length);

async function fetchBranches() {
  const supabase = useSupabaseClient();
  const { data } = await supabase
    .from("stores")
    .select("id, name, city")
    .eq("is_active", true);
  if (data) {
    branches.value = data.reduce(
      (acc, b) => {
        acc[b.id] = { name: b.name, city: b.city };
        return acc;
      },
      {} as Record<string, { name: string; city: string }>,
    );
  }
}

async function fetchPending() {
  loading.value = true;
  error.value = null;

  try {
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired");

    const res = await $fetch<{ riders: any[] }>("/api/admin/riders/pending", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    riders.value = (res?.riders || []) as any[];
  } catch (e: any) {
    error.value =
      e?.statusMessage || e?.message || "Failed to fetch pending riders";
  } finally {
    loading.value = false;
  }
}

function getBranchNames(branchIds: string[]): string {
  if (!branchIds || branchIds.length === 0) return "Not specified";
  return branchIds
    .map((id) => {
      const b = branches.value[id];
      return b ? `${b.name} (${b.city})` : "Unknown";
    })
    .join(", ");
}

async function approve(row: any) {
  const toast = useToast();
  try {
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired");

    await $fetch("/api/admin/riders/approve", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { applicationId: row.id },
    });

    toast.add({
      title: "Approved",
      description: "Rider approved and promoted to driver.",
      color: "success",
    } as any);

    await fetchPending();
  } catch (e: any) {
    toast.add({
      title: "Approve failed",
      description: e?.statusMessage || e?.message || "Failed to approve rider",
      color: "error",
    } as any);
  }
}

async function reject(row: any) {
  const toast = useToast();
  try {
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired");

    await $fetch("/api/admin/riders/reject", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        applicationId: row.id,
        reason: rejectionReason.value,
      },
    });

    toast.add({
      title: "Rejected",
      description: "Rider application rejected.",
      color: "success",
    } as any);

    rejectingId.value = null;
    rejectionReason.value = "";
    await fetchPending();
  } catch (e: any) {
    toast.add({
      title: "Reject failed",
      description: e?.statusMessage || e?.message || "Failed to reject rider",
      color: "error",
    } as any);
  }
}

function startReject(row: any) {
  rejectingId.value = row.id;
  rejectionReason.value = "";
}

function cancelReject() {
  rejectingId.value = null;
  rejectionReason.value = "";
}

onMounted(async () => {
  await fetchBranches();
  await fetchPending();
});
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Pending Riders</h1>
        <p class="text-sm text-slate-500">
          Pending applications: {{ pendingCount }}
        </p>
      </div>
      <button
        @click="fetchPending"
        class="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
      >
        Refresh
      </button>
    </div>

    <div v-if="loading" class="text-slate-600">Loading...</div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>

    <div v-else class="space-y-4">
      <div
        v-for="row in riders"
        :key="row.id"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="font-semibold text-slate-900">
              {{ row.personal?.full_name || row.user_id }}
              <span class="ml-2 text-xs text-slate-500"
                >({{ row.status }})</span
              >
            </div>
            <div class="text-sm text-slate-600">
              Phone: {{ row.personal?.phone_number || "-" }}
            </div>
            <div class="text-xs text-slate-500 mt-1">
              Submitted: {{ new Date(row.created_at).toLocaleString() }}
            </div>

            <div class="mt-3 text-sm text-slate-700">
              Vehicle: {{ row.vehicle?.vehicle_type || "-" }} | Plate:
              {{ row.vehicle?.plate_number || "-" }}
            </div>

            <div class="mt-2 text-sm text-slate-700">
              Payout: {{ row.payout?.account_name || "-" }} ({{
                row.payout?.account_number || "-"
              }})
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <a
                v-if="row.documents?.id_card_url"
                :href="row.documents.id_card_url"
                target="_blank"
                rel="noreferrer"
                class="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm hover:bg-slate-200"
              >
                View ID Card
              </a>

              <a
                v-if="row.documents?.vehicle_registration_url"
                :href="row.documents.vehicle_registration_url"
                target="_blank"
                rel="noreferrer"
                class="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm hover:bg-slate-200"
              >
                View Vehicle Registration
              </a>
            </div>
          </div>

          <div class="w-full max-w-xs">
            <button
              @click="approve(row)"
              class="w-full px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        </div>
      </div>

      <div v-if="riders.length === 0" class="text-slate-600">
        No pending rider applications.
      </div>
    </div>
  </div>
</template>

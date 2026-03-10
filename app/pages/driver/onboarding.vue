<script setup lang="ts">
import { computed, ref } from "vue";
import { getSafeErrorMessage } from "~/utils/errorHandler";

definePageMeta({});

useHead({ title: "Rider Onboarding - HomeAffairs" });

type StepKey = "personal" | "branches" | "vehicle" | "payout";

const stepOrder: StepKey[] = ["personal", "branches", "vehicle", "payout"];

const step = ref<StepKey>("personal");

const loading = ref(false);
const error = ref<string>("");
const success = ref(false);

const checkingSession = ref(true);
const authedUserId = ref<string | null>(null);

const supabase = useSupabaseClient();
const user = useSupabaseUser();

onMounted(async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  authedUserId.value = session?.user?.id || null;

  checkingSession.value = false;

  if (!authedUserId.value) {
    await navigateTo({
      path: "/driver/auth",
      query: { redirect: "/driver/onboarding" },
    });
  }
});

const form = ref({
  full_name: "",
  phone_number: "",
  selected_branches: [] as string[],

  vehicle_type: "motorcycle",
  plate_number: "",

  bank_code: "",
  account_number: "",
  account_name: "",
});

const idCardFile = ref<File | null>(null);
const vehicleRegFile = ref<File | null>(null);

const idCardPath = ref<string | null>(null);
const vehicleRegPath = ref<string | null>(null);

const resolvingAccount = ref(false);
const resolvedAccountName = ref<string | null>(null);

// Sync account data with form for AccountResolver component
const accountData = computed({
  get: () => ({
    bankCode: form.value.bank_code,
    accountNumber: form.value.account_number,
    accountName: form.value.account_name,
  }),
  set: (val) => {
    form.value.bank_code = val.bankCode;
    form.value.account_number = val.accountNumber;
    form.value.account_name = val.accountName;
  },
});

const bucketName = "rider-documents";

const currentStepIndex = computed(() => stepOrder.indexOf(step.value));

const canGoBack = computed(() => currentStepIndex.value > 0);
const canGoNext = computed(() => currentStepIndex.value < stepOrder.length - 1);

const normalized = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

const branches = ref<
  Array<{ id: string; name: string; address: string; city: string }>
>([]);
const branchesLoading = ref(false);

const personalValid = computed(() => {
  return (
    String(form.value.full_name).trim().length >= 3 &&
    String(form.value.phone_number).trim().length >= 8
  );
});

const branchesValid = computed(() => {
  return form.value.selected_branches.length > 0;
});

const vehicleValid = computed(() => {
  const hasVehicleType = String(form.value.vehicle_type).trim().length > 0;
  const hasIdCard = !!idCardPath.value;
  const hasVehicleReg = !!vehicleRegPath.value;

  // Bicycles don't need plate numbers
  const needsPlateNumber = form.value.vehicle_type !== "bicycle";
  const hasPlateNumber = String(form.value.plate_number).trim().length >= 3;

  return (
    hasVehicleType &&
    hasIdCard &&
    hasVehicleReg &&
    (!needsPlateNumber || hasPlateNumber)
  );
});

const payoutValid = computed(() => {
  const bankOk = String(accountData.value.bankCode).trim().length > 0;
  const acctOk = String(accountData.value.accountNumber).trim().length === 10;
  const nameOk = String(accountData.value.accountName).trim().length >= 3;

  const resolvedOk =
    !resolvedAccountName.value ||
    normalized(resolvedAccountName.value) ===
      normalized(accountData.value.accountName);

  return bankOk && acctOk && nameOk && resolvedOk;
});

const canContinue = computed(() => {
  if (step.value === "personal") return personalValid.value;
  if (step.value === "branches") return branchesValid.value;
  if (step.value === "vehicle") return vehicleValid.value;
  return payoutValid.value;
});

async function uploadPrivateDoc(
  kind: "id_card" | "vehicle_registration",
  file: File,
) {
  const userId = authedUserId.value || user.value?.id;

  if (!userId) {
    throw new Error("Please sign in again to continue");
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadErr) {
    throw new Error(uploadErr.message || "Failed to upload document");
  }

  return path;
}

async function onPickIdCard(e: Event) {
  const f = (e.target as HTMLInputElement)?.files?.[0] || null;
  idCardFile.value = f;
  if (!f) return;

  error.value = "";
  loading.value = true;
  try {
    idCardPath.value = await uploadPrivateDoc("id_card", f);
  } catch (e: any) {
    // Use centralized error handler for safe, user-friendly messages
    error.value = getSafeErrorMessage(e);
    idCardPath.value = null;
  } finally {
    loading.value = false;
  }
}

async function onPickVehicleReg(e: Event) {
  const f = (e.target as HTMLInputElement)?.files?.[0] || null;
  vehicleRegFile.value = f;
  if (!f) return;

  error.value = "";
  loading.value = true;
  try {
    vehicleRegPath.value = await uploadPrivateDoc("vehicle_registration", f);
  } catch (e: any) {
    // Use centralized error handler for safe, user-friendly messages
    error.value = getSafeErrorMessage(e);
    vehicleRegPath.value = null;
  } finally {
    loading.value = false;
  }
}

async function fetchBranches() {
  branchesLoading.value = true;
  try {
    const res = await $fetch<
      | {
          branches: Array<{
            id: string;
            name: string;
            address: string;
            city: string;
          }>;
        }
      | Array<{ id: string; name: string; address: string; city: string }>
    >("/api/branches");

    branches.value = Array.isArray(res) ? res : res?.branches || [];
  } catch (e: any) {
    // Use centralized error handler for safe, user-friendly messages
    error.value = getSafeErrorMessage(e);
  } finally {
    branchesLoading.value = false;
  }
}

function toggleBranch(branchId: string) {
  const idx = form.value.selected_branches.indexOf(branchId);
  if (idx > -1) {
    form.value.selected_branches.splice(idx, 1);
  } else {
    form.value.selected_branches.push(branchId);
  }
}

function nextStep() {
  if (!canGoNext.value) return;
  if (!canContinue.value) return;
  if (step.value === "personal") {
    fetchBranches();
  }
  step.value = stepOrder[currentStepIndex.value + 1] as StepKey;
}

function prevStep() {
  if (!canGoBack.value) return;
  step.value = stepOrder[currentStepIndex.value - 1] as StepKey;
}

async function submitApplication() {
  error.value = "";
  success.value = false;

  if (
    !payoutValid.value ||
    !vehicleValid.value ||
    !branchesValid.value ||
    !personalValid.value
  ) {
    error.value = "Please complete all steps before submitting";
    return;
  }

  loading.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error("Invalid session. Please sign in again.");
    }

    const payload: any = {
      personal: {
        full_name: form.value.full_name,
        phone_number: form.value.phone_number,
      },
      branches: {
        selected_branches: form.value.selected_branches,
      },
      vehicle: {
        vehicle_type: form.value.vehicle_type,
        plate_number: form.value.plate_number,
        id_card_path: idCardPath.value,
        vehicle_registration_path: vehicleRegPath.value,
      },
      payout: {
        bank_code: accountData.value.bankCode,
        account_number: accountData.value.accountNumber,
        account_name: accountData.value.accountName,
        resolved_account_name: resolvedAccountName.value,
      },
      phone_verification: {
        status: "skipped",
      },
    };

    // Include account creation data for new users
    // Note: User is now always authenticated before reaching this page
    // Account creation happens in /driver/auth

    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/driver/onboarding/submit",
      {
        method: "POST",
        body: payload,
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res?.success) {
      throw new Error(res?.message || "Failed to submit application");
    }

    await navigateTo("/driver/thank-you", { replace: true });
  } catch (e: any) {
    // Use centralized error handler for safe, user-friendly messages
    error.value = getSafeErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto w-full max-w-2xl px-4 py-6">
      <div class="mb-5">
        <h1 class="text-2xl font-bold text-gray-900">Rider Onboarding</h1>
        <p class="mt-1 text-sm text-gray-600">
          Complete your details. The branch manager will review your documents
          before you go live.
        </p>
      </div>

      <div
        v-if="error"
        class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <div
        v-if="success"
        class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        <p class="font-semibold">Application submitted successfully!</p>
        <p class="mt-1">You'll be contacted after review.</p>
        <div class="mt-3">
          <NuxtLink
            to="/"
            class="font-semibold text-emerald-700 hover:underline"
          >
            ← Back to home
          </NuxtLink>
        </div>
      </div>

      <FormCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-gray-900">
              Step {{ currentStepIndex + 1 }} of {{ stepOrder.length }}
            </div>
            <div class="text-xs text-gray-600">
              {{
                step === "personal"
                  ? "Personal Info"
                  : step === "branches"
                    ? "Select Branches"
                    : step === "vehicle"
                      ? "Vehicle Specs"
                      : "Payout Setup"
              }}
            </div>
          </div>
        </template>

        <div
          v-if="checkingSession"
          class="py-8 text-center text-sm text-gray-500"
        >
          Checking session...
        </div>

        <div v-else-if="step === 'personal'" class="space-y-4">
          <!-- Auth guard for non-authenticated users -->
          <div
            v-if="!authedUserId"
            class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
          >
            <p class="text-sm font-semibold text-amber-900 mb-2">
              Please Sign In
            </p>
            <p class="text-xs text-amber-700 mb-3">
              You need to create an account or log in before completing your
              driver application.
            </p>
            <NuxtLink
              to="/driver/auth?redirect=/driver/onboarding"
              class="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign In / Create Account
            </NuxtLink>
          </div>

          <template v-else>
            <FormInput
              v-model="form.full_name"
              label="Full Name"
              placeholder="e.g. John Doe"
            />
            <FormInput
              v-model="form.phone_number"
              label="Phone Number"
              placeholder="e.g. 08012345678"
              inputmode="tel"
            />

            <div
              class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
            >
              Phone OTP verification is not enforced yet in this build.
            </div>
          </template>
        </div>

        <div v-else-if="step === 'branches'" class="space-y-4">
          <div
            v-if="branchesLoading"
            class="py-8 text-center text-sm text-gray-500"
          >
            Loading branches...
          </div>
          <div
            v-else-if="branches.length === 0"
            class="py-8 text-center text-sm text-gray-500"
          >
            No branches available.
          </div>
          <div v-else>
            <p class="text-sm text-gray-600 mb-3">
              Select the branches you want to operate with (at least one
              required):
            </p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="branch in branches"
                :key="branch.id"
                @click="toggleBranch(branch.id)"
                class="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                :class="
                  form.selected_branches.includes(branch.id)
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                "
              >
                <div class="flex-shrink-0 mt-0.5">
                  <div
                    class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                    :class="
                      form.selected_branches.includes(branch.id)
                        ? 'bg-red-600 border-red-600'
                        : 'border-gray-300'
                    "
                  >
                    <svg
                      v-if="form.selected_branches.includes(branch.id)"
                      class="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm text-gray-900">
                    {{ branch.name }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ branch.address }}, {{ branch.city }}
                  </p>
                </div>
              </div>
            </div>
            <p
              v-if="form.selected_branches.length > 0"
              class="mt-3 text-xs text-emerald-600"
            >
              {{ form.selected_branches.length }} branch{{
                form.selected_branches.length > 1 ? "es" : ""
              }}
              selected
            </p>
          </div>
        </div>

        <div v-else-if="step === 'vehicle'" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700"
              >Vehicle Type</label
            >
            <select
              v-model="form.vehicle_type"
              class="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition-all outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            >
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
            </select>
          </div>

          <FormInput
            v-model="form.plate_number"
            label="Plate Number"
            placeholder="e.g. ABC-1234"
          />
          <p
            v-if="
              form.vehicle_type !== 'bicycle' &&
              String(form.plate_number).trim().length < 3
            "
            class="text-xs text-red-600"
          >
            Plate number is required for this vehicle type.
          </p>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700"
              >ID Card (Upload)</label
            >
            <input
              type="file"
              accept="image/*,application/pdf"
              class="block w-full cursor-pointer rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-900 transition-all outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 file:mr-4 file:rounded-lg file:border-0 file:bg-red-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-red-700 hover:file:bg-red-100"
              @change="onPickIdCard"
            />
            <p v-if="idCardPath" class="text-xs font-medium text-emerald-700">
              Uploaded.
            </p>
            <p v-else class="text-xs text-red-600">
              ID card upload is required.
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700"
              >Vehicle Photo (Upload)</label
            >
            <input
              type="file"
              accept="image/*"
              class="block w-full cursor-pointer rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-900 transition-all outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 file:mr-4 file:rounded-lg file:border-0 file:bg-red-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-red-700 hover:file:bg-red-100"
              @change="onPickVehicleReg"
            />
            <p
              v-if="vehicleRegPath"
              class="text-xs font-medium text-emerald-700"
            >
              Uploaded.
            </p>
            <p v-else class="text-xs text-red-600">
              Vehicle photo upload is required.
            </p>
          </div>
        </div>

        <div v-else class="space-y-4">
          <AccountResolver
            v-model="accountData"
            :resolved-account-name="resolvedAccountName"
            @resolved="resolvedAccountName = $event"
            @error="error = $event"
          />
        </div>

        <template #footer>
          <div class="flex items-center justify-between gap-3">
            <FormButton
              variant="outline"
              color="neutral"
              :disabled="loading || !canGoBack"
              @click="prevStep"
            >
              Back
            </FormButton>

            <div class="flex items-center gap-2">
              <FormButton
                v-if="canGoNext"
                :disabled="loading || !canContinue"
                @click="nextStep"
              >
                Continue
              </FormButton>

              <FormButton
                v-else
                :loading="loading"
                :disabled="loading || !canContinue"
                @click="submitApplication"
              >
                Submit Application
              </FormButton>
            </div>
          </div>
        </template>
      </FormCard>
    </div>
  </div>
</template>

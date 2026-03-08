<script setup lang="ts">
import { computed, ref } from "vue";

definePageMeta({});

useHead({ title: "Rider Onboarding - HomeAffairs" });

type StepKey = "personal" | "vehicle" | "payout";

const stepOrder: StepKey[] = ["personal", "vehicle", "payout"];

const step = ref<StepKey>("personal");

const loading = ref(false);
const error = ref<string>("");
const success = ref(false);

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const form = ref({
  full_name: "",
  phone_number: "",

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

const personalValid = computed(() => {
  return (
    String(form.value.full_name).trim().length >= 3 &&
    String(form.value.phone_number).trim().length >= 8
  );
});

const vehicleValid = computed(() => {
  return (
    String(form.value.vehicle_type).trim().length > 0 &&
    String(form.value.plate_number).trim().length >= 3 &&
    !!idCardPath.value &&
    !!vehicleRegPath.value
  );
});

const payoutValid = computed(() => {
  const bankOk = String(form.value.bank_code).trim().length > 0;
  const acctOk = String(form.value.account_number).trim().length === 10;
  const nameOk = String(form.value.account_name).trim().length >= 3;

  const resolvedOk =
    !resolvedAccountName.value ||
    normalized(resolvedAccountName.value) === normalized(form.value.account_name);

  return bankOk && acctOk && nameOk && resolvedOk;
});

const canContinue = computed(() => {
  if (step.value === "personal") return personalValid.value;
  if (step.value === "vehicle") return vehicleValid.value;
  return payoutValid.value;
});

async function uploadPrivateDoc(kind: "id_card" | "vehicle_registration", file: File) {
  if (!user.value?.id) {
    throw new Error("Please sign in again to continue");
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${user.value.id}/${kind}-${Date.now()}.${ext}`;

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
    error.value = e?.message || "Failed to upload ID card";
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
    error.value = e?.message || "Failed to upload vehicle registration";
    vehicleRegPath.value = null;
  } finally {
    loading.value = false;
  }
}

async function resolveAccount() {
  error.value = "";
  resolvedAccountName.value = null;

  const bankCode = String(form.value.bank_code || "").trim();
  const accountNumber = String(form.value.account_number || "").trim();

  if (!bankCode || accountNumber.length !== 10) {
    error.value = "Enter a valid bank code and 10-digit account number";
    return;
  }

  resolvingAccount.value = true;
  try {
    const res = await $fetch<{ success: boolean; account_name?: string; message?: string }>(
      "/api/paystack/resolve-account",
      {
        method: "POST",
        body: { bank_code: bankCode, account_number: accountNumber },
      },
    );

    if (!res?.success || !res.account_name) {
      throw new Error(res?.message || "Could not resolve account");
    }

    resolvedAccountName.value = res.account_name;
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || "Failed to resolve account";
  } finally {
    resolvingAccount.value = false;
  }
}

function nextStep() {
  if (!canGoNext.value) return;
  if (!canContinue.value) return;
  step.value = stepOrder[currentStepIndex.value + 1] as StepKey;
}

function prevStep() {
  if (!canGoBack.value) return;
  step.value = stepOrder[currentStepIndex.value - 1] as StepKey;
}

async function submitApplication() {
  error.value = "";
  success.value = false;

  if (!payoutValid.value || !vehicleValid.value || !personalValid.value) {
    error.value = "Please complete all steps before submitting";
    return;
  }

  loading.value = true;
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/driver/onboarding/submit",
      {
        method: "POST",
        body: {
          personal: {
            full_name: form.value.full_name,
            phone_number: form.value.phone_number,
          },
          vehicle: {
            vehicle_type: form.value.vehicle_type,
            plate_number: form.value.plate_number,
            id_card_path: idCardPath.value,
            vehicle_registration_path: vehicleRegPath.value,
          },
          payout: {
            bank_code: form.value.bank_code,
            account_number: form.value.account_number,
            account_name: form.value.account_name,
            resolved_account_name: resolvedAccountName.value,
          },
          phone_verification: {
            status: "skipped",
          },
        },
      },
    );

    if (!res?.success) {
      throw new Error(res?.message || "Failed to submit application");
    }

    success.value = true;
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || "Failed to submit application";
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
          Complete your details. A Super Admin will review your documents before you go live.
        </p>
      </div>

      <div v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ error }}
      </div>

      <div v-if="success" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Application submitted successfully. You’ll be contacted after review.
      </div>

      <FormCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-gray-900">
              Step {{ currentStepIndex + 1 }} of {{ stepOrder.length }}
            </div>
            <div class="text-xs text-gray-600">
              {{ step === 'personal' ? 'Personal Info' : step === 'vehicle' ? 'Vehicle Specs' : 'Payout Setup' }}
            </div>
          </div>
        </template>

        <div v-if="step === 'personal'" class="space-y-4">
          <FormInput v-model="form.full_name" label="Full Name" placeholder="e.g. John Doe" />
          <FormInput v-model="form.phone_number" label="Phone Number" placeholder="e.g. 08012345678" inputmode="tel" />

          <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Phone OTP verification is not enforced yet in this build.
          </div>
        </div>

        <div v-else-if="step === 'vehicle'" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">Vehicle Type</label>
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

          <FormInput v-model="form.plate_number" label="Plate Number" placeholder="e.g. ABC-1234" />

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">ID Card (Upload)</label>
            <input type="file" accept="image/*,application/pdf" class="block w-full text-sm" @change="onPickIdCard" />
            <p v-if="idCardPath" class="text-xs text-gray-600">Uploaded.</p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Vehicle Registration (Upload)</label>
            <input type="file" accept="image/*,application/pdf" class="block w-full text-sm" @change="onPickVehicleReg" />
            <p v-if="vehicleRegPath" class="text-xs text-gray-600">Uploaded.</p>
          </div>
        </div>

        <div v-else class="space-y-4">
          <FormInput v-model="form.bank_code" label="Bank Code" placeholder="e.g. 058" inputmode="numeric" />
          <FormInput v-model="form.account_number" label="Account Number" placeholder="10-digit NUBAN" inputmode="numeric" :maxlength="10" />
          <FormInput v-model="form.account_name" label="Account Name" placeholder="e.g. JOHN DOE" />

          <div class="flex gap-2">
            <FormButton :loading="resolvingAccount" :disabled="resolvingAccount" variant="outline" @click="resolveAccount">
              Resolve Account
            </FormButton>
          </div>

          <div v-if="resolvedAccountName" class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            Resolved Name: <span class="font-semibold">{{ resolvedAccountName }}</span>
            <div
              v-if="normalized(resolvedAccountName) !== normalized(form.account_name)"
              class="mt-1 text-red-600"
            >
              Account name does not match resolved name.
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between gap-3">
            <FormButton variant="outline" color="neutral" :disabled="loading || !canGoBack" @click="prevStep">
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

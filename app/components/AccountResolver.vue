<script setup lang="ts">
const props = defineProps<{
  modelValue: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  resolvedAccountName?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: { bankCode: string; accountNumber: string; accountName: string }): void;
  (e: "resolved", accountName: string): void;
  (e: "error", message: string): void;
}>();

const isResolving = ref(false);
const error = ref("");

const bankCode = computed({
  get: () => props.modelValue.bankCode,
  set: (val) => emit("update:modelValue", { ...props.modelValue, bankCode: val }),
});

const accountNumber = computed({
  get: () => props.modelValue.accountNumber,
  set: (val) => emit("update:modelValue", { ...props.modelValue, accountNumber: val }),
});

const accountName = computed({
  get: () => props.modelValue.accountName,
  set: (val) => emit("update:modelValue", { ...props.modelValue, accountName: val }),
});

const normalized = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

const namesMatch = computed(() => {
  if (!props.resolvedAccountName || !accountName.value) return true;
  return normalized(props.resolvedAccountName) === normalized(accountName.value);
});

const canResolve = computed(() => {
  return bankCode.value && accountNumber.value.length === 10;
});

async function resolveAccount() {
  error.value = "";

  const bankCodeVal = String(bankCode.value || "").trim();
  const accountNumberVal = String(accountNumber.value || "").trim();

  if (!bankCodeVal || accountNumberVal.length !== 10) {
    error.value = "Enter a valid bank and 10-digit account number";
    emit("error", error.value);
    return;
  }

  isResolving.value = true;
  try {
    const res = await $fetch<{
      success: boolean;
      account_name?: string;
      message?: string;
    }>("/api/paystack/resolve-account", {
      method: "POST",
      body: { bank_code: bankCodeVal, account_number: accountNumberVal },
    });

    if (!res?.success || !res.account_name) {
      throw new Error(res?.message || "Could not resolve account");
    }

    // Auto-fill account name if empty
    if (!accountName.value) {
      accountName.value = res.account_name;
    }

    emit("resolved", res.account_name);
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || "Failed to resolve account";
    emit("error", error.value);
  } finally {
    isResolving.value = false;
  }
}

function clearResolved() {
  emit("resolved", "");
}

// Clear resolved when account number changes
watch(accountNumber, () => {
  if (props.resolvedAccountName) {
    clearResolved();
  }
});

// Clear resolved when bank changes
watch(bankCode, () => {
  if (props.resolvedAccountName) {
    clearResolved();
  }
});
</script>

<template>
  <div class="space-y-4">
    <BankSelector v-model="bankCode" label="Select Bank" />

    <FormInput
      v-model="accountNumber"
      label="Account Number"
      placeholder="10-digit NUBAN"
      inputmode="numeric"
      :maxlength="10"
      :disabled="disabled"
    />

    <FormInput
      v-model="accountName"
      label="Account Name"
      placeholder="e.g. JOHN DOE"
      :disabled="disabled"
    />

    <div class="flex gap-3">
      <button
        type="button"
        @click="resolveAccount"
        :disabled="isResolving || !canResolve || disabled"
        class="rounded-lg border border-red-600 px-6 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
      >
        {{ isResolving ? "Resolving..." : "Resolve Account" }}
      </button>
    </div>

    <div
      v-if="resolvedAccountName"
      class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
    >
      Resolved Name:
      <span class="font-semibold">{{ resolvedAccountName }}</span>
      <div
        v-if="!namesMatch"
        class="mt-1 text-red-600"
      >
        Account name does not match resolved name.
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>

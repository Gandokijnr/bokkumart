<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  label?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

// Popular Nigerian banks with their Paystack codes
const banks = [
  { name: "Access Bank", code: "044", nipCode: "000014" },
  { name: "Citibank Nigeria", code: "023", nipCode: "000009" },
  { name: "Ecobank Nigeria", code: "050", nipCode: "000010" },
  { name: "Fidelity Bank", code: "070", nipCode: "000007" },
  { name: "First Bank of Nigeria", code: "011", nipCode: "000016" },
  { name: "First City Monument Bank (FCMB)", code: "214", nipCode: "000003" },
  { name: "Globus Bank", code: "103", nipCode: "000027" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058", nipCode: "000013" },
  { name: "Keystone Bank", code: "082", nipCode: "000002" },
  { name: "Lotus Bank", code: "301", nipCode: "000029" },
  { name: "Moniepoint Microfinance Bank", code: "50515", nipCode: "50515" },
  { name: "OPay Digital Services (Paycom)", code: "999992", nipCode: "100004" },
  { name: "Optimus Bank", code: "107", nipCode: "000036" },
  { name: "PalmPay", code: "999991", nipCode: "100033" },
  { name: "Parallex Bank", code: "526", nipCode: "000030" },
  { name: "Polaris Bank", code: "076", nipCode: "000008" },
  { name: "Premium Trust Bank", code: "105", nipCode: "000031" },
  { name: "Providus Bank", code: "101", nipCode: "000023" },
  { name: "Signature Bank", code: "106", nipCode: "000034" },
  { name: "Stanbic IBTC Bank", code: "221", nipCode: "000012" },
  { name: "Standard Chartered Bank", code: "068", nipCode: "000021" },
  { name: "Sterling Bank", code: "232", nipCode: "000001" },
  { name: "SunTrust Bank", code: "100", nipCode: "000022" },
  { name: "Titan Trust Bank", code: "102", nipCode: "000025" },
  { name: "Union Bank of Nigeria", code: "032", nipCode: "000018" },
  { name: "United Bank for Africa (UBA)", code: "033", nipCode: "000004" },
  { name: "Unity Bank", code: "215", nipCode: "000011" },
  { name: "Wema Bank", code: "035", nipCode: "000017" },
  { name: "Zenith Bank", code: "057", nipCode: "000015" },
];

const selectedBank = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const selectedBankName = computed(() => {
  const bank = banks.find((b) => b.code === selectedBank.value);
  return bank?.name || "";
});
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    <select
      v-model="selectedBank"
      class="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition-all outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
    >
      <option value="" disabled>Select your bank</option>
      <option v-for="bank in banks" :key="bank.code" :value="bank.code">
        {{ bank.name }}
      </option>
    </select>
    <p v-if="selectedBankName" class="text-xs text-gray-500">
      Selected: {{ selectedBankName }}
    </p>
  </div>
</template>

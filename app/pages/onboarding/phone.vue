<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <FormCard class="shadow-xl border-0">
        <div class="space-y-4">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-900">Add your phone number</h1>
            <p class="text-sm text-gray-600 mt-1">
              You must provide a phone number to continue.
            </p>
          </div>

          <div
            v-if="error"
            class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {{ error }}
          </div>

          <FormInput
            v-model="phone"
            label="Phone Number"
            placeholder="e.g. 08012345678"
            type="tel"
            inputmode="tel"
            size="lg"
          />

          <FormButton
            block
            size="lg"
            :loading="saving"
            :disabled="!canSubmit"
            @click="save"
          >
            Continue
          </FormButton>
        </div>
      </FormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useUserStore } from "~/stores/user";

definePageMeta({ middleware: ["auth"] });

const route = useRoute();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userStore = useUserStore();

const phone = ref("");
const saving = ref(false);
const error = ref("");

watchEffect(() => {
  const existing = userStore.profile?.phone_number || "";
  if (!phone.value && existing) {
    phone.value = existing;
  }
});

const canSubmit = computed(() => String(phone.value || "").trim().length >= 8);

async function save() {
  error.value = "";
  const userId = user.value?.id || (user.value as any)?.sub;
  if (!userId) {
    error.value = "Please sign in again to continue";
    return;
  }

  saving.value = true;
  try {
    const { error: updateError } = await (supabase.from("profiles").update as any)({
      phone_number: String(phone.value || "").trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    await userStore.fetchProfile();

    const redirect = (route.query.redirect as string) || "/";
    await navigateTo(redirect);
  } catch (e: any) {
    error.value = e?.message || "Failed to save phone number";
  } finally {
    saving.value = false;
  }
}
</script>

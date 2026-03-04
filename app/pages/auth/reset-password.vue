<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-red-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
        >
          <svg
            class="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p class="text-gray-600 mt-1">Enter your new password</p>
      </div>

      <!-- Reset Password Card -->
      <FormCard class="shadow-xl border-0">
        <div class="space-y-4">
          <!-- Success State -->
          <div v-if="resetSuccess" class="text-center space-y-4 py-4">
            <div
              class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
            >
              <svg
                class="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                Password Updated!
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Your password has been reset successfully. You can now sign in
                with your new password.
              </p>
            </div>
            <FormButton block size="lg" @click="navigateTo('/auth')">
              Sign In
            </FormButton>
          </div>

          <!-- Error State -->
          <div v-else-if="resetError" class="text-center space-y-4 py-4">
            <div
              class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto"
            >
              <svg
                class="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Reset Failed</h3>
              <p class="text-sm text-gray-600 mt-1">{{ resetError }}</p>
            </div>
            <FormButton block size="lg" @click="navigateTo('/auth')">
              Back to Sign In
            </FormButton>
          </div>

          <!-- Reset Form -->
          <div v-else class="space-y-4">
            <FormInput
              v-model="newPassword"
              type="password"
              label="New Password"
              placeholder="Enter new password"
              size="lg"
            >
              <template #leading>
                <svg
                  class="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </template>
            </FormInput>

            <FormInput
              v-model="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm new password"
              size="lg"
            >
              <template #leading>
                <svg
                  class="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </template>
            </FormInput>

            <!-- Password Strength -->
            <div v-if="newPassword" class="space-y-2">
              <div class="flex gap-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1 flex-1 rounded-full"
                  :class="
                    passwordStrength >= i ? 'bg-green-500' : 'bg-gray-200'
                  "
                ></div>
              </div>
              <p class="text-xs text-gray-500">
                Password strength: {{ passwordStrengthLabel }}
              </p>
            </div>

            <p v-if="passwordMismatch" class="text-sm text-red-600">
              Passwords do not match
            </p>

            <FormButton
              block
              size="lg"
              :loading="loading"
              :disabled="!canSubmit"
              @click="updatePassword"
            >
              Update Password
            </FormButton>
          </div>
        </div>
      </FormCard>

      <!-- Notification -->
      <FormNotification
        v-if="notification.show"
        :show="notification.show"
        :title="notification.title"
        :description="notification.description"
        :color="notification.color"
        @close="notification.show = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

type NotificationType = {
  show: boolean;
  title: string;
  description: string;
  color: "green" | "red" | "blue";
};

const loading = ref(false);
const newPassword = ref("");
const confirmPassword = ref("");
const resetSuccess = ref(false);
const resetError = ref("");
const notification = ref<NotificationType>({
  show: false,
  title: "",
  description: "",
  color: "green",
});

const supabase = useSupabaseClient();

// Password validation
const passwordStrength = computed(() => {
  const pwd = newPassword.value;
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
  if (/\d/.test(pwd)) strength++;
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
  return strength;
});

const passwordStrengthLabel = computed(() => {
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return labels[passwordStrength.value - 1] || "Weak";
});

const passwordMismatch = computed(() => {
  return confirmPassword.value && newPassword.value !== confirmPassword.value;
});

const canSubmit = computed(() => {
  return (
    newPassword.value.length >= 8 && newPassword.value === confirmPassword.value
  );
});

// Show notification
const showNotification = (
  title: string,
  description: string,
  color: "green" | "red" | "blue" = "green",
) => {
  notification.value = { show: true, title, description, color };
  setTimeout(() => {
    notification.value.show = false;
  }, 5000);
};

// Update password
const updatePassword = async () => {
  loading.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    if (error) throw error;

    resetSuccess.value = true;
  } catch (error: any) {
    showNotification(
      "Error",
      error.message || "Failed to update password.",
      "red",
    );
  } finally {
    loading.value = false;
  }
};

// Check for valid recovery session on mount
onMounted(async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    // User may have clicked the link from email - check for recovery token
    const { data, error: recoveryError } = await supabase.auth.getUser();

    if (recoveryError || !data.user) {
      resetError.value =
        "This password reset link is invalid or has expired. Please request a new one.";
    }
  }
});
</script>

<script setup lang="ts">
import { ref, computed } from "vue";

definePageMeta({
  layout: "default",
});

const router = useRouter();
const route = useRoute();
const supabase = useSupabaseClient();
const toast = useToast();

// Tab state: 'signup' or 'login'
const activeTab = ref<"signup" | "login">("signup");

// Form state
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");

// Check if user is already authenticated
const user = useSupabaseUser();
const checkingSession = ref(true);

// Check session on mount
onMounted(async () => {
  // First check if there's already a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id) {
    // User is logged in, redirect immediately
    const redirect = route.query.redirect as string;
    await navigateTo(redirect || "/driver/onboarding", { replace: true });
    return;
  }

  // No session, show the auth form
  checkingSession.value = false;
});

// Watch for auth state changes (in case user logs in elsewhere)
watch(
  user,
  async (newUser) => {
    if (newUser?.id) {
      const redirect = route.query.redirect as string;
      await navigateTo(redirect || "/driver/onboarding", { replace: true });
    }
  },
  { immediate: false },
);

const emailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value),
);
const passwordValid = computed(() => password.value.length >= 6);
const canSubmit = computed(() => {
  if (!emailValid.value || !passwordValid.value) return false;
  if (
    activeTab.value === "signup" &&
    password.value !== confirmPassword.value
  ) {
    return false;
  }
  return true;
});

async function handleSubmit() {
  error.value = "";
  loading.value = true;

  try {
    if (activeTab.value === "signup") {
      // Sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });

      if (signUpError) {
        // If user already exists, suggest login
        if (signUpError.message?.toLowerCase().includes("already")) {
          error.value =
            "An account with this email already exists. Please log in.";
          activeTab.value = "login";
          return;
        }
        throw new Error(signUpError.message);
      }

      if (data?.user) {
        toast.add({
          title: "Account Created",
          description: "Welcome! Redirecting you to the application form...",
          color: "success",
        });
        // Wait for session to fully establish, then redirect
        await new Promise((r) => setTimeout(r, 500));
        const redirect = route.query.redirect as string;
        await navigateTo(redirect || "/driver/onboarding", {
          replace: true,
          external: false,
        });
      }
    } else {
      // Login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      toast.add({
        title: "Welcome Back",
        description: "Redirecting you to the application form...",
        color: "success",
      });
      // Wait for session to fully establish, then redirect
      await new Promise((r) => setTimeout(r, 500));
      const redirect = route.query.redirect as string;
      await navigateTo(redirect || "/driver/onboarding", {
        replace: true,
        external: false,
      });
    }
  } catch (e: any) {
    error.value = e?.message || "Something went wrong. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12"
  >
    <div class="w-full max-w-md">
      <!-- Loading State -->
      <div v-if="checkingSession" class="text-center py-12">
        <svg
          class="w-8 h-8 animate-spin mx-auto text-red-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p class="text-gray-600">Checking session...</p>
      </div>

      <!-- Auth Form -->
      <template v-else>
        <!-- Header -->
        <div class="text-center mb-8">
          <div
            class="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4"
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Become a Driver</h1>
          <p class="mt-2 text-sm text-gray-600">
            Create an account or log in to start your driver application
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ error }}
        </div>

        <!-- Tabs -->
        <div
          class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div class="flex border-b border-gray-200">
            <button
              @click="activeTab = 'signup'"
              :class="[
                'flex-1 py-4 text-sm font-medium transition-colors',
                activeTab === 'signup'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50'
                  : 'text-gray-500 hover:text-gray-700',
              ]"
            >
              Create Account
            </button>
            <button
              @click="activeTab = 'login'"
              :class="[
                'flex-1 py-4 text-sm font-medium transition-colors',
                activeTab === 'login'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50'
                  : 'text-gray-500 hover:text-gray-700',
              ]"
            >
              Log In
            </button>
          </div>

          <!-- Form -->
          <div class="p-6 space-y-4">
            <FormInput
              v-model="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              :error="email && !emailValid ? 'Please enter a valid email' : ''"
            />
            <FormInput
              v-model="password"
              label="Password"
              type="password"
              placeholder="Min 6 characters"
              :error="
                password && !passwordValid
                  ? 'Password must be at least 6 characters'
                  : ''
              "
            />
            <FormInput
              v-if="activeTab === 'signup'"
              v-model="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              :error="
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : ''
              "
            />

            <button
              @click="handleSubmit"
              :disabled="!canSubmit || loading"
              :class="[
                'w-full py-3 px-4 rounded-xl font-medium transition-all',
                canSubmit && !loading
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed',
              ]"
            >
              <span
                v-if="loading"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {{
                  activeTab === "signup"
                    ? "Creating Account..."
                    : "Logging In..."
                }}
              </span>
              <span v-else>{{
                activeTab === "signup"
                  ? "Create Account & Continue"
                  : "Log In & Continue"
              }}</span>
            </button>
          </div>
        </div>

        <!-- Back to home -->
        <div class="mt-6 text-center">
          <NuxtLink to="/" class="text-sm text-gray-500 hover:text-gray-700"
            >← Back to home</NuxtLink
          >
        </div>
      </template>
    </div>
  </div>
</template>

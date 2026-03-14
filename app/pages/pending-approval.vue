<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md text-center space-y-6">
      <!-- Icon -->
      <div
        class="w-20 h-20 bg-amber-100 rounded-full mx-auto flex items-center justify-center"
      >
        <svg
          class="w-10 h-10 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <!-- Message -->
      <div class="space-y-3">
        <h1 class="text-2xl font-bold text-gray-900">
          Account Pending Approval
        </h1>
        <p class="text-gray-600">
          Your account has been created successfully, but a role has not been
          assigned yet.
        </p>
        <p class="text-sm text-gray-500">
          Please contact your administrator to assign you a role. You will be
          able to access the system once your role is approved.
        </p>
      </div>

      <!-- User Info -->
      <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Email:</span>
            <span class="font-medium text-gray-900">{{ user?.email }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Status:</span>
            <span
              class="inline-flex px2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded"
            >
              Pending Role Assignment
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <button
          @click="checkStatus"
          :disabled="loading"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? "Checking..." : "Check Status" }}
        </button>

        <button
          @click="signOut"
          class="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <!-- Help Text -->
      <p class="text-xs text-gray-400">
        If you believe this is an error, please contact your system
        administrator.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "~/stores/user";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const toast = useToast();
const loading = ref(false);

const user = computed(() => userStore.user);

// Check if role has been assigned
const checkStatus = async () => {
  loading.value = true;
  try {
    await userStore.fetchProfile();

    if (userStore.profile?.role) {
      toast.add({
        title: "Role Assigned!",
        description: `You have been assigned the ${userStore.profile.role} role.`,
        color: "success",
      });

      // Redirect to appropriate dashboard
      userStore.handleRedirectAfterLogin();
    } else {
      toast.add({
        title: "Still Pending",
        description: "Your account is still awaiting role assignment.",
        color: "warning",
      });
    }
  } finally {
    loading.value = false;
  }
};

// Sign out
const signOut = async () => {
  await userStore.signOut();
  navigateTo("/auth");
};
</script>

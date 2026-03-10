<template>
  <div class="w-full">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-900">Retail Man Bulk Import</h2>
      <p class="text-sm text-gray-600 mt-1">
        Import inventory from Retail Man POS exports. Upload your CSV file with
        Part Number, Details, Retail price, and Retail Qty.
      </p>
    </div>

    <!-- Store Selection (Required) -->
    <div class="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
      <label class="block text-sm font-bold text-amber-900 mb-2">
        Target Store <span class="text-red-600">*</span>
      </label>
      <p class="text-xs text-amber-700 mb-3">
        Select the branch where this inventory will be applied. This is required
        before uploading.
      </p>

      <div v-if="storesLoading" class="text-sm text-gray-500">
        Loading stores...
      </div>

      <div v-else-if="stores.length === 0" class="text-sm text-red-600">
        No stores available. Please contact support.
      </div>

      <select
        v-else
        v-model="selectedStoreId"
        class="w-full rounded-lg border-2 border-amber-300 px-4 py-3 text-sm focus:border-red-500 focus:outline-none bg-white"
        :disabled="isUploading"
      >
        <option value="">-- Select a Store --</option>
        <option v-for="store in stores" :key="store.id" :value="store.id">
          {{ store.name }} {{ store.is_flagship ? "(Flagship)" : "" }}
        </option>
      </select>
    </div>

    <!-- File Upload Area -->
    <div
      class="relative mb-6"
      :class="{ 'drag-active': isDragging, uploading: isUploading }"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <div
        class="border-2 border-dashed rounded-xl p-8 text-center transition-all"
        :class="[
          isDragging
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 bg-gray-50',
          isUploading
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-gray-400',
        ]"
        @click="!isUploading && fileInput?.click()"
      >
        <div class="mb-4">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <p class="text-sm font-medium text-gray-900 mb-1">
          {{ isUploading ? "Uploading..." : "Drop your Retail Man CSV here" }}
        </p>
        <p class="text-xs text-gray-500 mb-3">or click to browse</p>

        <div class="text-xs text-gray-400">
          <p>
            Expected columns:
            <span class="font-mono bg-gray-200 px-1 rounded">Part Number</span>,
            <span class="font-mono bg-gray-200 px-1 rounded">Details</span>,
            <span class="font-mono bg-gray-200 px-1 rounded">Retail</span>,
            <span class="font-mono bg-gray-200 px-1 rounded">Retail Qty</span>
          </p>
        </div>

        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          :disabled="isUploading"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <!-- Selected File -->
    <div
      v-if="selectedFile && !result"
      class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <svg
          class="h-5 w-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <div>
          <p class="text-sm font-medium text-blue-900">
            {{ selectedFile.name }}
          </p>
          <p class="text-xs text-blue-600">
            {{ formatFileSize(selectedFile.size) }}
          </p>
        </div>
      </div>
      <button
        :disabled="isUploading || !selectedStoreId"
        class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        @click="startUpload"
      >
        {{ isUploading ? "Importing..." : "Start Import" }}
      </button>
    </div>

    <!-- Warning if no store selected -->
    <div
      v-if="selectedFile && !selectedStoreId && !result"
      class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg"
    >
      <p class="text-sm text-red-700 flex items-center gap-2">
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Please select a target store before uploading
      </p>
    </div>

    <!-- Progress Bar -->
    <div v-if="isUploading" class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">Importing...</span>
        <span class="text-sm text-gray-500">{{ progress.percentage }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          class="h-full rounded-full bg-red-600 transition-all duration-300"
          :style="{ width: `${progress.percentage}%` }"
        ></div>
      </div>
      <p v-if="progress.currentRow" class="text-xs text-gray-500 mt-2">
        Processing: {{ progress.currentRow }} of {{ progress.totalRows }} rows
      </p>
    </div>

    <!-- Results Summary -->
    <div v-if="result" class="results-summary mb-6">
      <!-- Success State -->
      <div
        v-if="result.success"
        class="rounded-xl border-2 border-green-200 bg-green-50 p-6"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white"
          >
            <svg
              class="h-6 w-6"
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
            <h3 class="text-lg font-bold text-green-900">Import Complete!</h3>
            <p class="text-sm text-green-700">
              Successfully processed {{ result.processed }} products
            </p>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div
            class="rounded-lg bg-white p-3 text-center border border-green-200"
          >
            <p class="text-2xl font-bold text-green-600">
              {{ result.productsCreated }}
            </p>
            <p class="text-xs text-gray-600">New Products</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-blue-200"
          >
            <p class="text-2xl font-bold text-blue-600">
              {{ result.productsUpdated }}
            </p>
            <p class="text-xs text-gray-600">Products Updated</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-purple-200"
          >
            <p class="text-2xl font-bold text-purple-600">
              {{ result.inventoryCreated }}
            </p>
            <p class="text-xs text-gray-600">New Inventory</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-orange-200"
          >
            <p class="text-2xl font-bold text-orange-600">
              {{ result.inventoryUpdated }}
            </p>
            <p class="text-xs text-gray-600">Inventory Updated</p>
          </div>
        </div>

        <p class="text-xs text-gray-500">
          Target Store:
          <span class="font-medium">{{ getStoreName(result.storeId) }}</span>
        </p>
      </div>

      <!-- Partial Success / Error State -->
      <div
        v-else
        class="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-white"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-yellow-900">
              Import Completed with Issues
            </h3>
            <p class="text-sm text-yellow-700">
              {{ result.failed }} of {{ result.processed }} rows failed
            </p>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <div
            class="rounded-lg bg-white p-3 text-center border border-green-200"
          >
            <p class="text-xl font-bold text-green-600">
              {{ result.productsCreated }}
            </p>
            <p class="text-xs text-gray-600">New Products</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-blue-200"
          >
            <p class="text-xl font-bold text-blue-600">
              {{ result.productsUpdated }}
            </p>
            <p class="text-xs text-gray-600">Updated</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-purple-200"
          >
            <p class="text-xl font-bold text-purple-600">
              {{ result.inventoryCreated }}
            </p>
            <p class="text-xs text-gray-600">New Inv.</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-orange-200"
          >
            <p class="text-xl font-bold text-orange-600">
              {{ result.inventoryUpdated }}
            </p>
            <p class="text-xs text-gray-600">Inv. Updated</p>
          </div>
          <div
            class="rounded-lg bg-white p-3 text-center border border-red-200"
          >
            <p class="text-xl font-bold text-red-600">{{ result.failed }}</p>
            <p class="text-xs text-gray-600">Failed</p>
          </div>
        </div>
      </div>

      <!-- Error Report Download -->
      <div v-if="result.errorReport" class="mt-4">
        <button
          class="flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          @click="downloadErrorReport"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download Error Report (CSV)
        </button>
        <p class="text-xs text-gray-500 mt-1">
          Contains all rows that failed with error details
        </p>
      </div>

      <!-- Parse Errors -->
      <div
        v-if="result.parseErrors && result.parseErrors.length > 0"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <h4 class="text-sm font-bold text-red-900 mb-2">CSV Parse Errors</h4>
        <ul class="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
          <li
            v-for="(error, idx) in result.parseErrors.slice(0, 10)"
            :key="idx"
          >
            Row {{ error.row }}: {{ error.message }}
          </li>
          <li v-if="result.parseErrors.length > 10" class="italic">
            ... and {{ result.parseErrors.length - 10 }} more errors
          </li>
        </ul>
      </div>

      <!-- Processing Errors -->
      <div
        v-if="result.processingErrors && result.processingErrors.length > 0"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <h4 class="text-sm font-bold text-red-900 mb-2">Processing Errors</h4>
        <ul class="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
          <li
            v-for="(error, idx) in result.processingErrors.slice(0, 10)"
            :key="idx"
          >
            Row {{ error.row }} (SKU: {{ error.sku }}): {{ error.message }}
          </li>
          <li v-if="result.processingErrors.length > 10" class="italic">
            ... and {{ result.processingErrors.length - 10 }} more errors
          </li>
        </ul>
      </div>

      <!-- Reset Button -->
      <div class="mt-6">
        <button
          class="w-full rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="resetImport"
        >
          Import Another File
        </button>
      </div>
    </div>

    <!-- Best Practices Tip -->
    <div class="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
      <div class="flex items-start gap-3">
        <svg
          class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h4 class="text-sm font-bold text-blue-900">
            Golden SKU Best Practice
          </h4>
          <p class="text-xs text-blue-700 mt-1">
            The "Part Number" in Retail Man is your source of truth. Ensure Part
            Numbers match the barcodes on physical items for consistent
            inventory tracking.
          </p>
          <p class="text-xs text-blue-600 mt-2 font-medium">
            Recommended: Daily import at 8:00 AM before stores open
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Store {
  id: string;
  name: string;
  is_flagship?: boolean;
}

interface ImportResult {
  success: boolean;
  processed: number;
  productsUpdated: number;
  productsCreated: number;
  inventoryUpdated: number;
  inventoryCreated: number;
  failed: number;
  parseErrors?: Array<{ row: number; message: string; rawData?: string }>;
  processingErrors?: Array<{ row: number; sku: string; message: string }>;
  errorReport?: string;
  storeId: string;
}

interface UploadProgress {
  percentage: number;
  totalRows: number;
  currentRow: number;
}

// State
const stores = ref<Store[]>([]);
const storesLoading = ref(false);
const selectedStoreId = ref("");
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const isDragging = ref(false);
const result = ref<ImportResult | null>(null);
const progress = ref<UploadProgress>({
  percentage: 0,
  totalRows: 0,
  currentRow: 0,
});

const fileInput = ref<HTMLInputElement | null>(null);
const supabase = useSupabaseClient();

// Load stores on mount
onMounted(async () => {
  await loadStores();
});

async function loadStores() {
  storesLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, is_flagship")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    stores.value = data || [];
  } catch (err) {
    console.error("Failed to load stores:", err);
  } finally {
    storesLoading.value = false;
  }
}

function getStoreName(storeId: string): string {
  const store = stores.value.find((s) => s.id === storeId);
  return store?.name || storeId;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
    result.value = null;
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    const file = files[0];
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      selectedFile.value = file;
      result.value = null;
    } else {
      alert("Please upload a CSV file");
    }
  }
}

async function startUpload() {
  if (!selectedFile.value || !selectedStoreId.value) return;

  isUploading.value = true;

  // Count actual rows in CSV for accurate progress
  let totalRows = 0;
  try {
    const text = await selectedFile.value.text();
    const lines = text.trim().split("\n");
    totalRows = Math.max(0, lines.length - 1); // Exclude header
  } catch {
    totalRows = 0;
  }

  progress.value = { percentage: 0, totalRows, currentRow: 0 };

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);
    formData.append("store_id", selectedStoreId.value);

    // Simulate progress - cap at 90% until server responds
    const progressInterval = setInterval(() => {
      if (progress.value.percentage < 90) {
        progress.value.percentage += Math.random() * 10;
        // Estimate current row based on percentage
        if (progress.value.totalRows > 0) {
          progress.value.currentRow = Math.floor(
            (progress.value.percentage / 100) * progress.value.totalRows,
          );
        }
      }
    }, 500);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await $fetch("/api/admin/import-retailman", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    clearInterval(progressInterval);
    progress.value.percentage = 100;

    result.value = response as ImportResult;
  } catch (err: any) {
    console.error("Upload failed:", err);
    alert(
      err?.data?.statusMessage ||
        err?.message ||
        "Import failed. Please try again.",
    );
  } finally {
    isUploading.value = false;
  }
}

function downloadErrorReport() {
  if (!result.value?.errorReport) return;

  const blob = new Blob([result.value.errorReport], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-errors-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function resetImport() {
  selectedFile.value = null;
  result.value = null;
  progress.value = { percentage: 0, totalRows: 0, currentRow: 0 };
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}
</script>

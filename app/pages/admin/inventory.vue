<template>
  <div>
    <!-- Inventory Stats -->
    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">Total Products</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ stats.totalProducts }}
        </p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">In Stock</p>
        <p class="mt-1 text-2xl font-bold text-green-600">
          {{ stats.inStock }}
        </p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">Low Stock</p>
        <p class="mt-1 text-2xl font-bold text-orange-600">
          {{ stats.lowStock }}
        </p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">Out of Stock</p>
        <p class="mt-1 text-2xl font-bold text-red-600">
          {{ stats.outOfStock }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div
      class="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
    >
      <div class="flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search products..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
        />
      </div>

      <select
        v-if="!isBranchManager"
        v-model="storeFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
      >
        <option value="">All Stores</option>
        <option v-for="store in stores" :key="store.id" :value="store.id">
          {{ store.name }}
        </option>
      </select>
      <select
        v-else-if="managedStores.length > 1"
        v-model="storeFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
      >
        <option value="">All My Stores</option>
        <option
          v-for="store in managedStores"
          :key="store.id"
          :value="store.id"
        >
          {{ store.name }}
        </option>
      </select>
      <span
        v-else-if="managedStores.length === 1"
        class="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg"
      >
        {{ managedStores[0]?.name }}
      </span>

      <select
        v-model="statusFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
      >
        <option value="">All Status</option>
        <option value="in_stock">In Stock</option>
        <option value="low_stock">Low Stock</option>
        <option value="out_of_stock">Out of Stock</option>
      </select>

      <button
        @click="fetchInventory"
        class="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </button>

      <button
        @click="showUploadModal = true"
        class="rounded-lg bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
      >
        Upload CSV
      </button>

      <button
        @click="openManualModal"
        class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
      >
        Add Item
      </button>
    </div>

    <!-- Inventory Grid -->
    <div class="rounded-xl bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Product
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Store
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Stock Level
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Last Updated
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="item in filteredInventory"
              :key="item.id"
              class="hover:bg-gray-50"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="item.product?.image_url"
                    :src="item.product.image_url"
                    class="h-10 w-10 rounded-lg object-cover"
                    alt=""
                  />
                  <div
                    v-else
                    class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center"
                  >
                    <span class="text-gray-400">📦</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">
                      {{ item.product?.name || "Unknown" }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ item.product?.category }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                {{ item.store?.name || "All Stores" }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <input
                    v-model="item.quantity"
                    type="number"
                    min="0"
                    class="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-center"
                    @change="updateStock(item)"
                  />
                  <span class="text-xs text-gray-500">units</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-1 text-xs font-bold"
                  :class="getStatusClass(item)"
                >
                  {{ getStatusLabel(item) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ formatTime(item.updated_at) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    @click="toggleAvailability(item)"
                    :class="
                      item.is_available
                        ? 'rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-200'
                        : 'rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200'
                    "
                  >
                    {{ item.is_available ? "Available" : "Unavailable" }}
                  </button>
                  <button
                    v-if="item.quantity <= 5 && item.quantity > 0"
                    @click="restockItem(item)"
                    class="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-200"
                  >
                    Restock
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredInventory.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                No inventory items found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div class="mt-6 rounded-xl bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-bold text-gray-900">Bulk Actions</h3>
      <div class="flex flex-wrap gap-3">
        <button
          @click="markAllOutOfStock"
          class="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200"
        >
          Mark Low Stock as Out of Stock
        </button>
        <button
          @click="exportInventory"
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
        >
          Export Inventory Report
        </button>
      </div>
    </div>

    <!-- CSV Upload Modal -->
    <div
      v-if="showUploadModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div
          class="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Upload Inventory CSV
            </h3>
            <p class="text-sm text-gray-600">Bulk update store inventory</p>
          </div>
          <button
            @click="showUploadModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg
              class="w-6 h-6"
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
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Store Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Select Store *</label
            >
            <select
              v-model="uploadStoreId"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
            >
              <option value="">Choose a store...</option>
              <option
                v-for="store in storeOptions"
                :key="store.id"
                :value="store.id"
              >
                {{ store.name }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              All products in the CSV will be added to this store
            </p>
          </div>

          <!-- Template Download -->
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-900 mb-2">
              <strong>CSV Format:</strong> name, sku, category, description,
              price, cost_price, unit, stock_level, store_price, digital_buffer,
              image_url
            </p>
            <p class="text-xs text-gray-700">
              Required: name, stock_level, price. Store is selected above, not
              in CSV.
            </p>
            <button
              @click="downloadTemplate"
              class="mt-3 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Download Template CSV →
            </button>
          </div>

          <!-- File Upload -->
          <div
            class="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
            :class="dragOver ? 'border-gray-500 bg-gray-50' : 'border-gray-300'"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="handleFileDrop"
          >
            <div class="space-y-3">
              <div class="text-4xl">📄</div>
              <div>
                <p class="text-sm font-medium text-gray-900">
                  {{
                    selectedFile ? selectedFile.name : "Drop your CSV file here"
                  }}
                </p>
                <p class="text-xs text-gray-500">or click to browse</p>
              </div>
              <button
                @click="fileInput?.click()"
                type="button"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Choose File
              </button>
              <input
                ref="fileInput"
                type="file"
                accept=".csv"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3">
            <button
              @click="showUploadModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="uploadFile"
              :disabled="uploading || !selectedFile || !uploadStoreId"
              class="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-bold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ uploading ? "Uploading..." : "Upload CSV" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Entry Modal -->
    <div
      v-if="showManualModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div
          class="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Add Inventory Item
            </h3>
            <p class="text-sm text-gray-600">
              Create or update a product in a store
            </p>
          </div>
          <button
            @click="showManualModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg
              class="w-6 h-6"
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
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Store *</label
            >
            <select
              v-model="manualForm.store_id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
            >
              <option value="">Choose a store...</option>
              <option
                v-for="store in storeOptions"
                :key="store.id"
                :value="store.id"
              >
                {{ store.name }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Product Name *</label
              >
              <input
                v-model="manualForm.name"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="e.g. Fresh Cow Milk"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >SKU</label
              >
              <input
                v-model="manualForm.sku"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="e.g. DAIRY-001"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Barcode (RetailMan)</label
              >
              <input
                v-model="manualForm.barcode"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="e.g. 123456789012"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >RetailMan Product ID</label
              >
              <input
                v-model="manualForm.retailman_product_id"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="RetailMan system ID"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Description</label
            >
            <textarea
              v-model="manualForm.description"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              placeholder="Optional description"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Price *</label
              >
              <input
                v-model.number="manualForm.price"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="e.g. 850"
              />
              <p class="text-xs text-gray-500 mt-1">
                Required if product does not exist
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Stock Level *</label
              >
              <input
                v-model.number="manualForm.stock_level"
                type="number"
                min="0"
                step="1"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Unit</label
              >
              <input
                v-model="manualForm.unit"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="unit"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Cost Price</label
              >
              <input
                v-model.number="manualForm.cost_price"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Store Price</label
              >
              <input
                v-model.number="manualForm.store_price"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Digital Buffer</label
              >
              <input
                v-model.number="manualForm.digital_buffer"
                type="number"
                min="0"
                step="1"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Image URL</label
              >
              <input
                v-model="manualForm.image_url"
                type="url"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>
            <div class="flex items-center gap-3 pt-6">
              <input
                id="manual-visible"
                v-model="manualForm.is_visible"
                type="checkbox"
                class="h-4 w-4"
              />
              <label for="manual-visible" class="text-sm text-gray-700"
                >Visible in store</label
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Product Image</label
            >
            <div
              class="border-2 border-dashed rounded-xl p-4 transition-colors"
              :class="
                imageDragOver ? 'border-gray-500 bg-gray-50' : 'border-gray-300'
              "
              @dragover.prevent="imageDragOver = true"
              @dragleave.prevent="imageDragOver = false"
              @drop.prevent="handleImageDrop"
            >
              <div class="flex items-center gap-4">
                <div
                  class="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center"
                >
                  <img
                    v-if="imagePreview"
                    :src="imagePreview"
                    class="h-full w-full object-cover"
                    alt=""
                  />
                  <span v-else class="text-gray-400 text-2xl">🖼️</span>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">
                    {{
                      selectedImageFile
                        ? selectedImageFile.name
                        : "Drop an image here"
                    }}
                  </p>
                  <p class="text-xs text-gray-500">PNG, JPG (max 5MB)</p>
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      @click="imageInput?.click()"
                      class="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Choose Image
                    </button>
                    <button
                      v-if="selectedImageFile || imagePreview"
                      type="button"
                      @click="clearImage"
                      class="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    ref="imageInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleImageSelect"
                  />
                </div>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              If you upload an image, it will be saved to storage and the Image
              URL will be filled automatically.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              @click="showManualModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="saveManualEntry"
              :disabled="
                manualSaving ||
                !manualForm.store_id ||
                !manualForm.name ||
                manualForm.stock_level === null
              "
              class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ manualSaving ? "Saving..." : "Save Item" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["inventory-manager"],
});

import { useUserStore } from "~/stores/user";

const supabase = useSupabaseClient();

const toast = useToast();

const userStore = useUserStore();

const inventory = ref<any[]>([]);
const stores = ref<any[]>([]);
const searchQuery = ref("");
const storeFilter = ref("");
const statusFilter = ref("");
const processing = ref<Set<string>>(new Set());

// CSV Upload
const showUploadModal = ref(false);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement>();
const uploadStoreId = ref("");

const isBranchManager = computed(() => {
  const jwtRole =
    ((userStore.user as any)?.app_metadata?.role as string | undefined) ||
    undefined;
  const role = userStore.profile?.role || jwtRole;
  return role === "branch_manager";
});

const managedStores = computed(() => userStore.managedStores);

const storeOptions = computed(() => {
  return isBranchManager.value ? userStore.managedStores || [] : stores.value;
});

// Manual Entry
const showManualModal = ref(false);
const manualSaving = ref(false);
const manualForm = ref({
  store_id: "",
  name: "",
  sku: "",
  barcode: "",
  retailman_product_id: "",
  description: "",
  price: null as number | null,
  cost_price: null as number | null,
  unit: "unit",
  stock_level: 0,
  digital_buffer: 0,
  store_price: null as number | null,
  image_url: "",
  is_visible: true,
});

// Image Upload for Manual Entry
const selectedImageFile = ref<File | null>(null);
const imagePreview = ref<string>("");
const imageDragOver = ref(false);
const imageInput = ref<HTMLInputElement>();

const stats = computed(() => {
  const total = inventory.value.length;
  const inStock = inventory.value.filter(
    (i) => i.is_available && i.quantity > 5,
  ).length;
  const lowStock = inventory.value.filter(
    (i) => i.is_available && i.quantity > 0 && i.quantity <= 5,
  ).length;
  const outOfStock = inventory.value.filter(
    (i) => !i.is_available || i.quantity === 0,
  ).length;
  return { totalProducts: total, inStock, lowStock, outOfStock };
});

const filteredInventory = computed(() => {
  return inventory.value.filter((item) => {
    const matchesSearch =
      !searchQuery.value ||
      item.product?.name
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase());

    const matchesStore =
      !storeFilter.value || item.store_id === storeFilter.value;

    let matchesStatus = true;
    if (statusFilter.value === "in_stock") {
      matchesStatus = item.is_available && item.quantity > 5;
    } else if (statusFilter.value === "low_stock") {
      matchesStatus =
        item.is_available && item.quantity > 0 && item.quantity <= 5;
    } else if (statusFilter.value === "out_of_stock") {
      matchesStatus = !item.is_available || item.quantity === 0;
    }

    return matchesSearch && matchesStore && matchesStatus;
  });
});

const formatTime = (timestamp: string) => {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusClass = (item: any) => {
  if (!item.is_available || item.quantity === 0)
    return "bg-red-100 text-red-700";
  if (item.quantity <= 5) return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
};

const getStatusLabel = (item: any) => {
  if (!item.is_available || item.quantity === 0) return "Out of Stock";
  if (item.quantity <= 5) return "Low Stock";
  return "In Stock";
};

const fetchStores = async () => {
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true);
  if (data) stores.value = data;
};

const downloadTemplate = () => {
  const csv =
    "name,sku,category,description,price,cost_price,unit,stock_level,store_price,digital_buffer,image_url\n" +
    "Fresh Cow Milk,DAIRY-001,Dairy & Eggs,Premium fresh milk 1L,850.00,600.00,liter,50,,5,https://example.com/milk.jpg\n" +
    "Basmati Rice,GRAIN-001,Grains & Rice,Long grain rice 5kg,7500.00,5500.00,5kg bag,30,,3,https://example.com/rice.jpg";

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-template-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0] && input.files[0].name.endsWith(".csv")) {
    selectedFile.value = input.files[0];
  }
};

const openManualModal = () => {
  manualForm.value = {
    store_id: "",
    name: "",
    sku: "",
    barcode: "",
    retailman_product_id: "",
    description: "",
    price: null,
    cost_price: null,
    unit: "unit",
    stock_level: 0,
    digital_buffer: 0,
    store_price: null,
    image_url: "",
    is_visible: true,
  };
  clearImage();
  showManualModal.value = true;
};

const handleImageSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.add({
        title: "Error",
        description: "Image must be less than 5MB",
        color: "error",
      });
      return;
    }
    selectedImageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const handleImageDrop = (event: DragEvent) => {
  imageDragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0] && files[0].type.startsWith("image/")) {
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.add({
        title: "Error",
        description: "Image must be less than 5MB",
        color: "error",
      });
      return;
    }
    selectedImageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const clearImage = () => {
  selectedImageFile.value = null;
  imagePreview.value = "";
  if (imageInput.value) {
    imageInput.value.value = "";
  }
};

const uploadImageToStorage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.add({
        title: "Upload Failed",
        description: uploadError.message || "Failed to upload image",
        color: "error",
      });
      console.error("Image upload error:", uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(filePath);
    return publicUrl;
  } catch (err: any) {
    toast.add({
      title: "Upload Error",
      description: err?.message || "Failed to upload image",
      color: "error",
    });
    console.error("Image upload exception:", err);
    return null;
  }
};

const saveManualEntry = async () => {
  manualSaving.value = true;
  try {
    if (isBranchManager.value) {
      const allowedIds = (userStore.managedStores || []).map((s: any) => s.id);
      if (!allowedIds.includes(manualForm.value.store_id)) {
        throw new Error("Not authorized to manage this store");
      }
    }

    let imageUrl = manualForm.value.image_url;
    if (selectedImageFile.value) {
      const uploadedUrl = await uploadImageToStorage(selectedImageFile.value);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Not authenticated");

    await $fetch("/api/admin/manual-inventory", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        store_id: manualForm.value.store_id,
        name: manualForm.value.name,
        sku: manualForm.value.sku || undefined,
        barcode: manualForm.value.barcode || undefined,
        retailman_product_id:
          manualForm.value.retailman_product_id || undefined,
        description: manualForm.value.description || undefined,
        price: manualForm.value.price ?? undefined,
        cost_price: manualForm.value.cost_price ?? undefined,
        unit: manualForm.value.unit || undefined,
        stock_level: manualForm.value.stock_level,
        digital_buffer: manualForm.value.digital_buffer,
        store_price: manualForm.value.store_price ?? undefined,
        image_url: imageUrl || undefined,
        is_visible: manualForm.value.is_visible,
      },
    });

    toast.add({
      title: "Success",
      description: "Inventory item saved",
      color: "success",
    });
    showManualModal.value = false;
    clearImage();
    await fetchInventory();
  } catch (err: any) {
    console.error("Manual entry error:", err);
    toast.add({
      title: "Error",
      description: err?.data?.message || err?.message || "Failed to save item",
      color: "error",
    });
  } finally {
    manualSaving.value = false;
  }
};

const handleFileDrop = (event: DragEvent) => {
  dragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0] && files[0].name.endsWith(".csv")) {
    selectedFile.value = files[0];
  }
};

const uploadFile = async () => {
  if (!selectedFile.value) return;
  if (!uploadStoreId.value) {
    toast.add({
      title: "Error",
      description: "Please select a store",
      color: "error",
    });
    return;
  }

  if (isBranchManager.value) {
    const allowedIds = (userStore.managedStores || []).map((s: any) => s.id);
    if (!allowedIds.includes(uploadStoreId.value)) {
      toast.add({
        title: "Error",
        description: "Not authorized to upload for this store",
        color: "error",
      });
      return;
    }
  }

  uploading.value = true;
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("file", selectedFile.value);
    formData.append("store_id", uploadStoreId.value);

    await $fetch("/api/admin/upload-inventory", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    toast.add({
      title: "Success",
      description: "Inventory uploaded successfully",
      color: "success",
    });
    showUploadModal.value = false;
    selectedFile.value = null;
    await fetchInventory();
  } catch (err: any) {
    console.error("Upload error:", err);
    toast.add({
      title: "Upload Failed",
      description: err?.data?.message || err?.message || "Failed to upload CSV",
      color: "error",
    });
  } finally {
    uploading.value = false;
  }
};

const fetchInventory = async () => {
  let query = supabase
    .from("store_inventory")
    .select(
      `
      *,
      product:products(id, name, image_url, category_id),
      store:stores(id, name)
    `,
    )
    .order("updated_at", { ascending: false });

  // Branch managers only see inventory for their assigned stores
  if (isBranchManager.value) {
    const allowedStoreIds = (userStore.managedStores || []).map(
      (s: any) => s.id,
    );
    if (allowedStoreIds.length > 0) {
      query = query.in("store_id", allowedStoreIds);
    } else {
      // No stores assigned, return empty
      inventory.value = [];
      return;
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching inventory:", error);
    return;
  }

  inventory.value = (data || []).map((item: any) => ({
    ...item,
    quantity: item.available_stock || 0,
    is_available: item.is_visible !== false,
  }));
};

const updateStock = async (item: any) => {
  if (processing.value.has(item.id)) return;
  processing.value.add(item.id);

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    console.error("Error getting session:", sessionError);
    processing.value.delete(item.id);
    return;
  }

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    processing.value.delete(item.id);
    return;
  }

  const nextStockLevel = Math.max(0, parseInt(item.quantity) || 0);

  const { error } = await $fetch("/api/admin/update-store-inventory", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      id: item.id,
      store_id: item.store_id,
      stock_level: nextStockLevel,
    },
  })
    .then(() => ({ error: null as any }))
    .catch((e: any) => ({ error: e }));

  if (!error) {
    item.updated_at = new Date().toISOString();
  }

  processing.value.delete(item.id);
};

const toggleAvailability = async (item: any) => {
  if (processing.value.has(item.id)) return;
  processing.value.add(item.id);

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    console.error("Error getting session:", sessionError);
    processing.value.delete(item.id);
    return;
  }

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    processing.value.delete(item.id);
    return;
  }

  const newVisibility = !item.is_available;

  const { error } = await $fetch("/api/admin/update-store-inventory", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      id: item.id,
      store_id: item.store_id,
      is_visible: newVisibility,
    },
  })
    .then(() => ({ error: null as any }))
    .catch((e: any) => ({ error: e }));

  if (!error) {
    item.is_available = newVisibility;
    item.updated_at = new Date().toISOString();
  }

  processing.value.delete(item.id);
};

const restockItem = async (item: any) => {
  const newQuantity = prompt(
    `Enter new quantity for ${item.product?.name}:`,
    String(item.quantity + 10),
  );
  if (newQuantity === null) return;

  const quantity = parseInt(newQuantity);
  if (isNaN(quantity) || quantity < 0) {
    alert("Invalid quantity");
    return;
  }

  item.quantity = quantity;
  await updateStock(item);
};

const markAllOutOfStock = async () => {
  if (!confirm("Mark all low stock items as out of stock?")) return;

  const lowStockItems = inventory.value.filter(
    (i) => i.quantity <= 5 && i.quantity > 0,
  );

  for (const item of lowStockItems) {
    await (supabase as any)
      .from("store_inventory")
      .update({
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    item.is_available = false;
  }

  alert(`${lowStockItems.length} items marked as out of stock`);
};

const exportInventory = () => {
  const csv = [
    ["Product", "Store", "Quantity", "Status", "Last Updated"].join(","),
    ...inventory.value.map((item) =>
      [
        item.product?.name || "Unknown",
        item.store?.name || "All Stores",
        item.quantity,
        getStatusLabel(item),
        formatTime(item.updated_at),
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

onMounted(() => {
  fetchInventory();
  fetchStores();
});
</script>

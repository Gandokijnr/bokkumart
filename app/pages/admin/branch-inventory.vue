<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Manage Inventory</h1>
            <p class="text-gray-600 mt-2">Managing: {{ managedStoreNames }}</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="showUploadModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                class="w-5 h-5"
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
              Upload CSV
            </button>
            <button
              @click="showManualEntry = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Item
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Products</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">
                {{ stats.totalProducts }}
              </p>
            </div>
            <div
              class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"
            >
              <span class="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">In Stock</p>
              <p class="text-2xl font-bold text-green-600 mt-1">
                {{ stats.inStock }}
              </p>
            </div>
            <div
              class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"
            >
              <span class="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Low Stock</p>
              <p class="text-2xl font-bold text-orange-600 mt-1">
                {{ stats.lowStock }}
              </p>
            </div>
            <div
              class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center"
            >
              <span class="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Out of Stock</p>
              <p class="text-2xl font-bold text-red-600 mt-1">
                {{ stats.outOfStock }}
              </p>
            </div>
            <div
              class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"
            >
              <span class="text-2xl">❌</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6"
      >
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[200px]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search products..."
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <select
            v-if="managedStores.length > 1"
            v-model="storeFilter"
            class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
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

          <select
            v-model="statusFilter"
            class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
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
        </div>
      </div>

      <!-- Inventory Table -->
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
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
                        {{ item.product?.sku || "No SKU" }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                  {{ getStoreName(item.store_id) }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="item.stock_level"
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
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <button
                      @click="toggleVisibility(item)"
                      :class="
                        item.is_visible
                          ? 'rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-200'
                          : 'rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200'
                      "
                    >
                      {{ item.is_visible ? "Visible" : "Hidden" }}
                    </button>
                    <button
                      @click="openEditItem(item)"
                      class="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredInventory.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                  No inventory items found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
            <p class="text-sm text-gray-600">
              Bulk update your store inventory
            </p>
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
          <div v-if="managedStores.length > 1">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Select Store *</label
            >
            <select
              v-model="uploadStoreId"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
            >
              <option value="">Choose a store...</option>
              <option
                v-for="store in managedStores"
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
          <div
            v-else-if="managedStores.length === 1"
            class="bg-gray-50 rounded-lg p-3"
          >
            <p class="text-sm text-gray-700">
              <span class="font-medium">Store:</span>
              {{ managedStores[0]?.name }}
            </p>
          </div>

          <!-- Template Download -->
          <div class="bg-blue-50 rounded-lg p-4">
            <p class="text-sm text-blue-900 mb-2">
              <strong>CSV Format:</strong> name, sku, category, description,
              price, cost_price, unit, stock_level, store_price, digital_buffer,
              image_url
            </p>
            <p class="text-xs text-blue-700">
              Required: name, stock_level, price. Store is selected above, not
              in CSV.
            </p>
            <button
              @click="downloadTemplate"
              class="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Download Template CSV →
            </button>
          </div>

          <!-- File Upload -->
          <div
            @dragover.prevent
            @drop.prevent="handleFileDrop"
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-400 transition-colors"
            :class="{ 'border-red-500 bg-red-50': dragOver }"
            @dragenter="dragOver = true"
            @dragleave="dragOver = false"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileSelect"
            />
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
            <p class="mt-2 text-sm text-gray-600">
              <span
                class="font-medium text-red-600 cursor-pointer"
                @click="fileInput?.click()"
                >Click to upload</span
              >
              or drag and drop
            </p>
            <p class="text-xs text-gray-500 mt-1">CSV files only (max 10MB)</p>
            <p
              v-if="selectedFile"
              class="mt-2 text-sm font-medium text-green-600"
            >
              Selected: {{ selectedFile.name }}
            </p>
          </div>

          <!-- Upload Results -->
          <div
            v-if="uploadResult"
            class="rounded-lg p-4"
            :class="uploadResult.success ? 'bg-green-50' : 'bg-yellow-50'"
          >
            <p
              class="font-medium"
              :class="
                uploadResult.success ? 'text-green-900' : 'text-yellow-900'
              "
            >
              {{
                uploadResult.success
                  ? "Upload Successful!"
                  : "Upload Completed with Issues"
              }}
            </p>
            <p
              class="text-sm mt-1"
              :class="
                uploadResult.success ? 'text-green-700' : 'text-yellow-700'
              "
            >
              Processed: {{ uploadResult.processed }} rows | Created:
              {{ uploadResult.inventoryCreated }} | Updated:
              {{ uploadResult.inventoryUpdated }} | New Products:
              {{ uploadResult.productsCreated }}
            </p>
            <div v-if="uploadResult.processingErrors?.length" class="mt-3">
              <p class="text-sm font-medium text-red-700">
                Errors ({{ uploadResult.processingErrors.length }}):
              </p>
              <ul class="text-xs text-red-600 mt-1 max-h-32 overflow-y-auto">
                <li
                  v-for="(err, idx) in uploadResult.processingErrors.slice(
                    0,
                    10,
                  )"
                  :key="idx"
                >
                  Row {{ err.row }}: {{ err.message }}
                </li>
                <li
                  v-if="uploadResult.processingErrors.length > 10"
                  class="italic"
                >
                  ... and {{ uploadResult.processingErrors.length - 10 }} more
                  errors
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            @click="showUploadModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="uploadFile"
            :disabled="
              !selectedFile ||
              uploading ||
              (managedStores.length > 1 && !uploadStoreId)
            "
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ uploading ? "Uploading..." : "Upload CSV" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Manual Entry Modal -->
    <div
      v-if="showManualEntry"
      class="overflow-y-auto fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            Add Inventory Item
          </h3>
        </div>

        <div class="p-6 space-y-4">
          <div v-if="managedStores.length > 1">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Store *</label
            >
            <select
              v-model="manualForm.store_id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
            >
              <option
                v-for="store in managedStores"
                :key="store.id"
                :value="store.id"
              >
                {{ store.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Product Name *</label
            >
            <input
              v-model="manualForm.name"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              placeholder="Enter product name"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >SKU (optional)</label
              >
              <input
                v-model="manualForm.sku"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="Product SKU"
              />
            </div>
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

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Stock Level *</label
              >
              <input
                v-model="manualForm.stock_level"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Digital Buffer</label
              >
              <input
                v-model="manualForm.digital_buffer"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Base Price (₦)</label
              >
              <input
                v-model="manualForm.price"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="For new products"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Store Price (₦)</label
              >
              <input
                v-model="manualForm.store_price"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                placeholder="Override price"
              />
            </div>
          </div>

          <!-- Product Image Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Product Image</label
            >

            <!-- Image Preview -->
            <div v-if="imagePreview || manualForm.image_url" class="mb-3">
              <div class="relative inline-block">
                <img
                  :src="imagePreview || manualForm.image_url"
                  class="h-32 w-32 rounded-lg object-cover border border-gray-200"
                  alt="Product preview"
                />
                <button
                  @click="clearImage"
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- Upload Zone -->
            <div
              @dragover.prevent
              @drop.prevent="handleImageDrop"
              @dragenter="imageDragOver = true"
              @dragleave="imageDragOver = false"
              :class="{ 'border-red-500 bg-red-50': imageDragOver }"
              class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-red-400 transition-colors cursor-pointer"
              @click="imageInput?.click()"
            >
              <input
                ref="imageInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleImageSelect"
              />
              <svg
                class="mx-auto h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="mt-1 text-sm text-gray-600">
                <span class="text-red-600 font-medium">Click to upload</span> or
                drag and drop
              </p>
              <p class="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
              <p
                v-if="selectedImageFile"
                class="mt-1 text-xs text-green-600 font-medium"
              >
                Selected: {{ selectedImageFile.name }}
              </p>
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2">
              <input
                v-model="manualForm.is_visible"
                type="checkbox"
                class="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span class="text-sm text-gray-700">Visible to customers</span>
            </label>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            @click="showManualEntry = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            @click="saveManualEntry"
            :disabled="!manualForm.name || manualForm.stock_level < 0"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ manualSaving ? "Saving..." : "Save Item" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Item Modal -->
    <div
      v-if="editingItem"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            Edit Inventory Item
          </h3>
          <p class="text-sm text-gray-600">{{ editingItem.product?.name }}</p>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Stock Level</label
            >
            <input
              v-model="editForm.stock_level"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Digital Buffer</label
            >
            <input
              v-model="editForm.digital_buffer"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Store Price (₦)</label
            >
            <input
              v-model="editForm.store_price"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
              placeholder="Override base price"
            />
          </div>

          <!-- Location Fields -->
          <div class="border-t border-gray-200 pt-4">
            <p class="text-sm font-medium text-gray-900 mb-3">
              Storage Location
            </p>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-gray-600 mb-1">Aisle</label>
                <input
                  v-model="editForm.aisle"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                  placeholder="e.g. A1"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">Shelf</label>
                <input
                  v-model="editForm.shelf"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">Section</label>
                <input
                  v-model="editForm.section"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                  placeholder="e.g. B"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2">
              <input
                v-model="editForm.is_visible"
                type="checkbox"
                class="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span class="text-sm text-gray-700">Visible to customers</span>
            </label>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            @click="editingItem = null"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            @click="saveEditItem"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/user";

definePageMeta({
  layout: "admin",
  middleware: ["inventory-manager"],
});

useHead({
  title: "Branch Inventory - HomeAffairs",
});

const supabase = useSupabaseClient();
const toast = useToast();
const userStore = useUserStore();

// State
const inventory = ref<any[]>([]);
const searchQuery = ref("");
const storeFilter = ref("");
const statusFilter = ref("");
const loading = ref(false);

// CSV Upload
const showUploadModal = ref(false);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const uploadResult = ref<any>(null);
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement>();
const uploadStoreId = ref("");

// Manual Entry
const showManualEntry = ref(false);
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

// Edit Item
const editingItem = ref<any>(null);
const editForm = ref({
  stock_level: 0,
  digital_buffer: 0,
  store_price: null as number | null,
  aisle: "",
  shelf: "",
  section: "",
  is_visible: true,
});

// Computed
const managedStores = computed(() => userStore.managedStores);
const managedStoreNames = computed(() => userStore.managedStoreNames);

const stats = computed(() => {
  const total = inventory.value.length;
  const inStock = inventory.value.filter(
    (i) => i.is_visible && i.stock_level > 5,
  ).length;
  const lowStock = inventory.value.filter(
    (i) => i.is_visible && i.stock_level > 0 && i.stock_level <= 5,
  ).length;
  const outOfStock = inventory.value.filter(
    (i) => !i.is_visible || i.stock_level === 0,
  ).length;
  return { totalProducts: total, inStock, lowStock, outOfStock };
});

const filteredInventory = computed(() => {
  return inventory.value.filter((item) => {
    const matchesSearch =
      !searchQuery.value ||
      item.product?.name
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      item.product?.sku
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase());

    const matchesStore =
      !storeFilter.value || item.store_id === storeFilter.value;

    let matchesStatus = true;
    if (statusFilter.value === "in_stock") {
      matchesStatus = item.is_visible && item.stock_level > 5;
    } else if (statusFilter.value === "low_stock") {
      matchesStatus =
        item.is_visible && item.stock_level > 0 && item.stock_level <= 5;
    } else if (statusFilter.value === "out_of_stock") {
      matchesStatus = !item.is_visible || item.stock_level === 0;
    }

    return matchesSearch && matchesStore && matchesStatus;
  });
});

// Methods
const getStoreName = (storeId: string) => {
  const store = managedStores.value.find((s) => s.id === storeId);
  return store?.name || "Unknown Store";
};

const getStatusClass = (item: any) => {
  if (!item.is_visible || item.stock_level === 0)
    return "bg-red-100 text-red-700";
  if (item.stock_level <= 5) return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
};

const getStatusLabel = (item: any) => {
  if (!item.is_visible || item.stock_level === 0) return "Out of Stock";
  if (item.stock_level <= 5) return "Low Stock";
  return "In Stock";
};

const fetchInventory = async () => {
  loading.value = true;
  const storeIds = managedStores.value.map((s) => s.id);

  if (storeIds.length === 0) {
    inventory.value = [];
    loading.value = false;
    return;
  }

  const { data, error } = await supabase
    .from("store_inventory")
    .select(
      `
      *,
      product:products(id, name, sku, image_url)
    `,
    )
    .in("store_id", storeIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching inventory:", error);
    toast.add({
      title: "Error",
      description: "Failed to load inventory",
      color: "error",
    });
  } else {
    inventory.value = data || [];
  }

  loading.value = false;
};

const updateStock = async (item: any) => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    toast.add({
      title: "Error",
      description: "Failed to get session",
      color: "error",
    });
    return;
  }

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    toast.add({
      title: "Error",
      description: "Not authenticated",
      color: "error",
    });
    return;
  }

  const nextStockLevel = Math.max(0, parseInt(item.stock_level) || 0);

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

  if (error) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to update stock",
      color: "error",
    });
  } else {
    toast.add({
      title: "Success",
      description: "Stock updated",
      color: "success",
    });
  }
};

const toggleVisibility = async (item: any) => {
  const newVisibility = !item.is_visible;

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    toast.add({
      title: "Error",
      description: "Failed to get session",
      color: "error",
    });
    return;
  }

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    toast.add({
      title: "Error",
      description: "Not authenticated",
      color: "error",
    });
    return;
  }

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

  if (error) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to update item",
      color: "error",
    });
  } else {
    item.is_visible = newVisibility;
    toast.add({
      title: "Success",
      description: `Item ${newVisibility ? "visible" : "hidden"}`,
      color: "success",
    });
  }
};

// CSV Upload Methods
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
    uploadResult.value = null;
  }
};

const handleFileDrop = (event: DragEvent) => {
  dragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0] && files[0].name.endsWith(".csv")) {
    selectedFile.value = files[0];
    uploadResult.value = null;
  }
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

const uploadFile = async () => {
  if (!selectedFile.value) return;

  // Determine store ID
  const storeId =
    managedStores.value?.length === 1
      ? managedStores.value[0]?.id
      : uploadStoreId.value;

  if (!storeId) {
    toast.add({
      title: "Error",
      description: "Please select a store",
      color: "error",
    });
    return;
  }

  uploading.value = true;
  uploadResult.value = null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const formData = new FormData();
    formData.append("file", selectedFile.value);
    formData.append("store_id", storeId);

    interface UploadResult {
      success: boolean;
      processed?: number;
      inventoryCreated?: number;
      inventoryUpdated?: number;
      productsCreated?: number;
      processingErrors?: Array<{ row: number; message: string }>;
      parseErrors?: Array<{ row: number; message: string }>;
      error?: string;
    }

    const result = await $fetch<UploadResult>("/api/admin/upload-inventory", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    uploadResult.value = result;

    if (result.success) {
      toast.add({
        title: "Success",
        description: "Inventory uploaded successfully",
        color: "success",
      });
      await fetchInventory();
    } else {
      toast.add({
        title: "Upload Completed",
        description: `Processed ${result.processed} rows with ${result.processingErrors?.length || 0} errors`,
        color: "warning",
      });
    }
  } catch (err: any) {
    console.error("Upload error:", err);
    toast.add({
      title: "Upload Failed",
      description: err?.data?.message || err?.message || "Failed to upload CSV",
      color: "error",
    });
    uploadResult.value = { success: false, error: err?.message };
  } finally {
    uploading.value = false;
  }
};

// Manual Entry Methods
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
  manualForm.value.image_url = "";
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
      // Error code 42501 = insufficient_privilege / RLS violation
      if (uploadError.message?.includes("Bucket not found")) {
        toast.add({
          title: "Storage Not Configured",
          description: 'Please create a "products" storage bucket in Supabase',
          color: "error",
        });
      } else if (
        uploadError.message?.includes("row-level security") ||
        uploadError.message?.includes("policy") ||
        (uploadError as any).code === "42501"
      ) {
        toast.add({
          title: "Permission Denied (Code 42501)",
          description:
            "RLS policy missing. Run the SQL in BRANCH_MANAGER_CSV.md to fix.",
          color: "error",
          timeout: 8000,
        });
      } else {
        toast.add({
          title: "Upload Failed",
          description: uploadError.message || "Failed to upload image",
          color: "error",
        });
      }
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
    const storeId =
      managedStores.value?.length === 1
        ? managedStores.value[0]?.id
        : manualForm.value.store_id;

    if (!storeId) {
      throw new Error("Please select a store");
    }

    // Upload image if selected
    let imageUrl = manualForm.value.image_url;
    if (selectedImageFile.value) {
      const uploadedUrl = await uploadImageToStorage(selectedImageFile.value);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    console.log("Saving manual entry via API:", {
      storeId,
      productName: manualForm.value.name,
      sku: manualForm.value.sku,
      price: manualForm.value.price,
      imageUrl,
    });

    // Get auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    // Call API endpoint
    const result = await $fetch("/api/admin/manual-inventory", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        store_id: storeId,
        name: manualForm.value.name,
        sku: manualForm.value.sku || undefined,
        barcode: manualForm.value.barcode || undefined,
        retailman_product_id:
          manualForm.value.retailman_product_id || undefined,
        description: manualForm.value.description || undefined,
        price: manualForm.value.price || undefined,
        cost_price: manualForm.value.cost_price || undefined,
        unit: manualForm.value.unit || undefined,
        stock_level: manualForm.value.stock_level,
        digital_buffer: manualForm.value.digital_buffer,
        store_price: manualForm.value.store_price || undefined,
        image_url: imageUrl || undefined,
        is_visible: manualForm.value.is_visible,
      },
    });

    console.log("API result:", result);

    toast.add({
      title: "Success",
      description: `Inventory item ${result.action}`,
      color: "success",
    });
    showManualEntry.value = false;
    resetManualForm();
    await fetchInventory();
  } catch (err: any) {
    console.error("saveManualEntry error:", err);
    toast.add({
      title: "Error",
      description: err?.data?.message || err.message || "Failed to save item",
      color: "error",
    });
  } finally {
    manualSaving.value = false;
  }
};

const resetManualForm = () => {
  manualForm.value = {
    store_id:
      managedStores.value.length === 1
        ? (managedStores.value[0]?.id ?? "")
        : "",
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
  selectedImageFile.value = null;
  imagePreview.value = "";
  if (imageInput.value) {
    imageInput.value.value = "";
  }
};

// Edit Item Methods
const openEditItem = (item: any) => {
  editingItem.value = item;
  editForm.value = {
    stock_level: item.stock_level,
    digital_buffer: item.digital_buffer || 0,
    store_price: item.store_price,
    aisle: item.aisle || "",
    shelf: item.shelf || "",
    section: item.section || "",
    is_visible: item.is_visible,
  };
};

const saveEditItem = async () => {
  if (!editingItem.value) return;

  try {
    const { error } = await (supabase as any)
      .from("store_inventory")
      .update({
        stock_level: editForm.value.stock_level,
        available_stock: editForm.value.stock_level,
        digital_buffer: editForm.value.digital_buffer,
        store_price: editForm.value.store_price,
        aisle: editForm.value.aisle || null,
        shelf: editForm.value.shelf || null,
        section: editForm.value.section || null,
        is_visible: editForm.value.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingItem.value.id);

    if (error) throw error;

    toast.add({
      title: "Success",
      description: "Item updated",
      color: "success",
    });
    editingItem.value = null;
    await fetchInventory();
  } catch (err: any) {
    toast.add({
      title: "Error",
      description: err.message || "Failed to update item",
      color: "error",
    });
  }
};

// Initialize
onMounted(() => {
  resetManualForm();
  fetchInventory();
});
</script>

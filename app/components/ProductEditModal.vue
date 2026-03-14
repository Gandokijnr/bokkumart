<template>
  <Teleport to="body">
    <!-- Slide-over Backdrop -->
    <Transition
      enter-active-class="transition-opacity ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/50 z-50"
        @click="closeModal"
      />
    </Transition>

    <!-- Slide-over Panel -->
    <Transition
      enter-active-class="transform transition ease-in-out duration-300"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition ease-in-out duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="modelValue"
        class="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 flex flex-col"
      >
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50"
        >
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              {{ isEditing ? "Edit Product" : "Create Product" }}
            </h2>
            <p class="text-sm text-gray-500">
              {{
                isEditing
                  ? `SKU: ${form.sku || "N/A"}`
                  : "Add a new product to inventory"
              }}
            </p>
          </div>
          <button
            @click="closeModal"
            class="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg
              class="w-5 h-5 text-gray-500"
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

        <!-- Form Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            ></div>
          </div>

          <template v-else>
            <!-- Image Upload Zone -->
            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-700">
                Product Image
                <span class="text-xs text-gray-400 ml-1"
                  >(Auto-compressed to WebP)</span
                >
              </label>

              <div
                class="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer"
                :class="[
                  imageDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50',
                ]"
                @dragenter.prevent="imageDragActive = true"
                @dragleave.prevent="imageDragActive = false"
                @dragover.prevent
                @drop.prevent="handleImageDrop"
                @click="fileInput?.click()"
              >
                <!-- Image Preview -->
                <div v-if="imagePreview" class="mb-4">
                  <img
                    :src="imagePreview"
                    alt="Product preview"
                    class="mx-auto h-48 w-48 object-cover rounded-lg shadow-md"
                  />
                </div>

                <!-- Upload Icon/Placeholder -->
                <div v-else class="mb-4">
                  <div
                    class="mx-auto h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center"
                  >
                    <svg
                      class="h-8 w-8 text-gray-400"
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
                  </div>
                </div>

                <p class="text-sm font-medium text-gray-900">
                  {{
                    imagePreview
                      ? "Click to change image"
                      : "Drop image here or click to upload"
                  }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Max 5MB. Will be compressed and converted to WebP (800px max)
                </p>

                <!-- Progress Bar -->
                <div
                  v-if="uploadProgress > 0 && uploadProgress < 100"
                  class="mt-3"
                >
                  <div
                    class="h-2 w-full bg-gray-200 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full bg-blue-600 transition-all duration-300"
                      :style="{ width: `${uploadProgress}%` }"
                    />
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ uploadProgress }}% - Compressing...
                  </p>
                </div>

                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleImageSelect"
                />
              </div>

              <!-- Remove Image Button -->
              <div v-if="imagePreview || form.image_url" class="flex gap-2">
                <button
                  type="button"
                  @click.stop="removeImage"
                  class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Remove image
                </button>
              </div>
            </div>

            <!-- Product Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Name -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span class="text-blue-600">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Fresh Cow Milk 1L"
                />
              </div>

              <!-- SKU -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  SKU (Part Number)
                </label>
                <input
                  v-model="form.sku"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., DAIRY-001"
                  :disabled="isEditing"
                />
                <p v-if="isEditing" class="text-xs text-gray-500 mt-1">
                  SKU cannot be changed
                </p>
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  v-model="form.category_id"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <!-- Price -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Price (₦) <span class="text-blue-600">*</span>
                </label>
                <input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <!-- Cost Price -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price (₦)
                </label>
                <input
                  v-model.number="form.cost_price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <!-- Barcode -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Barcode (RetailMan)
                </label>
                <input
                  v-model="form.barcode"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Scan or enter barcode"
                />
              </div>

              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Product description..."
                />
              </div>

              <!-- Visibility Toggle -->
              <div
                class="md:col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <input
                  id="is-visible"
                  v-model="form.is_visible"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  for="is-visible"
                  class="text-sm font-medium text-gray-700"
                >
                  Visible in store (show on website)
                </label>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer Actions -->
        <div
          class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center"
        >
          <button
            v-if="isEditing"
            type="button"
            @click="confirmDelete"
            class="text-blue-600 hover:text-blue-700 font-medium text-sm"
            :disabled="saving"
          >
            Delete Product
          </button>
          <div v-else />

          <div class="flex gap-3">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
              :disabled="saving"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="saveProduct"
              :disabled="saving || !isFormValid"
              class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                v-if="saving"
                class="animate-spin h-4 w-4"
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
                saving
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Product"
              }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteConfirm"
          class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        >
          <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"
              >
                <svg
                  class="h-6 w-6 text-blue-600"
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
              <h3 class="text-lg font-bold text-gray-900">Delete Product?</h3>
            </div>

            <p class="text-sm text-gray-600 mb-4">
              This will permanently delete <strong>{{ form.name }}</strong> and
              remove all associated stock records. This action cannot be undone.
            </p>

            <!-- High-value confirmation -->
            <div v-if="requiresDeleteConfirmation" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Type <span class="font-bold text-blue-600">DELETE</span> to
                confirm:
              </label>
              <input
                v-model="deleteConfirmText"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Type DELETE"
              />
            </div>

            <div class="flex gap-3 justify-end">
              <button
                @click="showDeleteConfirm = false"
                class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                @click="executeDelete"
                :disabled="
                  requiresDeleteConfirmation && deleteConfirmText !== 'DELETE'
                "
                class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ deleting ? "Deleting..." : "Delete Permanently" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Database } from "~/types/database.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

interface Category {
  id: string;
  name: string;
}

interface ProductForm {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: number | null;
  cost_price: number | null;
  category_id: string;
  image_url: string;
  is_visible: boolean;
}

const props = defineProps<{
  modelValue: boolean;
  productSku?: string | null;
  categories: Category[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
  deleted: [];
}>();

const supabase = useSupabaseClient<Database>();
const toast = useToast();
const { compressImage } = useImageCompression();

// State
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const imageDragActive = ref(false);
const imagePreview = ref("");
const uploadProgress = ref(0);
const showDeleteConfirm = ref(false);
const deleteConfirmText = ref("");

const form = ref<ProductForm>({
  name: "",
  sku: "",
  barcode: "",
  description: "",
  price: null,
  cost_price: null,
  category_id: "",
  image_url: "",
  is_visible: true,
});

const isEditing = computed(() => !!props.productSku);

const isFormValid = computed(() => {
  return (
    form.value.name.trim() && form.value.price !== null && form.value.price > 0
  );
});

// High-value items require DELETE confirmation
const requiresDeleteConfirmation = computed(() => {
  return (form.value.price || 0) > 10000; // Products over ₦10,000
});

// Watch for modal open/close
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      if (props.productSku) {
        await fetchProduct();
      } else {
        resetForm();
      }
    }
  },
);

function resetForm() {
  form.value = {
    name: "",
    sku: "",
    barcode: "",
    description: "",
    price: null,
    cost_price: null,
    category_id: "",
    image_url: "",
    is_visible: true,
  };
  imagePreview.value = "";
  uploadProgress.value = 0;
  deleteConfirmText.value = "";
}

function closeModal() {
  emit("update:modelValue", false);
}

async function fetchProduct() {
  if (!props.productSku) return;

  loading.value = true;
  try {
    const { data, error } = (await supabase
      .from("products")
      .select("*")
      .eq("sku", props.productSku)
      .single()) as { data: ProductRow | null; error: unknown };

    if (error) throw error;

    if (data) {
      form.value = {
        id: data.id,
        name: data.name || "",
        sku: data.sku || "",
        barcode: data.barcode || "",
        description: data.description || "",
        price: data.price || null,
        cost_price: data.cost_price || null,
        category_id: data.category_id || "",
        image_url: data.image_url || "",
        is_visible: data.is_visible !== false,
      };
      imagePreview.value = data.image_url || "";
    }
  } catch (err: any) {
    toast.add({
      title: "Error",
      description: err.message || "Failed to load product",
      color: "error",
    });
    closeModal();
  } finally {
    loading.value = false;
  }
}

async function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    await processImage(input.files[0]);
  }
}

async function handleImageDrop(event: DragEvent) {
  imageDragActive.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0] && files[0].type.startsWith("image/")) {
    await processImage(files[0]);
  }
}

async function processImage(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      title: "Error",
      description: "Image must be less than 5MB",
      color: "error",
    });
    return;
  }

  try {
    uploadProgress.value = 10;

    // Compress image
    const compressedBlob = await compressImage(file, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85,
      type: "image/webp",
    });

    uploadProgress.value = 50;

    // Create preview
    imagePreview.value = URL.createObjectURL(compressedBlob);

    // Upload to Supabase
    const fileName = `${form.value.sku || "product"}_${Date.now()}.webp`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filePath, compressedBlob, {
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) throw uploadError;

    uploadProgress.value = 90;

    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(filePath);

    form.value.image_url = publicUrl;
    uploadProgress.value = 100;

    toast.add({
      title: "Success",
      description: "Image uploaded and compressed",
      color: "success",
    });
  } catch (err: any) {
    toast.add({
      title: "Upload Failed",
      description: err.message || "Failed to process image",
      color: "error",
    });
    uploadProgress.value = 0;
  }
}

function removeImage() {
  imagePreview.value = "";
  form.value.image_url = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

async function saveProduct() {
  saving.value = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) throw new Error("Not authenticated");

    const endpoint = isEditing.value
      ? "/api/admin/products/update"
      : "/api/admin/products/create";
    const method = isEditing.value ? "PATCH" : "POST";

    await $fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        ...form.value,
        price: form.value.price || 0,
      },
    });

    toast.add({
      title: "Success",
      description: isEditing.value ? "Product updated" : "Product created",
      color: "success",
    });

    emit("saved");
    closeModal();
  } catch (err: any) {
    toast.add({
      title: "Error",
      description:
        err?.data?.message || err?.message || "Failed to save product",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

function confirmDelete() {
  deleteConfirmText.value = "";
  showDeleteConfirm.value = true;
}

async function executeDelete() {
  if (
    requiresDeleteConfirmation.value &&
    deleteConfirmText.value !== "DELETE"
  ) {
    return;
  }

  deleting.value = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) throw new Error("Not authenticated");

    await $fetch("/api/admin/products/delete", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        sku: form.value.sku,
      },
    });

    toast.add({
      title: "Deleted",
      description: "Product and associated inventory removed",
      color: "success",
    });

    showDeleteConfirm.value = false;
    emit("deleted");
    closeModal();
  } catch (err: any) {
    toast.add({
      title: "Error",
      description:
        err?.data?.message || err?.message || "Failed to delete product",
      color: "error",
    });
  } finally {
    deleting.value = false;
  }
}
</script>

import { defineStore } from "pinia";
import type { Database } from "../types/database.types";

/**
 * Branch Interface
 * Represents a BokkuMart store/branch location
 */
export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  operating_hours: Record<
    string,
    { open: string; close: string; isOpen: boolean }
  >;
  created_at?: string;
  updated_at?: string;
}

/**
 * Branch State Interface
 */
export interface BranchState {
  activeBranch: Branch | null;
  branches: Branch[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

/**
 * Storage key for localStorage persistence
 */
const STORAGE_KEY = "ha_active_branch";
const BRANCHES_CACHE_KEY = "ha_branches_cache";
const BRANCHES_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let branchesFetchPromise: Promise<boolean> | null = null;

/**
 * useBranchStore - Pinia store for managing the active branch/location
 *
 * Features:
 * - Persists activeBranch across page refreshes via localStorage
 * - Fetches all branches from Supabase
 * - Provides branch switching with cart conflict detection
 * - Integrates with the existing cart store for branch-locking
 */
export const useBranchStore = defineStore("branch", {
  state: (): BranchState => ({
    activeBranch: null,
    branches: [],
    loading: false,
    error: null,
    lastUpdated: null,
  }),

  getters: {
    /**
     * Check if a branch is currently selected
     */
    hasActiveBranch: (state): boolean => {
      return state.activeBranch !== null;
    },

    /**
     * Get the active branch ID
     */
    activeBranchId: (state): string | null => {
      return state.activeBranch?.id || null;
    },

    /**
     * Get the active branch name (for display)
     */
    activeBranchName: (state): string => {
      return state.activeBranch?.name || "Select Store";
    },

    /**
     * Get the active branch address (for display)
     */
    activeBranchAddress: (state): string => {
      return state.activeBranch?.address || "";
    },

    /**
     * Check if the active branch is currently open
     */
    isBranchOpen: (state): boolean => {
      if (!state.activeBranch) return false;

      const now = new Date();
      const dayOfWeek = now
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const hours = state.activeBranch.operating_hours?.[dayOfWeek];

      if (!hours || !hours.isOpen) return false;

      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [openHour, openMin] = hours.open.split(":").map(Number);
      const [closeHour, closeMin] = hours.close.split(":").map(Number);
      const openTime = (openHour || 0) * 60 + (openMin || 0);
      const closeTime = (closeHour || 0) * 60 + (closeMin || 0);

      return currentTime >= openTime && currentTime <= closeTime;
    },

    /**
     * Get active branch's today's operating hours
     */
    todayHours: (state): string => {
      if (!state.activeBranch) return "";

      const dayOfWeek = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const hours = state.activeBranch.operating_hours?.[dayOfWeek];

      if (!hours || !hours.isOpen) return "Closed today";
      return `${hours.open} - ${hours.close}`;
    },

    /**
     * Get a branch by ID
     */
    getBranchById:
      (state) =>
      (id: string): Branch | undefined => {
        return state.branches.find((b) => b.id === id);
      },

    /**
     * Get all active branches
     */
    activeBranches: (state): Branch[] => {
      return state.branches.filter((b) => b.is_active);
    },
  },

  actions: {
    hydrateBranchesFromCache(): boolean {
      if (!import.meta.client) return false;
      try {
        const raw = localStorage.getItem(BRANCHES_CACHE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.branches)) return false;
        this.branches = parsed.branches;
        this.lastUpdated =
          typeof parsed.lastUpdated === "number" ? parsed.lastUpdated : null;
        return true;
      } catch {
        return false;
      }
    },

    persistBranchesToCache() {
      if (!import.meta.client) return;
      try {
        localStorage.setItem(
          BRANCHES_CACHE_KEY,
          JSON.stringify({
            branches: this.branches,
            lastUpdated: this.lastUpdated || Date.now(),
          }),
        );
      } catch {
        // ignore
      }
    },

    branchesCacheFresh(): boolean {
      const last = this.lastUpdated;
      if (!last) return false;
      return Date.now() - last < BRANCHES_CACHE_TTL_MS;
    },

    /**
     * Fetch all branches from Supabase
     */
    async fetchBranches(supabase: any): Promise<boolean> {
      if (branchesFetchPromise) return branchesFetchPromise;

      this.loading = true;
      this.error = null;

      branchesFetchPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from("stores")
            .select(
              "id, name, address, city, state, phone, email, latitude, longitude, is_active, operating_hours, created_at, updated_at",
            )
            .eq("is_active", true)
            .order("name", { ascending: true });

          if (error) throw error;

          this.branches = data || [];
          this.lastUpdated = Date.now();
          this.persistBranchesToCache();
          return true;
        } catch (err: any) {
          const msg = String(err?.message || "");
          const isAbort =
            err?.name === "AbortError" || msg.includes("AbortError");
          if (!isAbort) {
            this.error = err.message || "Failed to fetch branches";
            console.error("Error fetching branches:", err);
          }
          return false;
        } finally {
          this.loading = false;
          branchesFetchPromise = null;
        }
      })();

      return branchesFetchPromise;
    },

    /**
     * Set the active branch
     */
    setActiveBranch(branch: Branch | null) {
      this.activeBranch = branch;
      this.saveToLocalStorage();
    },

    /**
     * Clear the active branch (forces re-selection)
     */
    clearActiveBranch() {
      this.activeBranch = null;
      this.saveToLocalStorage();
    },

    /**
     * Switch to a different branch
     * Returns object indicating if cart needs clearing
     */
    switchBranch(branchId: string): {
      success: boolean;
      requiresCartClear: boolean;
      newBranch: Branch | null;
      error?: string;
    } {
      const newBranch = this.getBranchById(branchId);

      if (!newBranch) {
        return {
          success: false,
          requiresCartClear: false,
          newBranch: null,
          error: "Branch not found",
        };
      }

      // Check if we're switching to a different branch
      if (this.activeBranch?.id === branchId) {
        return {
          success: true,
          requiresCartClear: false,
          newBranch,
        };
      }

      this.setActiveBranch(newBranch);

      return {
        success: true,
        requiresCartClear: true, // Cart should be checked for conflicts
        newBranch,
      };
    },

    /**
     * Save active branch to localStorage
     * Persists across page refreshes
     */
    saveToLocalStorage() {
      if (import.meta.client) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              activeBranch: this.activeBranch,
              lastUpdated: this.lastUpdated,
            }),
          );
        } catch (e) {
          console.error("Failed to save branch to localStorage:", e);
        }
      }
    },

    /**
     * Load active branch from localStorage
     * Call on app initialization
     */
    loadFromLocalStorage(): boolean {
      if (import.meta.client) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            this.activeBranch = parsed.activeBranch || null;
            this.lastUpdated = parsed.lastUpdated || null;
            return true;
          }
        } catch (e) {
          console.error("Failed to load branch from localStorage:", e);
        }
      }
      return false;
    },

    /**
     * Sync branch preference with Supabase (for logged-in users)
     */
    async syncWithSupabase(supabase: any): Promise<boolean> {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase.from("user_preferences").upsert(
          {
            user_id: user.id,
            last_selected_branch_id: this.activeBranch?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Failed to sync branch preference:", err);
        return false;
      }
    },

    /**
     * Check if a product is available at the active branch
     * Queries the inventory table for branch-specific availability
     */
    async checkProductAvailability(
      supabase: any,
      productId: string,
    ): Promise<{
      available: boolean;
      quantity: number;
      branchId: string | null;
    }> {
      if (!this.activeBranch) {
        return { available: false, quantity: 0, branchId: null };
      }

      try {
        const { data, error } = await supabase
          .from("store_inventory")
          .select("available_stock")
          .eq("store_id", this.activeBranch.id)
          .eq("product_id", productId)
          .single();

        if (error || !data) {
          return {
            available: false,
            quantity: 0,
            branchId: this.activeBranch.id,
          };
        }

        const availableQty = data.available_stock ?? 0;
        return {
          available: availableQty > 0,
          quantity: availableQty,
          branchId: this.activeBranch.id,
        };
      } catch (err) {
        console.error("Error checking product availability:", err);
        return {
          available: false,
          quantity: 0,
          branchId: this.activeBranch.id,
        };
      }
    },

    /**
     * Find alternative branches where a product is available
     * For the "Global Search Exception" feature
     */
    async findAlternativeBranches(
      supabase: any,
      productId: string,
    ): Promise<Array<{ branch: Branch; quantity: number }>> {
      try {
        // First check which branches have this product in stock
        const { data: inventoryData, error } = await supabase
          .from("store_inventory")
          .select("store_id, available_stock")
          .eq("product_id", productId)
          .gt("available_stock", 0);

        if (error || !inventoryData || inventoryData.length === 0) {
          return [];
        }

        // Map to branch objects with quantities
        const results: Array<{ branch: Branch; quantity: number }> = [];

        for (const item of inventoryData) {
          const branch = this.getBranchById(item.store_id);
          if (branch && branch.is_active) {
            results.push({
              branch,
              quantity: item.available_stock ?? 0,
            });
          }
        }

        // Sort by quantity (highest first)
        return results.sort((a, b) => b.quantity - a.quantity);
      } catch (err) {
        console.error("Error finding alternative branches:", err);
        return [];
      }
    },

    /**
     * Initialize the branch store
     * Load from localStorage and optionally sync with Supabase
     */
    async initialize(supabase?: any) {
      this.loadFromLocalStorage();

      this.hydrateBranchesFromCache();

      const cacheFresh = this.branchesCacheFresh();

      if (supabase && cacheFresh) {
        supabase
          .from("stores")
          .select(
            "id, name, address, city, state, phone, email, latitude, longitude, is_active, operating_hours, created_at, updated_at",
          )
          .eq("is_active", true)
          .order("name", { ascending: true })
          .then(({ data, error }: any) => {
            if (!error && data) {
              this.branches = data;
              this.lastUpdated = Date.now();
              this.persistBranchesToCache();
            }
          })
          .catch(() => {
            // ignore
          });
      }

      // Fetch fresh branch list
      if (supabase) {
        if (!cacheFresh || this.branches.length === 0) {
          await this.fetchBranches(supabase);
        }

        // If we have a stored branch, verify it still exists and is active
        if (this.activeBranch) {
          const stillValid = this.branches.find(
            (b) => b.id === this.activeBranch!.id && b.is_active,
          );
          if (!stillValid) {
            // Branch no longer available, clear it
            this.clearActiveBranch();
          }
        }
      }
    },
  },
});

// Platform Revenue Store - Financial Intelligence Module
import { defineStore } from "pinia";

export type RevenueStatus = "pending" | "locked" | "paid" | "disputed";

export interface RevenueBreakdown {
  id: string;
  store_id: string;
  store_name: string;
  order_count: number;
  subtotal: number;
  platform_fee: number;
  delivery_fees: number;
}

export interface RevenueRecord {
  id: string;
  month: number;
  year: number;
  month_name: string;
  total_orders: number;
  subtotal: number;
  platform_percentage: number;
  platform_fee: number;
  delivery_fees_excluded: number;
  status: RevenueStatus;
  invoice_number: string | null;
  invoice_generated_at: string | null;
  generated_at: string;
  notes: string | null;
  breakdown: RevenueBreakdown[];
}

export interface AuditLogEntry {
  id: string;
  platform_revenue_id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  previous_total: number | null;
  new_total: number | null;
  previous_platform_fee: number | null;
  new_platform_fee: number | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CalculateParams {
  month: number;
  year: number;
  excludeDeliveryFees?: boolean;
  forceRecalculate?: boolean;
}

interface PlatformRevenueState {
  records: RevenueRecord[];
  auditLogs: AuditLogEntry[];
  loading: boolean;
  calculating: boolean;
  locking: string | null;
  generatingInvoice: string | null;
  selectedMonth: number;
  selectedYear: number;
  error: string | null;
}

export const usePlatformRevenueStore = defineStore("platformRevenue", {
  state: (): PlatformRevenueState => ({
    records: [],
    auditLogs: [],
    loading: false,
    calculating: false,
    locking: null,
    generatingInvoice: null,
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),
    error: null,
  }),

  getters: {
    // Get revenue for the currently selected month/year
    currentMonthRevenue: (state): RevenueRecord | undefined => {
      return state.records.find(
        (r) => r.month === state.selectedMonth && r.year === state.selectedYear,
      );
    },

    // Check if current selection is locked
    isCurrentLocked: (state): boolean => {
      const record = state.records.find(
        (r) => r.month === state.selectedMonth && r.year === state.selectedYear,
      );
      return record?.status === "locked";
    },

    // Check if current selection can be calculated
    canCalculate: (state): boolean => {
      const record = state.records.find(
        (r) => r.month === state.selectedMonth && r.year === state.selectedYear,
      );
      // Can calculate if no record exists, or if status is not locked
      return !record || record.status !== "locked";
    },

    // Total platform fees across all records
    totalPlatformFees: (state): number => {
      return state.records.reduce((sum, r) => sum + (r.platform_fee || 0), 0);
    },

    // Total orders across all records
    totalOrders: (state): number => {
      return state.records.reduce((sum, r) => sum + (r.total_orders || 0), 0);
    },

    // Total subtotal across all records
    totalSubtotal: (state): number => {
      return state.records.reduce((sum, r) => sum + (r.subtotal || 0), 0);
    },

    // Get sorted records (newest first)
    sortedRecords: (state): RevenueRecord[] => {
      return [...state.records].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
    },

    // Get audit logs for a specific revenue record
    getAuditLogsForRevenue:
      (state) =>
      (revenueId: string): AuditLogEntry[] => {
        return state.auditLogs
          .filter((log) => log.platform_revenue_id === revenueId)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
      },

    // Check if any operation is in progress
    isBusy: (state): boolean => {
      return (
        state.loading ||
        state.calculating ||
        !!state.locking ||
        !!state.generatingInvoice
      );
    },
  },

  actions: {
    // Fetch all revenue records
    async fetchRecords(limit: number = 24) {
      this.loading = true;
      this.error = null;

      try {
        const { data } = await $fetch<{
          success: boolean;
          data: RevenueRecord[];
        }>("/api/admin/platform-revenue", {
          params: { limit },
        });
        this.records = data || [];
      } catch (error: any) {
        this.error = error.message || "Failed to fetch revenue data";
        console.error("Fetch revenue records error:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Calculate revenue for selected month/year
    async calculateRevenue(params: CalculateParams) {
      this.calculating = true;
      this.error = null;

      try {
        const result = await $fetch<{ success: boolean; data: any }>(
          "/api/admin/platform-revenue/calculate",
          {
            method: "POST",
            body: params,
          },
        );

        // Refresh records to get updated data
        await this.fetchRecords();

        return result.data;
      } catch (error: any) {
        this.error = error.message || "Failed to calculate revenue";
        console.error("Calculate revenue error:", error);
        throw error;
      } finally {
        this.calculating = false;
      }
    },

    // Lock or unlock a revenue record
    async toggleLock(revenueId: string, currentStatus: RevenueStatus) {
      const newStatus = currentStatus === "locked" ? "pending" : "locked";
      this.locking = revenueId;
      this.error = null;

      try {
        await $fetch("/api/admin/platform-revenue/lock", {
          method: "PATCH",
          body: {
            id: revenueId,
            status: newStatus,
          },
        });

        // Update local state reactively
        const record = this.records.find((r) => r.id === revenueId);
        if (record) {
          record.status = newStatus;
        }

        return newStatus;
      } catch (error: any) {
        this.error = error.message || "Failed to update lock status";
        console.error("Toggle lock error:", error);
        throw error;
      } finally {
        this.locking = null;
      }
    },

    // Generate invoice for a revenue record
    async generateInvoice(revenueId: string, dueDays: number = 7) {
      this.generatingInvoice = revenueId;
      this.error = null;

      try {
        const result = await $fetch<{ success: boolean; data: any }>(
          "/api/admin/platform-revenue/generate-invoice",
          {
            method: "POST",
            body: {
              id: revenueId,
              dueDays,
            },
          },
        );

        // Refresh records to get updated invoice data
        await this.fetchRecords();

        return result.data;
      } catch (error: any) {
        this.error = error.message || "Failed to generate invoice";
        console.error("Generate invoice error:", error);
        throw error;
      } finally {
        this.generatingInvoice = null;
      }
    },

    // Export CSV for a specific month/year
    exportCSV(month: number, year: number) {
      const url = `/api/admin/platform-revenue/export-csv?month=${month}&year=${year}`;
      window.open(url, "_blank");
    },

    // Fetch audit logs for a revenue record
    async fetchAuditLogs(revenueId: string) {
      try {
        const { data } = await $fetch<{
          success: boolean;
          data: AuditLogEntry[];
        }>("/api/admin/platform-revenue/audit-logs", {
          params: { revenueId },
        });

        // Merge with existing audit logs, avoiding duplicates
        const newLogs = data || [];
        const existingIds = new Set(this.auditLogs.map((l) => l.id));
        const uniqueNewLogs = newLogs.filter((l) => !existingIds.has(l.id));
        this.auditLogs = [...uniqueNewLogs, ...this.auditLogs];

        return newLogs;
      } catch (error: any) {
        console.error("Fetch audit logs error:", error);
        throw error;
      }
    },

    // Set selected month/year
    setSelectedMonthYear(month: number, year: number) {
      this.selectedMonth = month;
      this.selectedYear = year;
    },

    // Check if a specific record is being locked
    isLocking(revenueId: string): boolean {
      return this.locking === revenueId;
    },

    // Check if a specific record is having invoice generated
    isGeneratingInvoice(revenueId: string): boolean {
      return this.generatingInvoice === revenueId;
    },

    // Get status color for UI
    getStatusColor(status: RevenueStatus): string {
      switch (status) {
        case "paid":
          return "green";
        case "locked":
          return "amber";
        case "disputed":
          return "red";
        default:
          return "gray";
      }
    },

    // Format currency
    formatCurrency(amount: number): string {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
      }).format(amount || 0);
    },

    // Format number
    formatNumber(num: number): string {
      return new Intl.NumberFormat("en-NG").format(num || 0);
    },

    // Get month name
    getMonthName(month: number): string {
      return new Date(2020, month - 1, 1).toLocaleString("default", {
        month: "long",
      });
    },

    // Clear error
    clearError() {
      this.error = null;
    },
  },
});

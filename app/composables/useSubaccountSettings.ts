import { ref } from 'vue'

interface SubaccountSettings {
  paystack_subaccount_code: string | null
  paystack_settlement_bank_name: string | null
  paystack_settlement_account_number: string | null
  platform_percentage: number | null
  fixed_commission: number | null
}

interface UpdateSubaccountPayload {
  storeId: string
  paystackSubaccountCode?: string
  paystackSettlementBankName?: string
  paystackSettlementAccountNumber?: string
  platformPercentage?: number
  fixedCommission?: number
}

export function useSubaccountSettings() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref(false)

  async function updateSubaccount(payload: UpdateSubaccountPayload): Promise<boolean> {
    loading.value = true
    error.value = null
    success.value = false

    try {
      const response = await $fetch('/api/admin/stores/update-subaccount', {
        method: 'PATCH',
        body: payload
      })

      success.value = true
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to update subaccount settings'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    success,
    updateSubaccount
  }
}

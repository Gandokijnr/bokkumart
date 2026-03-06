import { defineEventHandler, readBody, createError } from 'h3'

interface UpdateSubaccountRequest {
  storeId: string
  paystackSubaccountCode?: string
  paystackSettlementBankName?: string
  paystackSettlementAccountNumber?: string
  platformPercentage?: number
  fixedCommission?: number
}

interface UpdateSubaccountResponse {
  success: boolean
  message: string
  store: {
    id: string
    name: string
    paystack_subaccount_code: string | null
    paystack_settlement_bank_name: string | null
    paystack_settlement_account_number: string | null
    platform_percentage: number | null
    fixed_commission: number | null
  }
}

export default defineEventHandler(async (event): Promise<UpdateSubaccountResponse> => {
  try {
    const body = await readBody<UpdateSubaccountRequest>(event)
    const { 
      storeId, 
      paystackSubaccountCode, 
      paystackSettlementBankName,
      paystackSettlementAccountNumber,
      platformPercentage,
      fixedCommission
    } = body

    if (!storeId) {
      throw createError({
        statusCode: 400,
        message: 'storeId is required'
      })
    }

    // Get current user context
    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    const isSuperAdmin = user.role === 'super_admin'
    const isBranchManager = user.role === 'branch_manager'
    
    // Only super_admin or branch_manager can update subaccount
    if (!isSuperAdmin && !isBranchManager) {
      throw createError({
        statusCode: 403,
        message: 'Only super admin or branch manager can update subaccount settings'
      })
    }

    // Branch managers can only update their own branch
    if (isBranchManager && user.store_id !== storeId) {
      throw createError({
        statusCode: 403,
        message: 'You can only update your assigned branch'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const config = useRuntimeConfig()

    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceRoleKey as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify store exists
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      throw createError({
        statusCode: 404,
        message: 'Store not found'
      })
    }

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (paystackSubaccountCode !== undefined) {
      // Validate Paystack subaccount code format (starts with ACCT_)
      if (paystackSubaccountCode && !paystackSubaccountCode.startsWith('ACCT_')) {
        throw createError({
          statusCode: 400,
          message: 'Invalid Paystack subaccount code. Must start with ACCT_'
        })
      }
      updates.paystack_subaccount_code = paystackSubaccountCode || null
    }

    if (paystackSettlementBankName !== undefined) {
      updates.paystack_settlement_bank_name = paystackSettlementBankName || null
    }

    if (paystackSettlementAccountNumber !== undefined) {
      // Validate account number (10 digits)
      if (paystackSettlementAccountNumber && !/^\d{10}$/.test(paystackSettlementAccountNumber)) {
        throw createError({
          statusCode: 400,
          message: 'Invalid account number. Must be 10 digits'
        })
      }
      updates.paystack_settlement_account_number = paystackSettlementAccountNumber || null
    }

    if (platformPercentage !== undefined) {
      // Validate percentage (0-100)
      if (platformPercentage < 0 || platformPercentage > 100) {
        throw createError({
          statusCode: 400,
          message: 'Platform percentage must be between 0 and 100'
        })
      }
      updates.platform_percentage = platformPercentage
    }

    if (fixedCommission !== undefined) {
      // Validate commission (non-negative)
      if (fixedCommission < 0) {
        throw createError({
          statusCode: 400,
          message: 'Fixed commission cannot be negative'
        })
      }
      updates.fixed_commission = fixedCommission
    }

    // Update store
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', storeId)
      .select('id, name, paystack_subaccount_code, paystack_settlement_bank_name, paystack_settlement_account_number, platform_percentage, fixed_commission')
      .single()

    if (updateError) {
      console.error('Error updating subaccount:', updateError)
      throw createError({
        statusCode: 500,
        message: 'Failed to update subaccount settings'
      })
    }

    // Log the change
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: user.full_name || user.email,
      action_type: 'subaccount_update',
      entity_type: 'store',
      entity_id: storeId,
      store_id: storeId,
      store_name: store.name,
      description: `Updated Paystack subaccount settings for ${store.name}`,
      metadata: {
        updated_fields: Object.keys(updates).filter(k => k !== 'updated_at'),
        previous_values: null, // Could fetch previous if needed
        user_role: user.role
      }
    })

    return {
      success: true,
      message: 'Subaccount settings updated successfully',
      store: updatedStore
    }

  } catch (err: any) {
    console.error('Error updating subaccount:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to update subaccount settings'
    })
  }
})

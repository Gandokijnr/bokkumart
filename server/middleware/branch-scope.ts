// Branch-scoped admin middleware
// Ensures branch managers can only access their assigned branch data

import { defineEventHandler, createError, type H3Event } from 'h3'

interface UserContext {
  id: string
  role: string
  store_id?: string
  managed_store_ids?: string[]
}

export default defineEventHandler(async (event: H3Event) => {
  // Skip for non-admin routes
  const path = event.path || ''
  if (!path.startsWith('/api/admin') && !path.startsWith('/admin')) {
    return
  }

  // Skip for super_admin (full access)
  const user = event.context.user as UserContext | undefined
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  // Super admin has full access to all branches
  if (user.role === 'super_admin') {
    event.context.isSuperAdmin = true
    event.context.allowedStoreIds = null // null = all stores
    return
  }

  // Branch manager - scope to their assigned branch
  if (user.role === 'branch_manager') {
    const storeId = user.store_id
    if (!storeId) {
      throw createError({
        statusCode: 403,
        message: 'Branch manager not assigned to any store'
      })
    }

    event.context.isBranchManager = true
    event.context.assignedStoreId = storeId
    event.context.allowedStoreIds = [storeId]

    // Add store_id filter to query params if not present
    const query = getQuery(event)
    if (!query.store_id) {
      query.store_id = storeId
    }

    return
  }

  // Staff - may have store assignment
  if (user.role === 'staff') {
    if (user.store_id) {
      event.context.assignedStoreId = user.store_id
      event.context.allowedStoreIds = [user.store_id]
    }
    return
  }

  // Driver - scope to their assigned branch
  if (user.role === 'driver') {
    const storeId = user.store_id
    if (!storeId) {
      throw createError({
        statusCode: 403,
        message: 'Driver not assigned to any store'
      })
    }

    event.context.isDriver = true
    event.context.assignedStoreId = storeId
    event.context.allowedStoreIds = [storeId]
    return
  }
})

function getQuery(event: H3Event) {
  return event.context.query || {}
}

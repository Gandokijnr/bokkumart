import { defineEventHandler, readBody, createError } from 'h3'

interface ApplyReferralRequest {
  referralCode: string
  userId: string
}

interface ApplyReferralResponse {
  success: boolean
  message: string
  referrerName?: string
  reward?: {
    type: string
    value: number
  }
}

export default defineEventHandler(async (event): Promise<ApplyReferralResponse> => {
  try {
    const body = await readBody<ApplyReferralRequest>(event)
    const { referralCode, userId } = body

    if (!referralCode || !userId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: referralCode, userId'
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

    // Check if user is trying to use their own code
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    if (ownProfile?.referral_code?.toUpperCase() === referralCode.toUpperCase()) {
      return {
        success: false,
        message: 'You cannot use your own referral code'
      }
    }

    // Check if user already has a referrer
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', userId)
      .single()

    if (userProfile?.referred_by) {
      return {
        success: false,
        message: 'You have already applied a referral code'
      }
    }

    // Find referrer by their referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code')
      .eq('referral_code', referralCode.toUpperCase())
      .neq('id', userId)
      .single()

    if (referrerError || !referrer) {
      return {
        success: false,
        message: 'Invalid referral code'
      }
    }

    // Update user's profile with referrer info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        referred_by: referrer.id,
        loyalty_points: 500 // Give 500 points as signup bonus
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating referral:', updateError)
      throw createError({
        statusCode: 500,
        message: 'Failed to apply referral code'
      })
    }

    // Add loyalty transaction for the new user
    await supabase.from('loyalty_transactions').insert({
      user_id: userId,
      points_earned: 500,
      points_redeemed: 0,
      description: `Referral bonus - signed up with ${referrer.full_name || 'friend'}`,
      transaction_type: 'bonus'
    })

    // Add loyalty transaction for the referrer
    await supabase.from('loyalty_transactions').insert({
      user_id: referrer.id,
      points_earned: 500,
      points_redeemed: 0,
      description: `Referral reward - ${referrer.full_name || 'someone'} joined using your code`,
      transaction_type: 'bonus'
    })

    // Update referrer's loyalty points
    await supabase.rpc('increment_loyalty_points', {
      p_user_id: referrer.id,
      p_points: 500
    })

    return {
      success: true,
      referrerName: referrer.full_name || 'Your friend',
      message: 'Referral code applied successfully! You earned 500 loyalty points.',
      reward: {
        type: 'loyalty_points',
        value: 500
      }
    }
  } catch (err: any) {
    console.error('Error applying referral code:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to apply referral code'
    })
  }
})

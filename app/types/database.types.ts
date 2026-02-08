// Generated types for Supabase database schema
// Based on migrations in /supabase/migrations/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone_number: string | null
          default_address: Json | null
          loyalty_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone_number?: string | null
          default_address?: Json | null
          loyalty_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone_number?: string | null
          default_address?: Json | null
          loyalty_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          label: 'home' | 'work' | 'other'
          street_address: string
          area: string
          city: string
          state: string
          landmark: string
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: 'home' | 'work' | 'other'
          street_address: string
          area: string
          city?: string
          state?: string
          landmark: string
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: 'home' | 'work' | 'other'
          street_address?: string
          area?: string
          city?: string
          state?: string
          landmark?: string
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          store_id: string
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_address: Json
          delivery_instructions: string | null
          payment_method: 'cash_on_delivery' | 'online_payment'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          delivery_fee: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_address: Json
          delivery_instructions?: string | null
          payment_method: 'cash_on_delivery' | 'online_payment'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          delivery_fee?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount?: number
          delivery_address?: Json
          delivery_instructions?: string | null
          payment_method?: 'cash_on_delivery' | 'online_payment'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          delivery_fee?: number
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
      }
      loyalty_transactions: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          points_earned: number
          points_redeemed: number
          description: string
          transaction_type: 'earned' | 'redeemed' | 'bonus' | 'expired'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          points_earned?: number
          points_redeemed?: number
          description: string
          transaction_type: 'earned' | 'redeemed' | 'bonus' | 'expired'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string | null
          points_earned?: number
          points_redeemed?: number
          description?: string
          transaction_type?: 'earned' | 'redeemed' | 'bonus' | 'expired'
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          sku: string | null
          category_id: string | null
          price: number
          cost_price: number | null
          unit: string
          image_url: string | null
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sku?: string | null
          category_id?: string | null
          price?: number
          cost_price?: number | null
          unit?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sku?: string | null
          category_id?: string | null
          price?: number
          cost_price?: number | null
          unit?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          code: string
          address: string
          city: string
          state: string
          latitude: number
          longitude: number
          phone: string | null
          email: string | null
          operating_hours: Json
          pickup_instructions: string | null
          delivery_radius_km: number
          base_delivery_fee: number
          per_km_delivery_fee: number
          is_active: boolean
          is_flagship: boolean
          features: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address: string
          city?: string
          state?: string
          latitude: number
          longitude: number
          phone?: string | null
          email?: string | null
          operating_hours?: Json
          pickup_instructions?: string | null
          delivery_radius_km?: number
          base_delivery_fee?: number
          per_km_delivery_fee?: number
          is_active?: boolean
          is_flagship?: boolean
          features?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string
          city?: string
          state?: string
          latitude?: number
          longitude?: number
          phone?: string | null
          email?: string | null
          operating_hours?: Json
          pickup_instructions?: string | null
          delivery_radius_km?: number
          base_delivery_fee?: number
          per_km_delivery_fee?: number
          is_active?: boolean
          is_flagship?: boolean
          features?: Json
          created_at?: string
          updated_at?: string
        }
      }
      store_inventory: {
        Row: {
          id: string
          store_id: string
          product_id: string
          stock_level: number
          reserved_stock: number
          available_stock: number
          digital_buffer: number
          is_visible: boolean
          store_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          stock_level?: number
          reserved_stock?: number
          digital_buffer?: number
          is_visible?: boolean
          store_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          stock_level?: number
          reserved_stock?: number
          digital_buffer?: number
          is_visible?: boolean
          store_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      order_interactions: {
        Row: {
          id: string
          order_id: string
          staff_id: string
          interaction_type: 'call_attempt' | 'verification' | 'rejection' | 'status_change' | 'note_added' | 'rider_assigned' | 'customer_complaint'
          outcome: 'answered' | 'no_answer' | 'busy' | 'wrong_number' | 'confirmed' | 'rejected' | 'callback_requested' | 'voicemail' | 'disconnected' | null
          notes: string | null
          metadata: Json
          created_at: string
          verified_address: boolean
          verified_amount: boolean
          verified_substitutions: boolean
          substitution_approved: boolean
          substitution_details: string | null
        }
        Insert: {
          id?: string
          order_id: string
          staff_id: string
          interaction_type: 'call_attempt' | 'verification' | 'rejection' | 'status_change' | 'note_added' | 'rider_assigned' | 'customer_complaint'
          outcome?: 'answered' | 'no_answer' | 'busy' | 'wrong_number' | 'confirmed' | 'rejected' | 'callback_requested' | 'voicemail' | 'disconnected' | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          verified_address?: boolean
          verified_amount?: boolean
          verified_substitutions?: boolean
          substitution_approved?: boolean
          substitution_details?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          staff_id?: string
          interaction_type?: 'call_attempt' | 'verification' | 'rejection' | 'status_change' | 'note_added' | 'rider_assigned' | 'customer_complaint'
          outcome?: 'answered' | 'no_answer' | 'busy' | 'wrong_number' | 'confirmed' | 'rejected' | 'callback_requested' | 'voicemail' | 'disconnected' | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          verified_address?: boolean
          verified_amount?: boolean
          verified_substitutions?: boolean
          substitution_approved?: boolean
          substitution_details?: string | null
        }
      }
      rider_dispatches: {
        Row: {
          id: string
          order_id: string
          rider_name: string
          rider_phone: string | null
          rider_vehicle_type: string
          dispatched_by: string
          dispatched_at: string
          estimated_arrival: string | null
          actual_pickup_at: string | null
          actual_delivery_at: string | null
          status: 'dispatched' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'
          customer_notified: boolean
          customer_notification_sent_at: string | null
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          rider_name: string
          rider_phone?: string | null
          rider_vehicle_type?: string
          dispatched_by: string
          dispatched_at?: string
          estimated_arrival?: string | null
          actual_pickup_at?: string | null
          actual_delivery_at?: string | null
          status?: 'dispatched' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'
          customer_notified?: boolean
          customer_notification_sent_at?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          rider_name?: string
          rider_phone?: string | null
          rider_vehicle_type?: string
          dispatched_by?: string
          dispatched_at?: string
          estimated_arrival?: string | null
          actual_pickup_at?: string | null
          actual_delivery_at?: string | null
          status?: 'dispatched' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'
          customer_notified?: boolean
          customer_notification_sent_at?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      customer_restrictions: {
        Row: {
          id: string
          user_id: string
          restriction_type: 'pod_disabled' | 'account_suspended' | 'order_limit' | 'manual_verification_required'
          reason: string
          details: string | null
          expires_at: string | null
          created_by: string
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          restriction_type: 'pod_disabled' | 'account_suspended' | 'order_limit' | 'manual_verification_required'
          reason: string
          details?: string | null
          expires_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          restriction_type?: 'pod_disabled' | 'account_suspended' | 'order_limit' | 'manual_verification_required'
          reason?: string
          details?: string | null
          expires_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'customer' | 'staff' | 'admin' | 'manager' | 'driver'
          assigned_by: string | null
          assigned_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          role: 'customer' | 'staff' | 'admin' | 'manager' | 'driver'
          assigned_by?: string | null
          assigned_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'customer' | 'staff' | 'admin' | 'manager' | 'driver'
          assigned_by?: string | null
          assigned_at?: string
          is_active?: boolean
        }
      }
    }
    Views: {
      user_profile_summary: {
        Row: {
          id: string
          full_name: string | null
          phone_number: string | null
          default_address: Json | null
          loyalty_points: number
          created_at: string
          updated_at: string
          lifetime_earned: number
          total_orders: number
          lifetime_spent: number
          primary_address_id: string | null
        }
      }
    }
    Functions: {
      calculate_loyalty_tier: {
        Args: { lifetime_spent: number }
        Returns: string
      }
      get_loyalty_progress: {
        Args: { p_user_id: string }
        Returns: {
          current_tier: string
          next_tier: string
          lifetime_spent: number
          points_to_next_tier: number
          progress_percentage: number
        }[]
      }
      claim_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      record_call_attempt: {
        Args: { p_order_id: string }
        Returns: void
      }
      verify_order: {
        Args: { p_order_id: string; p_method: string }
        Returns: boolean
      }
      reject_order: {
        Args: { p_order_id: string; p_reason: string; p_details: string | null }
        Returns: boolean
      }
      log_order_interaction: {
        Args: {
          p_order_id: string
          p_interaction_type: string
          p_outcome?: string | null
          p_notes?: string | null
          p_metadata?: Json
          p_verified_address?: boolean
          p_verified_amount?: boolean
          p_verified_substitutions?: boolean
          p_substitution_approved?: boolean
          p_substitution_details?: string | null
        }
        Returns: string
      }
      dispatch_rider: {
        Args: {
          p_order_id: string
          p_rider_name: string
          p_rider_phone?: string | null
          p_estimated_arrival?: string | null
        }
        Returns: string
      }
      add_customer_restriction: {
        Args: {
          p_user_id: string
          p_restriction_type: string
          p_reason: string
          p_details?: string | null
          p_expires_at?: string | null
        }
        Returns: string
      }
      remove_customer_restriction: {
        Args: { p_restriction_id: string }
        Returns: boolean
      }
      get_admin_dashboard_stats: {
        Args: { p_store_id?: string | null }
        Returns: {
          unconfirmed_orders: number
          active_pickups: number
          riders_en_route: number
          daily_revenue: number
          pending_verification: number
          orders_in_processing: number
          orders_out_for_delivery: number
          cancelled_today: number
        }[]
      }
      has_customer_restriction: {
        Args: { p_user_id: string; p_restriction_type: string }
        Returns: boolean
      }
      is_admin: {
        Args: {}
        Returns: boolean
      }
      is_store_staff: {
        Args: { p_store_id: string }
        Returns: boolean
      }
      is_store_manager: {
        Args: { p_store_id: string }
        Returns: boolean
      }
    }
  }
}

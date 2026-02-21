// Generated types for Supabase database schema
// Based on migrations in /supabase/migrations/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          default_address: Json | null;
          loyalty_points: number;
          role:
            | "customer"
            | "staff"
            | "admin"
            | "manager"
            | "super_admin"
            | "branch_manager"
            | "driver";
          store_id: string | null;
          managed_store_ids: string[] | null;
          driver_status: "offline" | "available" | "on_delivery";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone_number?: string | null;
          default_address?: Json | null;
          loyalty_points?: number;
          role?:
            | "customer"
            | "staff"
            | "admin"
            | "manager"
            | "super_admin"
            | "branch_manager"
            | "driver";
          store_id?: string | null;
          managed_store_ids?: string[] | null;
          driver_status?: "offline" | "available" | "on_delivery";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          default_address?: Json | null;
          loyalty_points?: number;
          role?:
            | "customer"
            | "staff"
            | "admin"
            | "manager"
            | "super_admin"
            | "branch_manager"
            | "driver";
          store_id?: string | null;
          managed_store_ids?: string[] | null;
          driver_status?: "offline" | "available" | "on_delivery";
          created_at?: string;
          updated_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: "home" | "work" | "other";
          street_address: string;
          area: string;
          city: string;
          state: string;
          landmark: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: "home" | "work" | "other";
          street_address: string;
          area: string;
          city?: string;
          state?: string;
          landmark: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: "home" | "work" | "other";
          street_address?: string;
          area?: string;
          city?: string;
          state?: string;
          landmark?: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          items: Json;
          subtotal: number;
          delivery_fee: number;
          total_amount: number;
          status:
            | "pending"
            | "processing"
            | "paid"
            | "confirmed"
            | "assigned"
            | "picked_up"
            | "arrived"
            | "delivered"
            | "cancelled"
            | "refunded";
          delivery_method: "pickup" | "delivery";
          delivery_details: Json | null;
          paystack_reference: string | null;
          paystack_transaction_id: string | null;
          payment_split_log: Json | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          paid_at: string | null;
          delivered_at: string | null;
          driver_id: string | null;
          assigned_at: string | null;
          picked_up_at: string | null;
          arrived_at: string | null;
          confirmation_code: string | null;
          payment_method: "online" | "pod";
          nearest_landmark: string | null;
          driver_notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          items: Json;
          subtotal?: number;
          delivery_fee?: number;
          total_amount: number;
          status?:
            | "pending"
            | "processing"
            | "paid"
            | "confirmed"
            | "assigned"
            | "picked_up"
            | "arrived"
            | "delivered"
            | "cancelled"
            | "refunded";
          delivery_method: "pickup" | "delivery";
          delivery_details?: Json | null;
          paystack_reference?: string | null;
          paystack_transaction_id?: string | null;
          payment_split_log?: Json | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
          delivered_at?: string | null;
          driver_id?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          arrived_at?: string | null;
          confirmation_code?: string | null;
          payment_method?: "online" | "pod";
          nearest_landmark?: string | null;
          driver_notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          items?: Json;
          subtotal?: number;
          delivery_fee?: number;
          total_amount?: number;
          status?:
            | "pending"
            | "processing"
            | "paid"
            | "confirmed"
            | "assigned"
            | "picked_up"
            | "arrived"
            | "delivered"
            | "cancelled"
            | "refunded";
          delivery_method?: "pickup" | "delivery";
          delivery_details?: Json | null;
          paystack_reference?: string | null;
          paystack_transaction_id?: string | null;
          payment_split_log?: Json | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
          delivered_at?: string | null;
          driver_id?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          arrived_at?: string | null;
          confirmation_code?: string | null;
          payment_method?: "online" | "pod";
          nearest_landmark?: string | null;
          driver_notes?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
      };
      loyalty_transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          points_earned: number;
          points_redeemed: number;
          description: string;
          transaction_type: "earned" | "redeemed" | "bonus" | "expired";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          points_earned?: number;
          points_redeemed?: number;
          description: string;
          transaction_type: "earned" | "redeemed" | "bonus" | "expired";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          points_earned?: number;
          points_redeemed?: number;
          description?: string;
          transaction_type?: "earned" | "redeemed" | "bonus" | "expired";
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          parent_id: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          parent_id?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          parent_id?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sku: string | null;
          category_id: string | null;
          price: number;
          cost_price: number | null;
          unit: string;
          image_url: string | null;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          sku?: string | null;
          category_id?: string | null;
          price?: number;
          cost_price?: number | null;
          unit?: string;
          image_url?: string | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          sku?: string | null;
          category_id?: string | null;
          price?: number;
          cost_price?: number | null;
          unit?: string;
          image_url?: string | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
          phone: string | null;
          email: string | null;
          operating_hours: Json;
          pickup_instructions: string | null;
          delivery_radius_km: number;
          base_delivery_fee: number;
          per_km_delivery_fee: number;
          paystack_subaccount_code: string | null;
          platform_percentage: number | null;
          fixed_commission: number | null;
          paystack_settlement_bank_name: string | null;
          paystack_settlement_account_number: string | null;
          is_active: boolean;
          is_flagship: boolean;
          features: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          address: string;
          city?: string;
          state?: string;
          latitude: number;
          longitude: number;
          phone?: string | null;
          email?: string | null;
          operating_hours?: Json;
          pickup_instructions?: string | null;
          delivery_radius_km?: number;
          base_delivery_fee?: number;
          per_km_delivery_fee?: number;
          paystack_subaccount_code?: string | null;
          platform_percentage?: number | null;
          fixed_commission?: number | null;
          paystack_settlement_bank_name?: string | null;
          paystack_settlement_account_number?: string | null;
          is_active?: boolean;
          is_flagship?: boolean;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          address?: string;
          city?: string;
          state?: string;
          latitude?: number;
          longitude?: number;
          phone?: string | null;
          email?: string | null;
          operating_hours?: Json;
          pickup_instructions?: string | null;
          delivery_radius_km?: number;
          base_delivery_fee?: number;
          per_km_delivery_fee?: number;
          paystack_subaccount_code?: string | null;
          platform_percentage?: number | null;
          fixed_commission?: number | null;
          paystack_settlement_bank_name?: string | null;
          paystack_settlement_account_number?: string | null;
          is_active?: boolean;
          is_flagship?: boolean;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_inventory: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          stock_level: number;
          reserved_stock: number;
          available_stock: number;
          digital_buffer: number;
          is_visible: boolean;
          store_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          stock_level?: number;
          reserved_stock?: number;
          digital_buffer?: number;
          is_visible?: boolean;
          store_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          stock_level?: number;
          reserved_stock?: number;
          available_stock?: number;
          digital_buffer?: number;
          is_visible?: boolean;
          store_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_interactions: {
        Row: {
          id: string;
          order_id: string;
          staff_id: string;
          interaction_type:
            | "call_attempt"
            | "verification"
            | "rejection"
            | "status_change"
            | "note_added"
            | "rider_assigned"
            | "customer_complaint";
          outcome:
            | "answered"
            | "no_answer"
            | "busy"
            | "wrong_number"
            | "confirmed"
            | "rejected"
            | "callback_requested"
            | "voicemail"
            | "disconnected"
            | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          verified_address: boolean;
          verified_amount: boolean;
          verified_substitutions: boolean;
          substitution_approved: boolean;
          substitution_details: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          staff_id: string;
          interaction_type:
            | "call_attempt"
            | "verification"
            | "rejection"
            | "status_change"
            | "note_added"
            | "rider_assigned"
            | "customer_complaint";
          outcome?:
            | "answered"
            | "no_answer"
            | "busy"
            | "wrong_number"
            | "confirmed"
            | "rejected"
            | "callback_requested"
            | "voicemail"
            | "disconnected"
            | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          verified_address?: boolean;
          verified_amount?: boolean;
          verified_substitutions?: boolean;
          substitution_approved?: boolean;
          substitution_details?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          staff_id?: string;
          interaction_type?:
            | "call_attempt"
            | "verification"
            | "rejection"
            | "status_change"
            | "note_added"
            | "rider_assigned"
            | "customer_complaint";
          outcome?:
            | "answered"
            | "no_answer"
            | "busy"
            | "wrong_number"
            | "confirmed"
            | "rejected"
            | "callback_requested"
            | "voicemail"
            | "disconnected"
            | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          verified_address?: boolean;
          verified_amount?: boolean;
          verified_substitutions?: boolean;
          substitution_approved?: boolean;
          substitution_details?: string | null;
        };
      };
      rider_dispatches: {
        Row: {
          id: string;
          order_id: string;
          rider_name: string;
          rider_phone: string | null;
          rider_vehicle_type: string;
          dispatched_by: string;
          dispatched_at: string;
          estimated_arrival: string | null;
          actual_pickup_at: string | null;
          actual_delivery_at: string | null;
          status:
            | "dispatched"
            | "picked_up"
            | "in_transit"
            | "delivered"
            | "failed";
          customer_notified: boolean;
          customer_notification_sent_at: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          rider_name: string;
          rider_phone?: string | null;
          rider_vehicle_type?: string;
          dispatched_by: string;
          dispatched_at?: string;
          estimated_arrival?: string | null;
          actual_pickup_at?: string | null;
          actual_delivery_at?: string | null;
          status?:
            | "dispatched"
            | "picked_up"
            | "in_transit"
            | "delivered"
            | "failed";
          customer_notified?: boolean;
          customer_notification_sent_at?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          rider_name?: string;
          rider_phone?: string | null;
          rider_vehicle_type?: string;
          dispatched_by?: string;
          dispatched_at?: string;
          estimated_arrival?: string | null;
          actual_pickup_at?: string | null;
          actual_delivery_at?: string | null;
          status?:
            | "dispatched"
            | "picked_up"
            | "in_transit"
            | "delivered"
            | "failed";
          customer_notified?: boolean;
          customer_notification_sent_at?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_restrictions: {
        Row: {
          id: string;
          user_id: string;
          restriction_type:
            | "pod_disabled"
            | "account_suspended"
            | "order_limit"
            | "manual_verification_required";
          reason: string;
          details: string | null;
          expires_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          restriction_type:
            | "pod_disabled"
            | "account_suspended"
            | "order_limit"
            | "manual_verification_required";
          reason: string;
          details?: string | null;
          expires_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          restriction_type?:
            | "pod_disabled"
            | "account_suspended"
            | "order_limit"
            | "manual_verification_required";
          reason?: string;
          details?: string | null;
          expires_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "customer" | "staff" | "admin" | "manager" | "driver";
          assigned_by: string | null;
          assigned_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "customer" | "staff" | "admin" | "manager" | "driver";
          assigned_by?: string | null;
          assigned_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "customer" | "staff" | "admin" | "manager" | "driver";
          assigned_by?: string | null;
          assigned_at?: string;
          is_active?: boolean;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          store_name: string | null;
          delivery_method: "pickup" | "delivery" | null;
          delivery_address: Json | null;
          contact_phone: string | null;
          delivery_zone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          store_name?: string | null;
          delivery_method?: "pickup" | "delivery" | null;
          delivery_address?: Json | null;
          contact_phone?: string | null;
          delivery_zone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string | null;
          store_name?: string | null;
          delivery_method?: "pickup" | "delivery" | null;
          delivery_address?: Json | null;
          contact_phone?: string | null;
          delivery_zone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          store_id: string;
          name: string;
          price: number;
          quantity: number;
          max_quantity: number;
          digital_buffer: number;
          image_url: string | null;
          options: Json | null;
          added_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          store_id: string;
          name: string;
          price: number;
          quantity: number;
          max_quantity: number;
          digital_buffer?: number;
          image_url?: string | null;
          options?: Json | null;
          added_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          store_id?: string;
          name?: string;
          price?: number;
          quantity?: number;
          max_quantity?: number;
          digital_buffer?: number;
          image_url?: string | null;
          options?: Json | null;
          added_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          user_name: string | null;
          action_type:
            | "price_change"
            | "inventory_update"
            | "stock_adjustment"
            | "product_visibility_change"
            | "manager_assignment"
            | "role_change";
          entity_type: "product" | "store_inventory" | "store" | "profile";
          entity_id: string;
          store_id: string | null;
          store_name: string | null;
          old_value: Json | null;
          new_value: Json | null;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name?: string | null;
          action_type:
            | "price_change"
            | "inventory_update"
            | "stock_adjustment"
            | "product_visibility_change"
            | "manager_assignment"
            | "role_change";
          entity_type: "product" | "store_inventory" | "store" | "profile";
          entity_id: string;
          store_id?: string | null;
          store_name?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string | null;
          action_type?:
            | "price_change"
            | "inventory_update"
            | "stock_adjustment"
            | "product_visibility_change"
            | "manager_assignment"
            | "role_change";
          entity_type?: "product" | "store_inventory" | "store" | "profile";
          entity_id?: string;
          store_id?: string | null;
          store_name?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      user_profile_summary: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          default_address: Json | null;
          loyalty_points: number;
          created_at: string;
          updated_at: string;
          lifetime_earned: number;
          total_orders: number;
          lifetime_spent: number;
          primary_address_id: string | null;
        };
      };
    };
    Functions: {
      calculate_loyalty_tier: {
        Args: { lifetime_spent: number };
        Returns: string;
      };
      get_loyalty_progress: {
        Args: { p_user_id: string };
        Returns: {
          current_tier: string;
          next_tier: string;
          lifetime_spent: number;
          points_to_next_tier: number;
          progress_percentage: number;
        }[];
      };
      claim_order: {
        Args: { p_order_id: string };
        Returns: boolean;
      };
      record_call_attempt: {
        Args: { p_order_id: string };
        Returns: void;
      };
      verify_order: {
        Args: { p_order_id: string; p_method: string };
        Returns: boolean;
      };
      reject_order: {
        Args: {
          p_order_id: string;
          p_reason: string;
          p_details: string | null;
        };
        Returns: boolean;
      };
      log_order_interaction: {
        Args: {
          p_order_id: string;
          p_interaction_type: string;
          p_outcome?: string | null;
          p_notes?: string | null;
          p_metadata?: Json;
          p_verified_address?: boolean;
          p_verified_amount?: boolean;
          p_verified_substitutions?: boolean;
          p_substitution_approved?: boolean;
          p_substitution_details?: string | null;
        };
        Returns: string;
      };
      dispatch_rider: {
        Args: {
          p_order_id: string;
          p_rider_name: string;
          p_rider_phone?: string | null;
          p_estimated_arrival?: string | null;
        };
        Returns: string;
      };
      add_customer_restriction: {
        Args: {
          p_user_id: string;
          p_restriction_type: string;
          p_reason: string;
          p_details?: string | null;
          p_expires_at?: string | null;
        };
        Returns: string;
      };
      remove_customer_restriction: {
        Args: { p_restriction_id: string };
        Returns: boolean;
      };
      get_admin_dashboard_stats: {
        Args: { p_store_id?: string | null };
        Returns: {
          unconfirmed_orders: number;
          active_pickups: number;
          riders_en_route: number;
          daily_revenue: number;
          pending_verification: number;
          orders_in_processing: number;
          orders_out_for_delivery: number;
          cancelled_today: number;
        }[];
      };
      has_customer_restriction: {
        Args: { p_user_id: string; p_restriction_type: string };
        Returns: boolean;
      };
      is_admin: {
        Args: {};
        Returns: boolean;
      };
      is_store_staff: {
        Args: { p_store_id: string };
        Returns: boolean;
      };
      is_store_manager: {
        Args: { p_store_id: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: {};
        Returns: boolean;
      };
      is_branch_manager: {
        Args: { p_user_id?: string };
        Returns: boolean;
      };
      get_managed_store_ids: {
        Args: { p_user_id?: string };
        Returns: string[];
      };
      log_audit_action: {
        Args: {
          p_action_type: string;
          p_entity_type: string;
          p_entity_id: string;
          p_store_id: string;
          p_old_value?: Json;
          p_new_value?: Json;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
    };
  };
}

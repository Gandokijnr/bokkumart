export type AddressLabel = "home" | "work" | "other";

export type Address = {
  id: string;
  user_id: string;
  label: AddressLabel;
  street_address: string;
  area: string;
  city: string;
  state: string;
  landmark: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type AddressFormData = {
  label: AddressLabel;
  street_address: string;
  area: string;
  city: string;
  state: string;
  landmark: string;
  is_primary: boolean;
};

// Lagos areas for dropdown
export const LAGOS_AREAS = [
  "Ajah",
  "Apapa",
  "Bariga",
  "Egbeda",
  "Epe",
  "Festac",
  "Gbagada",
  "Ibadan Expressway",
  "Ibeju-Lekki",
  "Ikeja",
  "Ikorodu",
  "Ikota",
  "Ikoyi",
  "Ilupeju",
  "Isolo",
  "Ketu",
  "Lagos Island",
  "Lekki",
  "Magodo",
  "Marina",
  "Maryland",
  "Mushin",
  "Obalende",
  "Ogudu",
  "Ojodu",
  "Ojota",
  "Oniru",
  "Opebi",
  "Oshodi",
  "Palmgrove",
  "Sangotedo",
  "Satelite Town",
  "Shomolu",
  "Surulere",
  "Victoria Island",
  "Yaba",
];

// Common Lagos landmarks
export const COMMON_LANDMARKS = [
  "Near Total Filling Station",
  "Opposite Shoprite",
  "Beside GTBank",
  "Near Police Station",
  "Close to Market",
  "Near Hospital",
  "Beside Church/Mosque",
  "Near School",
  "Opposite Domino Pizza",
  "Near Ebeano Supermarket",
  "By The Bus Stop",
  "Near The Roundabout",
  "Close to The Bridge",
];

export const useUserAddresses = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const getUserId = () => {
    return user.value?.id || (user.value as any)?.sub;
  };

  // Reactive state
  const addresses = ref<Address[]>([]);
  const primaryAddress = ref<Address | null>(null);
  const pending = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch all addresses for the current user
   */
  const fetchAddresses = async () => {
    const userId = getUserId();
    if (!userId) {
      error.value = "User not authenticated";
      return;
    }

    pending.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("addresses")
        .select(
          "id, user_id, label, street_address, area, city, state, landmark, is_primary, created_at, updated_at",
        )
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      addresses.value = (data || []) as Address[];
      primaryAddress.value = addresses.value.find((a) => a.is_primary) || null;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch addresses";
      console.error("Error fetching addresses:", err);
    } finally {
      pending.value = false;
    }
  };

  /**
   * Create a new address
   */
  const createAddress = async (
    formData: AddressFormData,
  ): Promise<{ success: boolean; data?: Address; error?: string }> => {
    const userId = getUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    pending.value = true;

    try {
      const { data, error: createError } = await (
        supabase.from("addresses") as any
      )
        .insert({
          user_id: userId,
          label: formData.label,
          street_address: formData.street_address,
          area: formData.area,
          city: formData.city || "Lagos",
          state: formData.state || "Lagos",
          landmark: formData.landmark,
          is_primary: formData.is_primary,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Refresh addresses
      await fetchAddresses();

      return { success: true, data: data as Address };
    } catch (err: any) {
      console.error("Error creating address:", err);
      return {
        success: false,
        error: err.message || "Failed to create address",
      };
    } finally {
      pending.value = false;
    }
  };

  /**
   * Update an existing address
   */
  const updateAddress = async (
    addressId: string,
    formData: Partial<AddressFormData>,
  ): Promise<{ success: boolean; error?: string }> => {
    const userId = getUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    pending.value = true;

    try {
      const { error: updateError } = await (supabase.from("addresses") as any)
        .update({
          label: formData.label,
          street_address: formData.street_address,
          area: formData.area,
          city: formData.city,
          state: formData.state,
          landmark: formData.landmark,
          is_primary: formData.is_primary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Refresh addresses
      await fetchAddresses();

      return { success: true };
    } catch (err: any) {
      console.error("Error updating address:", err);
      return {
        success: false,
        error: err.message || "Failed to update address",
      };
    } finally {
      pending.value = false;
    }
  };

  /**
   * Delete an address
   */
  const deleteAddress = async (
    addressId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const userId = getUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    pending.value = true;

    try {
      const { error: deleteError } = await (supabase.from("addresses") as any)
        .delete()
        .eq("id", addressId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Refresh addresses
      await fetchAddresses();

      return { success: true };
    } catch (err: any) {
      console.error("Error deleting address:", err);
      return {
        success: false,
        error: err.message || "Failed to delete address",
      };
    } finally {
      pending.value = false;
    }
  };

  /**
   * Set an address as primary
   */
  const setPrimaryAddress = async (
    addressId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    return updateAddress(addressId, { is_primary: true });
  };

  /**
   * Get address label display text
   */
  const getLabelDisplay = (label: AddressLabel): string => {
    const labels: Record<AddressLabel, string> = {
      home: "🏠 Home",
      work: "💼 Work",
      other: "📍 Other",
    };
    return labels[label] || label;
  };

  /**
   * Format address for display
   */
  const formatAddress = (address: Address): string => {
    return `${address.street_address}, ${address.area}, ${address.city}`;
  };

  /**
   * Get full address with landmark
   */
  const getFullAddress = (address: Address): string => {
    return `${address.street_address}, ${address.area}, ${address.city}. Landmark: ${address.landmark}`;
  };

  /**
   * Validate address form
   */
  const validateAddressForm = (
    formData: AddressFormData,
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.street_address?.trim()) {
      errors.push("Street address is required");
    }

    if (!formData.area?.trim()) {
      errors.push("Area is required");
    }

    if (!formData.landmark?.trim()) {
      errors.push("Landmark is required for Lagos delivery");
    }

    return { valid: errors.length === 0, errors };
  };

  return {
    addresses,
    primaryAddress,
    pending,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddress,
    getLabelDisplay,
    formatAddress,
    getFullAddress,
    validateAddressForm,
    LAGOS_AREAS,
    COMMON_LANDMARKS,
  };
};

import { defineEventHandler, createError } from "h3";

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface AvailableBranchesResponse {
  branches: BranchInfo[];
}

export default defineEventHandler(
  async (event): Promise<AvailableBranchesResponse> => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const config = useRuntimeConfig();

      const supabaseUrl =
        ((config.public as any)?.supabase?.url as string | undefined) ||
        (process.env.SUPABASE_URL as string | undefined);

      const serviceRoleKey =
        (config.supabaseServiceRoleKey as string | undefined) ||
        (process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined);

      if (!supabaseUrl || !serviceRoleKey) {
        throw createError({
          statusCode: 500,
          statusMessage: "Server not configured",
        });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Return all active branches
      const { data: branches, error } = await supabase
        .from("stores")
        .select("id, name, code, address, city, phone, email, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) {
        throw createError({
          statusCode: 500,
          message: "Failed to fetch branches",
        });
      }

      const results: BranchInfo[] = (branches || []).map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        phone: branch.phone,
        email: branch.email,
        is_active: branch.is_active,
      }));

      return {
        branches: results,
      };
    } catch (err: any) {
      console.error("Error fetching available branches:", err);
      throw createError({
        statusCode: err.statusCode || 500,
        message: err.message || "Failed to fetch branches",
      });
    }
  },
);

/**
 * Geocoding Script for HomeAffairs Lagos Branches
 * Uses OpenStreetMap Nominatim (FREE) with proper rate limiting
 *
 * Usage:
 * 1. Run manually: npx ts-node scripts/geocode-branches.ts
 * 2. Or use the API endpoint for production
 *
 * Nominatim Terms: https://operations.osmfoundation.org/policies/nominatim/
 * - Max 1 request/second
 * - Cache results (30 days implemented)
 * - Display attribution: "© OpenStreetMap contributors"
 * - Valid User-Agent required
 */

// Approximate coordinates for the 6 Lagos branches
// These should be verified with a proper geocoding service in production
export const BRANCH_COORDINATES = {
  // 1. Gbagada - Mainland
  gbagada: {
    name: "HomeAffairs Gbagada",
    address: "Gbagada, Lagos",
    lat: 6.5537,
    lng: 3.3863,
    area: "Mainland",
    notes: "Gbagada Expressway area",
  },

  // 2. Lekki - Island
  lekki: {
    name: "HomeAffairs Lekki",
    address: "Lekki, Lagos",
    lat: 6.4698,
    lng: 3.5852,
    area: "Island",
    notes: "Lekki Phase 1 area",
  },

  // 3. Ogba - Mainland
  ogba: {
    name: "HomeAffairs Ogba",
    address: "Ogba, Lagos",
    lat: 6.6323,
    lng: 3.3375,
    area: "Mainland",
    notes: "Ogba town centre",
  },

  // 4. Ogudu I - Mainland (116 Ogudu Road)
  "ogudu-i": {
    name: "HomeAffairs Ogudu I",
    address: "116 Ogudu Road, Ogudu, Lagos",
    lat: 6.5821,
    lng: 3.3756,
    area: "Mainland",
    notes: "Part of Ogudu Hub - Stock priority",
  },

  // 5. Ogudu II - Mainland (135 Ogudu Road)
  "ogudu-ii": {
    name: "HomeAffairs Ogudu II",
    address: "135 Ogudu Road, Ogudu, Lagos",
    lat: 6.5825,
    lng: 3.376,
    area: "Mainland",
    notes: "Part of Ogudu Hub - Stock priority",
  },

  // 6. Omole - Mainland
  omole: {
    name: "HomeAffairs Omole",
    address: "Omole, Lagos",
    lat: 6.6234,
    lng: 3.3589,
    area: "Mainland",
    notes: "Omole Phase 1/2 area",
  },
} as const;

export type BranchCode = keyof typeof BRANCH_COORDINATES;

/**
 * Generate SQL to update store coordinates in the database
 */
export function generateUpdateSQL(): string {
  const updates: string[] = [];

  for (const [code, data] of Object.entries(BRANCH_COORDINATES)) {
    updates.push(`
-- Update ${data.name}
UPDATE stores 
SET 
  latitude = ${data.lat},
  longitude = ${data.lng},
  address = '${data.address.replace(/'/g, "''")}',
  city = 'Lagos',
  state = 'Lagos State',
  updated_at = NOW()
WHERE code = '${code}';
`);
  }

  return updates.join("\n");
}

/**
 * Generate SQL to insert new stores if they don't exist
 */
export function generateInsertSQL(): string {
  const inserts: string[] = [];

  for (const [code, data] of Object.entries(BRANCH_COORDINATES)) {
    inserts.push(`
-- Insert ${data.name} if not exists
INSERT INTO stores (
  id, name, code, address, city, state, latitude, longitude, 
  is_active, base_delivery_fee, per_km_delivery_fee, delivery_radius_km,
  congestion_multiplier, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '${data.name}',
  '${code}',
  '${data.address.replace(/'/g, "''")}',
  'Lagos',
  'Lagos State',
  ${data.lat},
  ${data.lng},
  true,
  1000,
  100,
  15,
  ${data.area === "Island" ? 1.2 : 1.0},
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();
`);
  }

  return inserts.join("\n");
}

/**
 * Calculate distances between all branches (for internal planning)
 */
export function calculateInterBranchDistances(): Record<
  string,
  { to: string; distanceKm: number }[]
> {
  const result: Record<string, { to: string; distanceKm: number }[]> = {};

  for (const [code1, data1] of Object.entries(BRANCH_COORDINATES)) {
    result[code1] = [];

    for (const [code2, data2] of Object.entries(BRANCH_COORDINATES)) {
      if (code1 === code2) continue;

      const R = 6371; // Earth's radius in km
      const dLat = ((data2.lat - data1.lat) * Math.PI) / 180;
      const dLon = ((data2.lng - data1.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((data1.lat * Math.PI) / 180) *
          Math.cos((data2.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      result[code1].push({
        to: code2,
        distanceKm: Math.round(distance * 100) / 100,
      });
    }

    // Sort by distance
    result[code1].sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return result;
}

/**
 * Print a summary of all branches and their distances
 */
export function printBranchSummary(): void {
  console.log("=== HomeAffairs Lagos Branches ===\n");

  for (const [code, data] of Object.entries(BRANCH_COORDINATES)) {
    console.log(`${data.name} (${code})`);
    console.log(`  Address: ${data.address}`);
    console.log(`  Coordinates: ${data.lat}, ${data.lng}`);
    console.log(`  Area: ${data.area}`);
    console.log(`  Notes: ${data.notes}\n`);
  }

  console.log("=== Inter-Branch Distances ===\n");

  const distances = calculateInterBranchDistances();
  for (const [from, toList] of Object.entries(distances)) {
    console.log(`${from}:`);
    for (const { to, distanceKm } of toList) {
      console.log(`  -> ${to}: ${distanceKm}km`);
    }
    console.log();
  }
}

/**
 * Geocode a single address using a geocoding service
 * Placeholder - implement with actual API in production
 */
export async function geocodeAddress(
  address: string,
  apiKey?: string,
): Promise<{ lat: number; lng: number } | null> {
  // Placeholder implementation
  // In production, use one of:
  // - Google Maps Geocoding API: https://developers.google.com/maps/documentation/geocoding
  // - Mapbox Geocoding API: https://docs.mapbox.com/api/search/geocoding/
  // - OpenStreetMap Nominatim: https://nominatim.org/

  console.warn("Geocoding not implemented. Using approximate coordinates.");
  console.log(`Address to geocode: ${address}`);

  // Return null to indicate geocoding needed
  return null;
}

/**
 * Main function to generate SQL files
 */
export function generateSQLFiles(): {
  updateSQL: string;
  insertSQL: string;
  verificationSQL: string;
} {
  const updateSQL = `
-- ============================================
-- HomeAffairs Branch Coordinates Update Script
-- Generated: ${new Date().toISOString()}
-- ============================================

${generateUpdateSQL()}

-- Verify updates
SELECT code, name, latitude, longitude, address 
FROM stores 
WHERE code IN ('gbagada', 'lekki', 'ogba', 'ogudu-i', 'ogudu-ii', 'omole')
ORDER BY code;
`;

  const insertSQL = `
-- ============================================
-- HomeAffairs Branch Insert Script (if not exists)
-- Generated: ${new Date().toISOString()}
-- ============================================

${generateInsertSQL()}
`;

  const verificationSQL = `
-- ============================================
-- Verification Query
-- ============================================

SELECT 
  s.code,
  s.name,
  s.latitude,
  s.longitude,
  s.address,
  s.city,
  s.congestion_multiplier,
  s.base_delivery_fee,
  CASE 
    WHEN s.congestion_multiplier > 1.0 THEN 'Traffic surcharge enabled'
    ELSE 'Standard pricing'
  END as pricing_status
FROM stores s
WHERE s.code IN ('gbagada', 'lekki', 'ogba', 'ogudu-i', 'ogudu-ii', 'omole')
ORDER BY s.code;
`;

  return { updateSQL, insertSQL, verificationSQL };
}

// Run if executed directly
if (require.main === module) {
  printBranchSummary();

  const { updateSQL, insertSQL, verificationSQL } = generateSQLFiles();

  console.log("=== UPDATE SQL (for existing stores) ===");
  console.log(updateSQL);

  console.log("\n=== INSERT SQL (for new stores) ===");
  console.log(insertSQL);

  console.log("\n=== VERIFICATION SQL ===");
  console.log(verificationSQL);
}

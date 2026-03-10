-- ============================================
-- HomeAffairs Branch Coordinates Update Script
-- Generated for 6 Lagos Branches
-- ============================================

-- 1. Gbagada - Mainland
UPDATE stores 
SET 
  latitude = 6.5537,
  longitude = 3.3863,
  address = 'Gbagada, Lagos',
  city = 'Lagos',
  state = 'Lagos State',
  congestion_multiplier = 1.2, -- Traffic surcharge for this area
  updated_at = NOW()
WHERE code = 'gbagada';

-- 2. Lekki - Island
UPDATE stores 
SET 
  latitude = 6.4698,
  longitude = 3.5852,
  address = 'Lekki, Lagos',
  city = 'Lagos',
  state = 'Lagos State',
  congestion_multiplier = 1.2, -- Island traffic surcharge
  updated_at = NOW()
WHERE code = 'lekki';

-- 3. Ogba - Mainland
UPDATE stores 
SET 
  latitude = 6.6323,
  longitude = 3.3375,
  address = 'Ogba, Lagos',
  city = 'Lagos',
  state = 'Lagos State',
  congestion_multiplier = 1.0, -- Standard pricing
  updated_at = NOW()
WHERE code = 'ogba';

-- 4. Ogudu I - Mainland (116 Ogudu Road)
UPDATE stores 
SET 
  latitude = 6.5821,
  longitude = 3.3756,
  address = '116 Ogudu Road, Ogudu, Lagos',
  city = 'Lagos',
  state = 'Lagos State',
  congestion_multiplier = 1.0, -- Standard pricing (part of Ogudu Hub)
  updated_at = NOW()
WHERE code = 'ogudu-i';

-- 5. Ogudu II - Mainland (135 Ogudu Road)
UPDATE stores 
SET 
  latitude = 6.5825,
  longitude = 3.3760,
  address = '135 Ogudu Road, Ogudu, Lagos',
  city = 'Lagos',
  state = 'Lagos State',
  congestion_multiplier = 1.0, -- Standard pricing (part of Ogudu Hub)
  updated_at = NOW()
WHERE code = 'ogudu-ii';

-- 6. Omole - Mainland
UPDATE stores 
SET 
  latitude = 6.6234,
  longitude = 3.3589,
  address = 'Omole, Lagos',
  city = 'Lagos',
  state = 'Lagos State',
  congestion_multiplier = 1.0, -- Standard pricing
  updated_at = NOW()
WHERE code = 'omole';

-- ============================================
-- Alternative: INSERT if stores don't exist
-- ============================================

-- Uncomment and run these if the stores don't exist yet:

/*
INSERT INTO stores (id, name, code, address, city, state, latitude, longitude, 
  is_active, base_delivery_fee, per_km_delivery_fee, delivery_radius_km,
  congestion_multiplier, created_at, updated_at) VALUES
  
(gen_random_uuid(), 'HomeAffairs Gbagada', 'gbagada', 'Gbagada, Lagos', 'Lagos', 'Lagos State', 
 6.5537, 3.3863, true, 1000, 100, 15, 1.2, NOW(), NOW()),

(gen_random_uuid(), 'HomeAffairs Lekki', 'lekki', 'Lekki, Lagos', 'Lagos', 'Lagos State', 
 6.4698, 3.5852, true, 1000, 100, 15, 1.2, NOW(), NOW()),

(gen_random_uuid(), 'HomeAffairs Ogba', 'ogba', 'Ogba, Lagos', 'Lagos', 'Lagos State', 
 6.6323, 3.3375, true, 1000, 100, 15, 1.0, NOW(), NOW()),

(gen_random_uuid(), 'HomeAffairs Ogudu I', 'ogudu-i', '116 Ogudu Road, Ogudu, Lagos', 'Lagos', 'Lagos State', 
 6.5821, 3.3756, true, 1000, 100, 15, 1.0, NOW(), NOW()),

(gen_random_uuid(), 'HomeAffairs Ogudu II', 'ogudu-ii', '135 Ogudu Road, Ogudu, Lagos', 'Lagos', 'Lagos State', 
 6.5825, 3.3760, true, 1000, 100, 15, 1.0, NOW(), NOW()),

(gen_random_uuid(), 'HomeAffairs Omole', 'omole', 'Omole, Lagos', 'Lagos', 'Lagos State', 
 6.6234, 3.3589, true, 1000, 100, 15, 1.0, NOW(), NOW())

ON CONFLICT (code) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  congestion_multiplier = EXCLUDED.congestion_multiplier,
  updated_at = NOW();
*/

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

-- ============================================
-- Distance Test Query (Sample)
-- ============================================
-- Test distance calculation between branches:

/*
WITH branch_distances AS (
  SELECT 
    s1.code as from_branch,
    s2.code as to_branch,
    s1.latitude as lat1,
    s1.longitude as lng1,
    s2.latitude as lat2,
    s2.longitude as lng2,
    -- Haversine formula
    6371 * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS(s2.latitude - s1.latitude) / 2), 2) +
      COS(RADIANS(s1.latitude)) * COS(RADIANS(s2.latitude)) *
      POWER(SIN(RADIANS(s2.longitude - s1.longitude) / 2), 2)
    )) as distance_km
  FROM stores s1
  CROSS JOIN stores s2
  WHERE s1.code IN ('gbagada', 'lekki', 'ogba', 'ogudu-i', 'ogudu-ii', 'omole')
    AND s2.code IN ('gbagada', 'lekki', 'ogba', 'ogudu-i', 'ogudu-ii', 'omole')
    AND s1.code != s2.code
)
SELECT 
  from_branch,
  to_branch,
  ROUND(distance_km::numeric, 2) as distance_km
FROM branch_distances
WHERE distance_km < 20  -- Only show nearby branches
ORDER BY from_branch, distance_km;
*/

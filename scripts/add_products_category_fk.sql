-- Add foreign key constraint to products.category_id referencing categories.id
-- Uses ON DELETE SET NULL to maintain current behavior when categories are deleted

ALTER TABLE products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id)
  ON DELETE SET NULL;

-- Add index for faster category-based product lookups
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

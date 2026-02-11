# Branch Manager CSV Inventory Upload

## Overview

Branch managers can now bulk upload and manage inventory for their assigned stores using CSV files. This feature allows for efficient stock management across multiple products and stores without manual data entry.

## Features

- **CSV Upload**: Drag-and-drop or file picker for bulk inventory updates
- **Manual Entry**: Add or edit individual inventory items
- **Store Restrictions**: Managers can only manage inventory for their assigned stores
- **Auto-create Products**: New products are automatically created if they don't exist
- **Stock Visibility**: Toggle product visibility to customers
- **Audit Logging**: All inventory changes are logged for accountability

## CSV Format

### Required Columns

| Column | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Product name (e.g., "Fresh Cow Milk") |
| `stock_level` | Yes | Current stock quantity |
| `store_id` | Yes | UUID of the store (must be one of manager's assigned stores) |
| `price` | Yes* | Base product price - *required to create new products* |

### Optional Columns

| Column | Description |
|--------|-------------|
| `sku` | Product SKU code (e.g., "DAIRY-001") |
| `category` | Category name (e.g., "Dairy & Eggs", "Grains & Rice") |
| `description` | Product description |
| `cost_price` | Product cost price for margin calculations |
| `unit` | Unit of measurement (e.g., "liter", "kg", "piece", "5kg bag") |
| `store_price` | Store-specific price override |
| `digital_buffer` | Digital buffer quantity (safety stock) |
| `image_url` | URL to product image (shown to customers) |

### CSV Template

```csv
name,sku,category,description,price,cost_price,unit,stock_level,store_id,store_price,digital_buffer,image_url
Fresh Cow Milk,DAIRY-001,Dairy & Eggs,Premium fresh pasteurized milk 1 liter,850.00,600.00,liter,50,store-uuid-here,800.00,5,https://example.com/milk.jpg
Basmati Rice,GRAIN-001,Grains & Rice,Long grain aromatic basmati rice 5kg bag,7500.00,5500.00,5kg bag,30,store-uuid-here,,3,https://example.com/rice.jpg
Vegetable Oil,OIL-001,Cooking Oil,Pure vegetable cooking oil 5 liters,9500.00,7200.00,5 liters,100,store-uuid-here,9200.00,10,https://example.com/oil.jpg
```

## How It Works

### Product Matching

The system attempts to match products in the CSV to existing products in this order:

1. **By SKU** - If `sku` column is provided and matches an existing product
2. **By Name** - Case-insensitive match on `product_name`

### Creating New Products

If a product is not found:
- A new product is created **only if** the `price` column is provided
- The `category` column is used to assign the product to a category (optional)
- The `image_url` column adds a product image for customers to see (optional)
- If no category is found, the product is created without a category

### Inventory Record Management

For each CSV row:
- If an inventory record exists for the product + store combination → **Update** the stock level
- If no inventory record exists → **Create** a new inventory record

### Store Authorization

- Super admins can upload inventory for any store
- Branch managers can only upload for stores in their `managed_store_ids` array
- The API validates all `store_id` values in the CSV against the user's authorized stores

## Using the Feature

### Uploading CSV

1. Navigate to **Manage Inventory** from the branch dashboard
2. Click **Upload CSV** button
3. Either:
   - Drag and drop a CSV file onto the upload area
   - Click "Click to upload" and select a file
4. Click **Upload CSV** to process the file
5. Review the results summary showing:
   - Rows processed
   - Inventory records created
   - Inventory records updated
   - New products created
   - Any errors

### Downloading Template

Click **Download Template CSV** in the upload modal to get a pre-formatted CSV file with your store IDs already populated.

### Manual Entry

For single item updates:
1. Click **Add Item** button
2. Fill in the form:
   - Select store (if managing multiple stores)
   - Product name (required)
   - SKU (optional, used for matching)
   - Stock level (required)
   - Digital buffer (optional)
   - Base price (required only for new products)
   - Store price (optional override)
   - Product Image (optional - drag & drop or click to upload PNG/JPG/GIF up to 5MB)
   - Visibility toggle
3. Click **Save Item**

**Image Upload**: The product image upload supports drag-and-drop or click-to-upload. Images are automatically uploaded to storage and associated with the product for customers to see. Maximum file size is 5MB.

### Storage Bucket Setup (Required for Image Upload)

To enable image uploads, you must create a Supabase Storage bucket:

1. Go to your Supabase Dashboard → Storage
2. Click **New Bucket**
3. Name: `products`
4. Check **Public bucket** (so images are accessible to customers)
5. Click **Save**

6. Add RLS policy for uploads:
   - Go to Bucket → Policies → New Policy
   - Template: `INSERT`
   - Name: `Allow authenticated uploads`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - Policy: `true` (or custom logic for branch_manager role)

### Editing Items

1. Find the item in the inventory table
2. Click **Edit** button
3. Modify stock level, digital buffer, store price, or visibility
4. Click **Save Changes**

### Quick Stock Updates

For rapid stock level changes:
1. Find the item in the inventory table
2. Click directly in the **Stock Level** input field
3. Enter new quantity
4. Press Enter or click outside to save

## API Endpoint

### POST /api/admin/upload-inventory

Uploads and processes a CSV inventory file.

**Authentication**: Bearer token required

**Authorization**: Branch managers, staff, or super admins

**Request**: `multipart/form-data` with `file` field containing CSV

**Response**:
```json
{
  "success": true,
  "processed": 50,
  "inventoryCreated": 10,
  "inventoryUpdated": 40,
  "productsCreated": 2,
  "parseErrors": null,
  "processingErrors": null
}
```

## Database Schema

### Tables Used

- `products` - Product catalog
- `store_inventory` - Store-specific inventory records
- `categories` - Product categories (for new product creation)
- `audit_logs` - Inventory change audit trail

### store_inventory Fields

| Field | Description |
|-------|-------------|
| `store_id` | Reference to stores table |
| `product_id` | Reference to products table |
| `stock_level` | Total physical stock |
| `available_stock` | Stock available for sale (stock_level - reserved_stock) |
| `reserved_stock` | Stock reserved for pending orders |
| `digital_buffer` | Safety stock buffer |
| `is_visible` | Whether product is visible to customers |
| `store_price` | Store-specific price override |

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required columns" | CSV missing product_name, stock_level, or store_id | Check CSV headers match required format |
| "Invalid stock_level" | Non-numeric or negative value in stock_level column | Ensure stock_level is a positive number |
| "Not authorized to manage stores" | CSV contains store_id not in manager's assigned stores | Verify store_id values are correct |
| "Product not found... Provide price" | Product doesn't exist and no price provided to create it | Add price column for new products |
| "Column count mismatch" | Row has different number of columns than header | Check for extra commas or missing values |

### Error Response Format

```json
{
  "success": false,
  "processed": 45,
  "inventoryCreated": 8,
  "inventoryUpdated": 35,
  "productsCreated": 1,
  "parseErrors": [
    { "row": 5, "message": "Invalid stock_level: abc" }
  ],
  "processingErrors": [
    { "row": 12, "message": "Product not found: Unknown Product. Provide price to create new product." }
  ]
}
```

## Security & Permissions

- **Branch Managers**: Can only upload for stores in their `managed_store_ids` array
- **Staff**: Store permissions determined by their assigned store
- **Super Admins**: Can upload for any store
- All uploads are logged in `audit_logs` with action_type `inventory_update`

## Best Practices

1. **Always download the template first** - It includes your authorized store IDs
2. **Use SKUs when possible** - More reliable than name matching
3. **Include prices for new products** - Required to auto-create products
4. **Test with small batches first** - Upload 5-10 rows to verify format
5. **Keep digital buffers reasonable** - Typically 5-10% of stock level
6. **Review errors carefully** - The API reports both parse and processing errors

## Troubleshooting

### Upload Stuck on "Uploading..."
- Check internet connection
- Verify file size is under 10MB
- Check browser console for JavaScript errors

### Products Not Being Created
- Ensure `price` column is included and is a valid number
- Check that `category` name matches an existing category exactly

### Store ID Not Recognized
- Copy store_id from the template download
- Verify the store is assigned to you in Staff Management

### Stock Not Updating
- Verify the product_name or sku matches exactly
- Check for invisible characters in CSV (open in Notepad to verify)

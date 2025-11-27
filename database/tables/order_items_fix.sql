-- Add product details to order_items table
-- These columns store product information at the time of purchase
-- This ensures order history is preserved even if products are changed or deleted

-- Add columns to store product details
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS variant_size TEXT,
ADD COLUMN IF NOT EXISTS variant_color TEXT,
ADD COLUMN IF NOT EXISTS variant_sku TEXT;

-- Update existing order items with product data (if needed)
-- This will populate the new columns for existing orders
UPDATE public.order_items oi
SET
  product_name = p.name,
  variant_size = pv.size,
  variant_color = pv.color,
  variant_sku = pv.sku
FROM products p, product_variants pv
WHERE oi.product_id = p.id
  AND pv.id = oi.variant_id
  AND oi.product_name IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_product_name
  ON public.order_items(product_name);

-- Add comment explaining the columns
COMMENT ON COLUMN public.order_items.product_name IS 'Product name at time of purchase';
COMMENT ON COLUMN public.order_items.variant_size IS 'Variant size at time of purchase';
COMMENT ON COLUMN public.order_items.variant_color IS 'Variant color at time of purchase';
COMMENT ON COLUMN public.order_items.variant_sku IS 'Variant SKU at time of purchase';
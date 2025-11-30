# Variant-Specific Discount Deployment Guide

## Overview
This guide will help you deploy variant-specific discount functionality to your Supabase database. After deployment, discounts assigned to specific product variants will display correctly in your product listings and product detail pages.

## What's Changed

### Frontend
✅ **Already Updated** - No action needed:
- Product card now displays variant-specific discounts
- Prices update dynamically when selecting different variants
- Discount badges show variant-specific discount percentages
- TypeScript interfaces updated to include discount fields

### Database
⚠️ **Requires Manual Deployment** - Follow steps below:
- New SQL function: `get_variant_discount()`
- Updated SQL function: `get_products_enhanced()`
- Updated constraint: `check_applicable_ids_consistency`

---

## Deployment Steps

### Step 1: Update Database Constraint

This allows discounts to be applied to variants.

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Run this SQL:**

```sql
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS check_applicable_ids_consistency;

ALTER TABLE public.discount_codes
ADD CONSTRAINT check_applicable_ids_consistency CHECK (
  (applicable_to = 'all' AND applicable_ids IS NULL)
  OR
  (applicable_to IN ('product', 'category', 'variant') AND applicable_ids IS NOT NULL AND array_length(applicable_ids, 1) > 0)
  OR
  (applicable_to = 'user' AND applicable_ids IS NOT NULL)
);
```

**Verify:** You should see "Success. No rows returned"

---

### Step 2: Create Variant Discount Function

This function calculates the best discount for a specific variant.

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Copy and paste the entire contents of:**
```
/database/functions/get_variant_discount.sql
```

**Run the query**

**Verify:** Run this test query:
```sql
SELECT * FROM get_variant_discount(
  'your-variant-id-here'::uuid,
  'your-product-id-here'::uuid,
  'your-category-id-here'::uuid,
  29.99
);
```

You should see a result with columns: `has_discount`, `discount_percentage`, `discounted_price`, `discount_type`, `discount_value`

---

### Step 3: Drop Existing Product Listing Function

First, we need to remove all existing versions of the function.

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Copy and paste the entire contents of:**
```
/database/functions/drop_all_get_products_enhanced.sql
```

**Run the query**

**Verify:** You should see "Success. No rows returned"

---

### Step 4: Create Updated Product Listing Function

Now create the new version with variant discount support.

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Copy and paste the entire contents of:**
```
/database/functions/get_products_enhanced_with_variant_discounts.sql
```

**Run the query**

**Verify:** Run this test query:
```sql
SELECT
  id,
  name,
  has_discount,
  variants
FROM get_products_enhanced(NULL, NULL, NULL, NULL, NULL, false, false, 'created_at', 'DESC', 5, 0)
LIMIT 1;
```

Check the `variants` JSONB field - each variant should now include:
- `has_discount`
- `discount_percentage`
- `discounted_price`
- `final_price`

---

## Testing Your Deployment

### Test 1: Create a Variant-Specific Discount

1. Go to your discount dashboard
2. Create a new discount:
   - **Code:** TEST20
   - **Type:** Percentage
   - **Value:** 20%
   - **Application Scope:** Specific Variants
   - Select one or more variants

3. Save the discount

### Test 2: View in Product Listing

1. Navigate to `/products` on your website
2. Find the product with the discounted variant
3. Select the size/color combination that has the discount
4. You should see:
   - Discount badge showing "-20%"
   - Price displayed in red
   - Original price with strikethrough

### Test 3: Verify Different Variants

1. On the same product, select a different variant (without discount)
2. The discount badge should disappear
3. Price should return to normal
4. Original price strikethrough should disappear

---

## Troubleshooting

### Issue: Discounts not showing

**Check:**
1. Is the discount active? (Dashboard → Discounts → Check is_active toggle)
2. Is the discount within valid dates?
3. Did you select the correct variant ID in the discount form?
4. Run this query to verify:
   ```sql
   SELECT code, applicable_to, applicable_ids, is_active
   FROM discount_codes
   WHERE code = 'YOUR_CODE';
   ```

### Issue: SQL function errors

**Error: "function name 'get_products_enhanced' is not unique"**

This means there are multiple versions of the function. Solution:

1. First, find the exact signature:
   ```sql
   SELECT routine_name, string_agg(parameter_name || ' ' || data_type, ', ') as params
   FROM information_schema.routines
   LEFT JOIN information_schema.parameters ON routines.specific_name = parameters.specific_name
   WHERE routine_name = 'get_products_enhanced'
   GROUP BY routine_name, routine_type, specific_name;
   ```

2. Drop each version manually using the exact signature, e.g.:
   ```sql
   DROP FUNCTION get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);
   ```

3. Then run the create function query again

**Common causes:**
1. `get_product_best_discount` function doesn't exist
   - You may need to create this function first (check existing SQL files)
2. Permission errors
   - Make sure you're running queries as the Supabase admin user
3. Syntax errors
   - Copy the entire file contents without modifications

### Issue: Variant discounts showing wrong price

**Check:**
1. Verify `price_adjustment` is set correctly on the variant
2. Run this query:
   ```sql
   SELECT
     pv.id,
     pv.size,
     pv.color,
     p.base_price,
     pv.price_adjustment,
     (p.base_price + COALESCE(pv.price_adjustment, 0)) as calculated_price
   FROM product_variants pv
   JOIN products p ON p.id = pv.product_id
   WHERE pv.id = 'your-variant-id';
   ```

---

## Rollback (If Needed)

If you need to rollback the changes:

```sql
-- Rollback constraint
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS check_applicable_ids_consistency;

ALTER TABLE public.discount_codes
ADD CONSTRAINT check_applicable_ids_consistency CHECK (
  (applicable_to = 'all' AND applicable_ids IS NULL)
  OR
  (applicable_to IN ('product', 'category') AND applicable_ids IS NOT NULL AND array_length(applicable_ids, 1) > 0)
  OR
  (applicable_to = 'user' AND applicable_ids IS NOT NULL)
);

-- Remove function
DROP FUNCTION IF EXISTS get_variant_discount(UUID, UUID, UUID, NUMERIC);
```

Then restore the old `get_products_enhanced` function from your previous backup.

---

## Performance Notes

- The `get_variant_discount()` function is called for each variant when loading products
- For products with many variants (10+), this may add latency
- Consider adding database indexes on `discount_codes.applicable_ids` (already done in schema)
- Monitor query performance with Supabase dashboard

---

## Next Steps

After successful deployment:

1. ✅ Test variant discounts in staging environment
2. ✅ Create promotional discounts for specific variants
3. ✅ Update product images to highlight discounted variants
4. ✅ Monitor discount usage in analytics

---

## Support

If you encounter issues not covered in this guide:
1. Check Supabase logs for SQL errors
2. Review the browser console for JavaScript errors
3. Verify all TypeScript types match the SQL function return types

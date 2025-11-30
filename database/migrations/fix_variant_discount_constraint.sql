-- Update the applicable_ids_consistency constraint to include 'variant'
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

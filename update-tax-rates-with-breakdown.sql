-- Update tax_rates table to include tax breakdown (GST, PST, QST, HST)
-- This allows displaying separate tax components in checkout

-- First, add new columns to store tax breakdown
ALTER TABLE public.tax_rates
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS pst_rate NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS qst_rate NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS hst_rate NUMERIC(5, 4);

-- Clear existing Canadian tax rates
DELETE FROM public.tax_rates WHERE country_code = 'CA';

-- Alberta: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate)
VALUES ('CA', 'AB', 'Alberta', 0.05, 'GST', 0.05);

-- British Columbia: 5% GST + 7% PST = 12%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate, pst_rate)
VALUES ('CA', 'BC', 'British Columbia', 0.12, 'GST+PST', 0.05, 0.07);

-- Manitoba: 5% GST + 7% PST = 12%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate, pst_rate)
VALUES ('CA', 'MB', 'Manitoba', 0.12, 'GST+PST', 0.05, 0.07);

-- New Brunswick: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, hst_rate)
VALUES ('CA', 'NB', 'New Brunswick', 0.15, 'HST', 0.15);

-- Newfoundland and Labrador: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, hst_rate)
VALUES ('CA', 'NL', 'Newfoundland and Labrador', 0.15, 'HST', 0.15);

-- Northwest Territories: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate)
VALUES ('CA', 'NT', 'Northwest Territories', 0.05, 'GST', 0.05);

-- Nova Scotia: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, hst_rate)
VALUES ('CA', 'NS', 'Nova Scotia', 0.15, 'HST', 0.15);

-- Nunavut: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate)
VALUES ('CA', 'NU', 'Nunavut', 0.05, 'GST', 0.05);

-- Ontario: 13% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, hst_rate)
VALUES ('CA', 'ON', 'Ontario', 0.13, 'HST', 0.13);

-- Prince Edward Island: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, hst_rate)
VALUES ('CA', 'PE', 'Prince Edward Island', 0.15, 'HST', 0.15);

-- Quebec: 5% GST + 9.975% QST = 14.975%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate, qst_rate)
VALUES ('CA', 'QC', 'Quebec', 0.14975, 'GST+QST', 0.05, 0.09975);

-- Saskatchewan: 5% GST + 6% PST = 11%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate, pst_rate)
VALUES ('CA', 'SK', 'Saskatchewan', 0.11, 'GST+PST', 0.05, 0.06);

-- Yukon: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate, tax_type, gst_rate)
VALUES ('CA', 'YT', 'Yukon', 0.05, 'GST', 0.05);

-- Verify the data
SELECT
  state_code,
  state_name,
  tax_type,
  (rate * 100) || '%' as total_rate,
  CASE
    WHEN gst_rate IS NOT NULL THEN 'GST: ' || (gst_rate * 100) || '%'
    ELSE ''
  END as gst,
  CASE
    WHEN pst_rate IS NOT NULL THEN 'PST: ' || (pst_rate * 100) || '%'
    ELSE ''
  END as pst,
  CASE
    WHEN qst_rate IS NOT NULL THEN 'QST: ' || (qst_rate * 100) || '%'
    ELSE ''
  END as qst,
  CASE
    WHEN hst_rate IS NOT NULL THEN 'HST: ' || (hst_rate * 100) || '%'
    ELSE ''
  END as hst
FROM public.tax_rates
WHERE country_code = 'CA'
ORDER BY state_code;

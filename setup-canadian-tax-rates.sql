-- Setup Canadian Provincial Tax Rates
-- Run this in your Supabase SQL Editor to populate tax_rates table
-- These rates include GST/HST/PST combinations as of 2024

-- Clear existing Canadian tax rates (if any)
DELETE FROM public.tax_rates WHERE country_code = 'CA';

-- Insert Canadian provincial tax rates
-- Format: rate is stored as decimal (e.g., 0.13 for 13%)

-- Alberta: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'AB', 'Alberta', 0.05);

-- British Columbia: 5% GST + 7% PST = 12%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'BC', 'British Columbia', 0.12);

-- Manitoba: 5% GST + 7% PST = 12%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'MB', 'Manitoba', 0.12);

-- New Brunswick: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'NB', 'New Brunswick', 0.15);

-- Newfoundland and Labrador: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'NL', 'Newfoundland and Labrador', 0.15);

-- Northwest Territories: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'NT', 'Northwest Territories', 0.05);

-- Nova Scotia: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'NS', 'Nova Scotia', 0.15);

-- Nunavut: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'NU', 'Nunavut', 0.05);

-- Ontario: 13% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'ON', 'Ontario', 0.13);

-- Prince Edward Island: 15% HST
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'PE', 'Prince Edward Island', 0.15);

-- Quebec: 5% GST + 9.975% QST = 14.975%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'QC', 'Quebec', 0.14975);

-- Saskatchewan: 5% GST + 6% PST = 11%
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'SK', 'Saskatchewan', 0.11);

-- Yukon: 5% GST only
INSERT INTO public.tax_rates (country_code, state_code, state_name, rate)
VALUES ('CA', 'YT', 'Yukon', 0.05);

-- Verify the data was inserted
SELECT
  state_code,
  state_name,
  rate,
  (rate * 100) || '%' as percentage
FROM public.tax_rates
WHERE country_code = 'CA'
ORDER BY state_code;

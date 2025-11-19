# Tax Breakdown Display - Setup Guide

This guide explains how the tax breakdown feature works, showing separate GST/PST/QST/HST components in the checkout.

## Features

- **Province-specific tax breakdown**: Shows GST, PST, QST, or HST depending on the province
- **Bilingual support**: Automatically translates to French (TPS, TVP, TVQ, TVH)
- **Accurate calculations**: Each tax component is calculated separately and displayed

## Setup Instructions

### 1. Run the Database Migration

Run the `update-tax-rates-with-breakdown.sql` file in your Supabase SQL Editor:

```bash
# In Supabase SQL Editor, execute:
update-tax-rates-with-breakdown.sql
```

This will:
- Add columns: `tax_type`, `gst_rate`, `pst_rate`, `qst_rate`, `hst_rate`
- Populate all 13 Canadian provinces with their tax breakdowns

### 2. Verify the Migration

After running the script, verify the data in Supabase:

```sql
SELECT
  state_code,
  state_name,
  tax_type,
  (rate * 100) || '%' as total_rate,
  CASE
    WHEN gst_rate IS NOT NULL THEN (gst_rate * 100) || '%'
    ELSE NULL
  END as gst,
  CASE
    WHEN pst_rate IS NOT NULL THEN (pst_rate * 100) || '%'
    ELSE NULL
  END as pst,
  CASE
    WHEN qst_rate IS NOT NULL THEN (qst_rate * 100) || '%'
    ELSE NULL
  END as qst,
  CASE
    WHEN hst_rate IS NOT NULL THEN (hst_rate * 100) || '%'
    ELSE NULL
  END as hst
FROM public.tax_rates
WHERE country_code = 'CA'
ORDER BY state_code;
```

### 3. Restart Your Development Server

```bash
npm run dev
```

## How It Works

### Tax Types by Province

| Province | Tax Type | Display (EN) | Display (FR) | Components |
|----------|----------|--------------|--------------|------------|
| Alberta (AB) | GST | GST (5%) | TPS (5%) | GST only |
| British Columbia (BC) | GST+PST | GST (5%) + PST (7%) | TPS (5%) + TVP (7%) | Both shown |
| Manitoba (MB) | GST+PST | GST (5%) + PST (7%) | TPS (5%) + TVP (7%) | Both shown |
| New Brunswick (NB) | HST | HST (15%) | TVH (15%) | HST only |
| Newfoundland (NL) | HST | HST (15%) | TVH (15%) | HST only |
| Northwest Territories (NT) | GST | GST (5%) | TPS (5%) | GST only |
| Nova Scotia (NS) | HST | HST (15%) | TVH (15%) | HST only |
| Nunavut (NU) | GST | GST (5%) | TPS (5%) | GST only |
| Ontario (ON) | HST | HST (13%) | TVH (13%) | HST only |
| Prince Edward Island (PE) | HST | HST (15%) | TVH (15%) | HST only |
| Quebec (QC) | GST+QST | GST (5%) + QST (9.975%) | TPS (5%) + TVQ (9.975%) | Both shown |
| Saskatchewan (SK) | GST+PST | GST (5%) + PST (6%) | TPS (5%) + TVP (6%) | Both shown |
| Yukon (YT) | GST | GST (5%) | TPS (5%) | GST only |

### Translation Mapping

| English | French | Full Name (EN) | Full Name (FR) |
|---------|--------|----------------|----------------|
| GST | TPS | Goods and Services Tax | Taxe sur les produits et services |
| PST | TVP | Provincial Sales Tax | Taxe de vente provinciale |
| QST | TVQ | Quebec Sales Tax | Taxe de vente du Québec |
| HST | TVH | Harmonized Sales Tax | Taxe de vente harmonisée |

## Example Display

### Quebec (English)
```
Subtotal              $100.00
Shipping              $15.99
GST (5%)              $5.00
QST (9.975%)          $9.98
────────────────────────────
Total                 $130.97
```

### Quebec (French)
```
Sous-total            100,00 $
Livraison             15,99 $
TPS (5 %)             5,00 $
TVQ (9,975 %)         9,98 $
────────────────────────────
Total                 130,97 $
```

### Ontario (English)
```
Subtotal              $100.00
Shipping              $15.99
HST (13%)             $13.00
────────────────────────────
Total                 $128.99
```

### British Columbia (English)
```
Subtotal              $100.00
Shipping              $15.99
GST (5%)              $5.00
PST (7%)              $7.00
────────────────────────────
Total                 $127.99
```

## Code Flow

1. **User selects province** in shipping form
2. **API called**: `/api/tax/calculate` with province code
3. **Database query**: Fetches `tax_type`, `gst_rate`, `pst_rate`, `qst_rate`, `hst_rate`
4. **Response sent**: Includes total rate + breakdown
5. **State updated**: `CheckoutClient` stores `taxBreakdown`
6. **Display**: `OrderSummary` shows individual tax components
7. **Translation**: Uses `useLocale()` to show TPS/TVP/TVQ/TVH in French

## Files Modified

- `src/app/api/tax/calculate/route.ts` - Returns tax breakdown
- `src/app/[locale]/checkout/CheckoutClient.tsx` - Stores tax breakdown state
- `src/app/[locale]/checkout/components/OrderSummary.tsx` - Displays breakdown
- `src/messages/en.json` - English tax labels (GST, PST, QST, HST)
- `src/messages/fr.json` - French tax labels (TPS, TVP, TVQ, TVH)

## Testing

### Test Each Province

1. Go to checkout
2. Select different provinces in shipping address
3. Verify correct tax breakdown appears

**Test Cases:**

- **Quebec**: Should show GST (5%) + QST (9.975%)
- **Ontario**: Should show HST (13%)
- **BC**: Should show GST (5%) + PST (7%)
- **Alberta**: Should show GST (5%) only

### Test Language Switching

1. Switch to French (`/fr/checkout`)
2. Verify tax labels change:
   - GST → TPS
   - PST → TVP
   - QST → TVQ
   - HST → TVH

## Troubleshooting

### Tax breakdown not showing

**Cause**: Database not migrated
**Solution**: Run `update-tax-rates-with-breakdown.sql`

### Shows "Tax: $X.XX" instead of breakdown

**Cause**: API not returning breakdown data
**Solution**: Check API response in browser DevTools Network tab

### Wrong tax amounts

**Cause**: Incorrect rates in database
**Solution**: Verify rates in `tax_rates` table match government rates

### French labels not showing

**Cause**: Translation keys missing
**Solution**: Verify `src/messages/fr.json` has gst, pst, qst, hst keys

## Updating Tax Rates

If tax rates change:

```sql
-- Example: Update Quebec QST rate
UPDATE public.tax_rates
SET qst_rate = 0.09975,
    rate = 0.05 + 0.09975,
    updated_at = now()
WHERE country_code = 'CA' AND state_code = 'QC';
```

Changes take effect immediately without code deployment.

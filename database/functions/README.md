# Database Functions for Pexillo

## Overview
This directory contains PostgreSQL functions that are used by the application. These functions use `SECURITY DEFINER` to bypass Row Level Security (RLS) policies when necessary.

---

## Available Functions

### 1. `check_email_exists(email_to_check TEXT)`

**Purpose**: Check if an email address already exists in the profiles table.

**Why it's needed**:
- RLS policies prevent clients from directly querying the profiles table
- This function bypasses RLS securely to check for duplicate emails
- Provides better UX by catching duplicates before signup attempt

**Returns**: `BOOLEAN`
- `true` if email exists
- `false` if email doesn't exist

**Usage in TypeScript**:
```typescript
const { data: emailExists, error } = await supabase
  .rpc('check_email_exists', { email_to_check: 'user@example.com' });

if (emailExists === true) {
  // Email already registered
}
```

**Location**: `database/functions/check_email_exists.sql`

---

## How to Apply These Functions

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL file contents
5. Click **Run**

### Option 2: Apply All Functions at Once

Run all function files in order:

```bash
# From project root
cat database/functions/*.sql | psql -h your-db-host -U postgres -d postgres
```

### Option 3: Supabase CLI

```bash
supabase db push --file database/functions/check_email_exists.sql
```

---

## Verifying Functions

After applying, verify the functions exist:

```sql
-- List all custom functions
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as is_security_definer
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname LIKE '%email%';
```

Expected output:
```
function_name        | arguments              | is_security_definer
---------------------|------------------------|--------------------
check_email_exists   | email_to_check text   | t
```

---

## Testing Functions

### Test `check_email_exists`

```sql
-- Test with an existing email
SELECT check_email_exists('existing@example.com');
-- Should return: true

-- Test with a non-existing email
SELECT check_email_exists('newuser@example.com');
-- Should return: false
```

---

## Security Considerations

### SECURITY DEFINER
All functions in this directory use `SECURITY DEFINER`, which means they run with the privileges of the user who created them (typically the database owner).

**Why this is safe:**
- Functions only perform specific, controlled operations
- No user input is directly executed in SQL (parameterized queries)
- Functions are granted only to `authenticated` and `anon` roles
- Each function has a single, well-defined purpose

**What to avoid:**
- ❌ Don't add functions that modify data without proper validation
- ❌ Don't expose sensitive information through these functions
- ❌ Don't use dynamic SQL with user input

---

## Maintenance

### Updating a Function

To update an existing function:

1. Modify the SQL file
2. Run the SQL in Supabase Dashboard
3. The `CREATE OR REPLACE FUNCTION` will update the existing function
4. No need to drop or recreate

### Removing a Function

```sql
DROP FUNCTION IF EXISTS public.check_email_exists(TEXT);
```

---

## Related Documentation

- **Triggers**: `database/triggers/README.md`
- **Email Setup**: `docs/SUPABASE_EMAIL_SETUP.md`
- **Supabase Functions Docs**: https://supabase.com/docs/guides/database/functions

---

## Troubleshooting

### Function not found error

**Error**: `function public.check_email_exists(text) does not exist`

**Solution**:
1. Verify the function was created: Check SQL Editor
2. Apply the SQL file from `database/functions/check_email_exists.sql`
3. Check for typos in function name when calling it

### Permission denied error

**Error**: `permission denied for function check_email_exists`

**Solution**:
```sql
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated, anon;
```

### Function returns unexpected results

**Debug steps**:
1. Test directly in SQL Editor
2. Check the profiles table data
3. Verify email comparison is case-insensitive
4. Check for whitespace in email strings

---

## Function List Quick Reference

| Function Name | Parameters | Returns | Purpose |
|--------------|------------|---------|---------|
| `check_email_exists` | `email_to_check: TEXT` | `BOOLEAN` | Check if email exists in profiles |

---

## Adding New Functions

When creating new functions:

1. Create a new `.sql` file in this directory
2. Use clear, descriptive naming
3. Add `SECURITY DEFINER` only if needed
4. Grant appropriate permissions
5. Document in this README
6. Test thoroughly before deployment

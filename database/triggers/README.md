# Database Triggers for Pexillo

## Enhanced User Profile Creation Trigger

### Overview
This trigger automatically creates a user profile in `public.profiles` when a new user signs up through Supabase Auth. It extracts all signup form data from the user's metadata and populates the profile table.

### What It Does
When a user signs up, the trigger captures:
- ✅ **Full Name** - User's complete name
- ✅ **Email** - User's email address
- ✅ **Phone** - Phone number for contact
- ✅ **Date of Birth** - Optional birthday information
- ✅ **Gender** - Optional gender selection
- ✅ **Marketing Consent** - GDPR-compliant email opt-in
- ✅ **Preferred Language** - User's language preference (en/fr)

### How to Apply

#### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `handle_new_user.sql`
5. Click **Run** to execute

#### Option 2: Via Supabase CLI
```bash
# Make sure you're in the project root
supabase db push --file database/triggers/handle_new_user.sql
```

#### Option 3: Via psql
```bash
psql -h your-db-host -U postgres -d postgres -f database/triggers/handle_new_user.sql
```

### Verification

After applying the trigger, you can verify it's working by:

1. **Check if function exists:**
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';
```

2. **Check if trigger exists:**
```sql
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

3. **Test with a signup:**
   - Go to `/auth/sign-up`
   - Fill out the signup form
   - Check the `profiles` table to ensure all fields are populated

### Data Flow

```
User Signup Form
      ↓
Supabase Auth (creates auth.users record)
      ↓
Trigger: on_auth_user_created fires
      ↓
Function: handle_new_user() executes
      ↓
Profile created in public.profiles with all metadata
      ↓
User redirected to success page
```

### Important Notes

- The trigger runs **AUTOMATICALLY** - no manual intervention needed
- All signup form data is captured from `raw_user_meta_data`
- The trigger uses `SECURITY DEFINER` to ensure proper permissions
- If the trigger fails, the entire signup transaction is rolled back
- Empty or null values are handled gracefully with `COALESCE`

### Troubleshooting

**Profile not being created?**
- Verify the trigger is enabled
- Check Supabase logs for errors
- Ensure the `profiles` table exists with correct schema

**Missing field values?**
- Verify the signup form is sending data in `options.data`
- Check that field names match between form and trigger
- Review the `raw_user_meta_data` in `auth.users` table

**Permission errors?**
- Ensure RLS policies allow INSERT on `profiles` table
- Check that the function has `SECURITY DEFINER` set

### Related Files
- Signup Form: `/src/components/sign-up-form.tsx`
- Profile Schema: See your Supabase database schema
- Translations: `/src/messages/en.json`, `/src/messages/fr.json`

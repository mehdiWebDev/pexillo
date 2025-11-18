-- =================================================
-- AUTOMATIC PROFILE CREATION FOR PEXILLO USERS
-- =================================================
-- This script creates a function and trigger to automatically
-- create a profile in the public.profiles table when a user
-- signs up through Supabase Auth
--
-- ENHANCED: Now captures full signup form data including
-- phone, date_of_birth, gender, marketing_consent, and preferred_language

-- Step 1: Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    date_of_birth,
    gender,
    marketing_consent,
    preferred_language,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    NEW.raw_user_meta_data->>'gender',
    COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced profile creation trigger setup complete!';
    RAISE NOTICE 'New users will automatically get profiles created with:';
    RAISE NOTICE '  - Full Name';
    RAISE NOTICE '  - Phone Number';
    RAISE NOTICE '  - Date of Birth';
    RAISE NOTICE '  - Gender';
    RAISE NOTICE '  - Marketing Consent';
    RAISE NOTICE '  - Preferred Language';
END $$;

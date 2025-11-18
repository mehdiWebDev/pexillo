-- =================================================
-- EMAIL EXISTENCE CHECK FUNCTION
-- =================================================
-- This function allows checking if an email already exists
-- in the profiles table. It uses SECURITY DEFINER to bypass
-- RLS policies, making it safe to call from the client.

CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(email) = LOWER(email_to_check)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated, anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Email existence check function created successfully!';
    RAISE NOTICE 'This function can be called from the client to check for duplicate emails';
END $$;

-- ========================================
-- Debug: Check User Language Metadata
-- ========================================
-- Run this in Supabase SQL Editor to see what language is stored for recent signups

-- Recent users with their language preference
SELECT
  email,
  created_at,
  raw_user_meta_data->>'preferred_language' as preferred_language,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'signup_source' as signup_source,
  confirmed_at,
  CASE
    WHEN confirmed_at IS NULL THEN '❌ Not confirmed'
    ELSE '✅ Confirmed'
  END as email_status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Count users by language preference
SELECT
  raw_user_meta_data->>'preferred_language' as language,
  COUNT(*) as user_count
FROM auth.users
GROUP BY raw_user_meta_data->>'preferred_language'
ORDER BY user_count DESC;

-- Full metadata for the most recent user (for debugging)
SELECT
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

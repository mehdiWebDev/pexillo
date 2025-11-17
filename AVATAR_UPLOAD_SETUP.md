# Avatar Upload Setup Guide

## Issue
Getting error when uploading avatar: `{statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy"}`

## Solution
You need to set up Row Level Security (RLS) policies for the Supabase Storage `avatars` bucket.

## Steps to Fix

### 1. Run the SQL Script in Supabase

Go to **Supabase Dashboard** → **SQL Editor** → **New Query** and run the SQL from `setup-avatars-bucket-rls.sql`:

```sql
-- See setup-avatars-bucket-rls.sql for the full script
```

This creates 4 policies:
- ✅ Allow authenticated users to upload avatars
- ✅ Allow users to update their own avatars
- ✅ Allow users to delete their own avatars
- ✅ Allow public read access to all avatars

### 2. Ensure the Avatars Bucket is Public

1. Go to **Supabase Dashboard** → **Storage**
2. Click on the **avatars** bucket
3. Click **Settings** (gear icon)
4. Make sure **"Public bucket"** is **enabled**
5. Save changes

### 3. File Organization

Avatars are now organized by user ID:
```
avatars/
  ├── user-id-1/
  │   └── 1234567890.jpg
  ├── user-id-2/
  │   └── 1234567891.png
  └── ...
```

This organization:
- Keeps files organized per user
- Makes RLS policies simpler and more secure
- Allows users to only manage their own files

## How It Works

### Upload Process
1. User selects an image
2. File is validated (type and size)
3. Old avatar is deleted (if exists)
4. New file is uploaded to `{userId}/{timestamp}.{ext}`
5. Profile is updated with the new public URL

### RLS Policies
- **Upload**: Users can only upload to their own folder (`{userId}/...`)
- **Update/Delete**: Users can only modify files in their own folder
- **Read**: Everyone can read all avatars (public bucket)

## Verification

After running the SQL script:

1. Go to **Storage** → **avatars** → **Policies**
2. You should see 4 policies listed
3. Try uploading an avatar - it should work now!

## Troubleshooting

### Still getting 403 error?

1. **Check the bucket exists**:
   - Go to Storage and verify "avatars" bucket exists

2. **Verify policies are created**:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'objects'
   AND policyname LIKE '%avatars%';
   ```

3. **Check user is authenticated**:
   - The upload only works for logged-in users
   - Verify user token is valid

4. **Try recreating the bucket**:
   - Delete the avatars bucket
   - Create a new one named "avatars"
   - Mark it as public
   - Run the SQL script again

### Alternative: Simpler RLS (No Folders)

If you prefer not to use folders, you can use this simpler policy:

```sql
-- Allow any authenticated user to upload to avatars bucket
CREATE POLICY "Allow authenticated uploads to avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow any authenticated user to delete from avatars bucket
CREATE POLICY "Allow authenticated deletes from avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow public read
CREATE POLICY "Public avatars read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**Note**: The folder-based approach (default) is more secure as users can only manage their own files.

## Support

If you continue to have issues:
1. Check Supabase logs in the Dashboard
2. Verify your Supabase project has RLS enabled
3. Ensure you're using the latest Supabase client library

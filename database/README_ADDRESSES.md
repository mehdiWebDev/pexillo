# Addresses Table Setup

This guide explains how to set up the addresses table for user address management.

## Features

The addresses table supports:
- Multiple addresses per user
- Address labels (Home, Work, Other)
- Default address selection
- Full address details (name, phone, street, city, province, postal code, country)
- Automatic timestamp tracking
- Row Level Security (RLS) policies

## Setup Instructions

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `create_addresses_table.sql`
4. Paste and run the SQL

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/mahdiouatah/Documents/personal-projects/pexillo

# Run the migration
supabase db push
```

Or manually execute:

```bash
psql -h your-supabase-host -U postgres -d postgres -f database/create_addresses_table.sql
```

## Table Schema

```sql
addresses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  label VARCHAR(50),                -- 'home', 'work', 'other'
  full_name VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),       -- Optional
  city VARCHAR(100),
  province VARCHAR(50),             -- Canadian provinces
  postal_code VARCHAR(20),
  country VARCHAR(2),               -- Default: 'CA'
  is_default BOOLEAN,               -- Only one can be true per user
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Security

- Row Level Security (RLS) is enabled
- Users can only view/edit/delete their own addresses
- Policies ensure data isolation between users

## Automatic Features

1. **Single Default Address**: Trigger ensures only one address per user can be marked as default
2. **Updated At Timestamp**: Automatically updates when address is modified
3. **Cascade Delete**: Addresses are deleted when user is deleted

## Testing

After running the migration, test the functionality:

1. Go to your profile page
2. Click on the "Addresses" tab
3. Add a new address
4. Try setting it as default
5. Edit and delete addresses

## Troubleshooting

If you encounter errors:

- Ensure you have proper database permissions
- Check that the `auth.users` table exists
- Verify your Supabase project is accessible
- Check the SQL Editor for detailed error messages

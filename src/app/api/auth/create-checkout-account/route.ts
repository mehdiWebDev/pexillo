import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, phone } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'Email and password are required.',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email',
          message: 'Please enter a valid email address.',
        },
        { status: 400 }
      );
    }

    // Validate password (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: 'Invalid password',
          message: 'Password must be at least 8 characters long.',
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(
      (user: any) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return NextResponse.json(
        {
          error: 'Email already in use',
          message: 'An account with this email already exists. Please sign in or use a different email address.',
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('❌ Failed to create user account:', authError);
      return NextResponse.json(
        {
          error: 'Account creation failed',
          message: authError.message || 'Failed to create account. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!authData?.user) {
      return NextResponse.json(
        {
          error: 'Account creation failed',
          message: 'Failed to create account. Please try again.',
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;
    console.log('✅ User account created during checkout:', userId);

    // Create profile using admin client
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email,
      full_name: `${firstName || ''} ${lastName || ''}`.trim() || null,
      phone: phone || null,
    });

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      // Delete the auth user if profile creation fails (rollback)
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        {
          error: 'Profile creation failed',
          message: 'Failed to create user profile. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log('✅ User profile created successfully');

    return NextResponse.json({
      success: true,
      userId,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('❌ Account creation error:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

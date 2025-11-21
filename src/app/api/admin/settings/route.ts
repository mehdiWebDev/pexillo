// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface SettingValue {
  [key: string]: unknown;
  is_active: boolean;
  description?: string | null;
}

interface SettingsObject {
  [key: string]: SettingValue;
}

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Fetch all settings
export async function GET() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Failed to fetch settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Transform array to object for easier access
    const settingsObj: SettingsObject = {};
    settings.forEach((setting) => {
      settingsObj[setting.setting_key] = {
        ...setting.setting_value,
        is_active: setting.is_active,
        description: setting.description,
      };
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update a setting
export async function POST(req: NextRequest) {
  try {
    const { setting_key, setting_value, description, is_active } = await req.json();

    if (!setting_key) {
      return NextResponse.json(
        { error: 'setting_key is required' },
        { status: 400 }
      );
    }

    // Upsert the setting
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .upsert({
        setting_key,
        setting_value,
        description,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save setting:', error);
      return NextResponse.json(
        { error: 'Failed to save setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      setting: data,
    });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a setting
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const setting_key = searchParams.get('setting_key');

    if (!setting_key) {
      return NextResponse.json(
        { error: 'setting_key is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .delete()
      .eq('setting_key', setting_key);

    if (error) {
      console.error('Failed to delete setting:', error);
      return NextResponse.json(
        { error: 'Failed to delete setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

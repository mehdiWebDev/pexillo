// src/app/[locale]/dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from '@/src/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  Settings as SettingsIcon,
  Mail,
  Save,
  Loader2,
  Bell,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/src/components/ui/alert';

export default function SettingsPage() {
  const t = useTranslations('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.admin_notification_email) {
          setAdminEmail(data.admin_notification_email.email || '');
          setIsNotificationsEnabled(data.admin_notification_email.is_active ?? true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (adminEmail && !emailRegex.test(adminEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'admin_notification_email',
          setting_value: { email: adminEmail },
          is_active: isNotificationsEnabled,
          description: 'Email address to receive new order notifications',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'Your settings have been updated successfully',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your store settings and preferences
        </p>
      </div>

      {/* Order Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Order Notifications
          </CardTitle>
          <CardDescription>
            Configure email notifications for new orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              When a customer completes a purchase, an email notification will be sent to the address below.
              The email includes order details, customer information, and items purchased.
            </AlertDescription>
          </Alert>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="adminEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Admin Email Address
            </Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              This email will receive notifications for all new orders
            </p>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableNotifications"
              checked={isNotificationsEnabled}
              onChange={(e) => setIsNotificationsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="enableNotifications" className="cursor-pointer">
              Enable order notifications
            </Label>
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Future Settings Sections */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Shipping Settings</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

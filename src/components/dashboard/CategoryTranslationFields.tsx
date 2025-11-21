// src/components/dashboard/CategoryTranslationFields.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Label } from '@/src/components/ui/label';
import { toast } from '@/src/hooks/use-toast';
import { Save, Loader2, Languages } from 'lucide-react';

interface CategoryTranslationFieldsProps {
  categoryId: string;
  categoryData: {
    name: string;
    description: string;
  };
}

interface Translations {
  fr: {
    name: string;
    description: string;
  };
}

export default function CategoryTranslationFields({ 
  categoryId, 
  categoryData 
}: CategoryTranslationFieldsProps) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translations, setTranslations] = useState<Translations>({
    fr: {
      name: '',
      description: ''
    }
  });

  const loadTranslations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('translations')
        .eq('id', categoryId)
        .single();

      if (error) {
        console.error('Error loading translations:', error);
        return;
      }

      // Load existing translations if they exist
      if (data?.translations?.fr) {
        setTranslations({
          fr: {
            name: data.translations.fr.name || '',
            description: data.translations.fr.description || ''
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryId, supabase]);

  // Load translations on mount
  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  const handleFieldChange = (field: keyof Translations['fr'], value: string) => {
    setTranslations(prev => ({
      ...prev,
      fr: {
        ...prev.fr,
        [field]: value
      }
    }));
  };

  const saveTranslations = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ 
          translations: translations
        })
        .eq('id', categoryId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Translations saved successfully',
      });
      
    } catch (error) {
      console.error('Error saving translations:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save translations',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading translations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            French Translations
          </CardTitle>
          <CardDescription>
            Add French translations for this category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Name Translation */}
          <div className="space-y-2">
            <Label htmlFor="name-fr">Category Name (French)</Label>
            <Input
              id="name-fr"
              value={translations.fr.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Nom de la catégorie en français"
            />
            <p className="text-xs text-muted-foreground">
              Original: {categoryData.name}
            </p>
          </div>

          {/* Description Translation */}
          <div className="space-y-2">
            <Label htmlFor="description-fr">Description (French)</Label>
            <Textarea
              id="description-fr"
              value={translations.fr.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Description en français"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Original: {categoryData.description || 'No description'}
            </p>
          </div>

          {/* Common Translations Reference */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Common Translations</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• T-shirts → T-shirts</p>
              <p>• Hoodies → Sweats à capuche</p>
              <p>• Accessories → Accessoires</p>
              <p>• New Arrivals → Nouveautés</p>
              <p>• Sale → Soldes</p>
              <p>• Men → Homme</p>
              <p>• Women → Femme</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveTranslations} 
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Translations
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
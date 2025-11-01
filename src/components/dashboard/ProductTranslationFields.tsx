// src/components/dashboard/ProductTranslationFields.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Save, Loader2, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/src/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ProductData {
  name: string;
  short_description?: string;
  description?: string;
  material?: string;
  care_instructions?: string;
  badge?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
}

interface Variant {
  id?: string;
  tempId?: string;
  size: string;
  color: string;
  color_hex: string;
}

interface ProductTranslationFieldsProps {
  productId: string;
  productData: ProductData;
  variants?: Variant[];
}

export default function ProductTranslationFields({
  productId,
  productData,
  variants = []
}: ProductTranslationFieldsProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Product translations state
  const [productTranslations, setProductTranslations] = useState<any>({
    fr: {
      name: '',
      short_description: '',
      material: '',
      care_instructions: '',
      badge: '',
      tags: []
    }
  });

  // Rich content translations state
  const [richTranslations, setRichTranslations] = useState<any>({
    fr: {
      description: '',
      meta_title: '',
      meta_description: ''
    }
  });

  // Variant translations state
  const [variantTranslations, setVariantTranslations] = useState<any>({});
  const [tagInput, setTagInput] = useState('');

  // Load existing translations
  useEffect(() => {
    if (productId && productId !== 'new') {
      loadTranslations();
    }
  }, [productId]);

  const loadTranslations = async () => {
    setLoading(true);
    try {
      // Load product JSONB translations
      const { data: product } = await supabase
        .from('products')
        .select('translations')
        .eq('id', productId)
        .single();

      if (product?.translations?.fr) {
        setProductTranslations({
          fr: {
            ...productTranslations.fr,
            ...product.translations.fr
          }
        });
      }

      // Load rich content from translations table
      const { data: richContent } = await supabase
        .from('translations')
        .select('field_name, translated_text')
        .eq('entity_type', 'product')
        .eq('entity_id', productId)
        .eq('language_code', 'fr');

      if (richContent) {
        const richData: any = { fr: {} };
        richContent.forEach((item) => {
          richData.fr[item.field_name] = item.translated_text;
        });
        setRichTranslations(richData);
      }

      // Load variant translations if we have saved variants
      const savedVariants = variants.filter(v => v.id);
      if (savedVariants.length > 0) {
        const { data: variantsData } = await supabase
          .from('product_variants')
          .select('id, translations')
          .in('id', savedVariants.map(v => v.id!));

        if (variantsData) {
          const varTranslations: any = {};
          variantsData.forEach((variant) => {
            if (variant.translations?.fr) {
              varTranslations[variant.id] = { fr: variant.translations.fr };
            }
          });
          setVariantTranslations(varTranslations);
        }
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load translations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductFieldChange = (field: string, value: string | string[]) => {
    setProductTranslations((prev: any) => ({
      ...prev,
      fr: {
        ...prev.fr,
        [field]: value
      }
    }));
  };

  const handleRichFieldChange = (field: string, value: string) => {
    setRichTranslations((prev: any) => ({
      ...prev,
      fr: {
        ...prev.fr,
        [field]: value
      }
    }));
  };

  const handleVariantFieldChange = (variantId: string, field: string, value: string) => {
    setVariantTranslations((prev: any) => ({
      ...prev,
      [variantId]: {
        fr: {
          ...(prev[variantId]?.fr || {}),
          [field]: value
        }
      }
    }));
  };

  // The handleAddTag function should now work correctly
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = productTranslations.fr.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        handleProductFieldChange('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = productTranslations.fr.tags || [];
    handleProductFieldChange('tags', currentTags.filter((tag: string) => tag !== tagToRemove));
  };

  // Fix for ProductTranslationFields.tsx - Replace the saveTranslations function with this:

  const saveTranslations = async () => {
    setSaving(true);
    try {
      // Prepare JSONB translations (excluding description and meta fields)
      const jsonbTranslations = {
        fr: {
          name: productTranslations.fr.name,
          short_description: productTranslations.fr.short_description,
          material: productTranslations.fr.material,
          care_instructions: productTranslations.fr.care_instructions,
          badge: productTranslations.fr.badge || '',
          tags: productTranslations.fr.tags || []
        }
      };

      // Save JSONB translations to products table
      console.log('Saving JSONB translations:', jsonbTranslations);
        const { error: productError } = await supabase
          .from('products')
          .update({
            translations: jsonbTranslations
          })
          .eq('id', productId);

        if (productError) {
          console.error('Error saving product translations:', productError);
          throw productError;
        }

        // Save rich content to translations table (description, meta_title, meta_description)
        const richFields = [
          { field: 'description', value: richTranslations.fr.description },
          { field: 'meta_title', value: richTranslations.fr.meta_title },
          { field: 'meta_description', value: richTranslations.fr.meta_description }
        ];

      for (const { field, value } of richFields) {
        if (value && value.trim() !== '') {
            console.log(`Saving ${field} to translations table:`, value);

            const { error } = await supabase
              .from('translations')
              .upsert({
                entity_type: 'product',
                entity_id: productId,
                field_name: field,
                language_code: 'fr',
                translated_text: value
              }, {
                onConflict: 'entity_type,entity_id,field_name,language_code'
              });

            if (error) {
              console.error(`Error saving ${field} translation:`, error);
              throw error;
            }
        }
      }

      // Save variant translations
      for (const variant of variants.filter(v => v.id)) {
        if (variantTranslations[variant.id!]?.fr) {
          const variantJsonb = {
            fr: {
              color: variantTranslations[variant.id!].fr.color || '',
              size_label: variantTranslations[variant.id!].fr.size_label || ''
            }
          };

          console.log(`Saving variant ${variant.id} translations:`, variantJsonb);
          const { error } = await supabase
            .from('product_variants')
            .update({
              translations: variantJsonb
            })
            .eq('id', variant.id!);

          if (error) {
            console.error(`Error saving variant ${variant.id} translations:`, error);
            throw error;
          }
        }
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });

      toast({
        title: 'Success',
        description: 'Translations saved successfully',
      });

      // Reload translations to confirm save
      loadTranslations();
    } catch (error: any) {
      console.error('Error saving translations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save translations',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                French Translations
              </CardTitle>
              <CardDescription>
                Manage French translations for this product and its variants
              </CardDescription>
            </div>
            <Button onClick={saveTranslations} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Translations
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Translate basic product fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product Name (French)</label>
              <Input
                value={productTranslations.fr.name}
                onChange={(e) => handleProductFieldChange('name', e.target.value)}
                placeholder="Nom du produit en français"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.name}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Short Description (French)</label>
              <Textarea
                value={productTranslations.fr.short_description}
                onChange={(e) => handleProductFieldChange('short_description', e.target.value)}
                placeholder="Description courte en français"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.short_description}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Badge (French)</label>
              <Select
                value={productTranslations.fr.badge || 'none'}
                onValueChange={(value) => {
                  // Store empty string for 'none' in the data, but use 'none' as the select value
                  handleProductFieldChange('badge', value === 'none' ? '' : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select French badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Aucun</SelectItem>
                  <SelectItem value="NOUVEAU">NOUVEAU</SelectItem>
                  <SelectItem value="CHAUD">CHAUD</SelectItem>
                  <SelectItem value="SOLDE">SOLDE</SelectItem>
                  <SelectItem value="LIMITÉ">LIMITÉ</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.badge || 'None'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Translate product specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Material (French)</label>
              <Input
                value={productTranslations.fr.material}
                onChange={(e) => handleProductFieldChange('material', e.target.value)}
                placeholder="ex: 100% Coton"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.material}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Care Instructions (French)</label>
              <Textarea
                value={productTranslations.fr.care_instructions}
                onChange={(e) => handleProductFieldChange('care_instructions', e.target.value)}
                placeholder="Instructions d'entretien en français"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.care_instructions}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Tags (French)</label>
              <div className="space-y-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Ajouter un tag et appuyer sur Entrée"
                />
                <div className="flex flex-wrap gap-2">
                  {(productTranslations.fr.tags || []).map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="px-2 py-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Original tags: {productData.tags?.join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rich Content */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Content</CardTitle>
          <CardDescription>Translate long-form content and SEO fields</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full Description (French)</label>
            <Textarea
              value={richTranslations.fr.description}
              onChange={(e) => handleRichFieldChange('description', e.target.value)}
              placeholder="Description complète en français"
              rows={6}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Meta Title (French)</label>
              <Input
                value={richTranslations.fr.meta_title}
                onChange={(e) => handleRichFieldChange('meta_title', e.target.value)}
                placeholder="Titre SEO en français"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.meta_title}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Meta Description (French)</label>
              <Textarea
                value={richTranslations.fr.meta_description}
                onChange={(e) => handleRichFieldChange('meta_description', e.target.value)}
                placeholder="Description SEO en français"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {productData.meta_description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant Translations */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variant Translations</CardTitle>
            <CardDescription>Translate variant colors and sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variants.map((variant, index) => {
                const variantId = variant.id || `temp-${index}`;
                const isTemp = !variant.id;

                return (
                  <div key={variantId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: variant.color_hex }}
                        />
                        <span className="font-medium">
                          {variant.size} - {variant.color}
                        </span>
                      </div>
                      {isTemp && (
                        <Badge variant="secondary">Not saved yet</Badge>
                      )}
                    </div>

                    {!isTemp ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Color (French)</label>
                          <Input
                            value={variantTranslations[variantId]?.fr?.color || ''}
                            onChange={(e) => handleVariantFieldChange(variantId, 'color', e.target.value)}
                            placeholder="ex: Noir, Blanc, Rouge"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Size Label (French)</label>
                          <Input
                            value={variantTranslations[variantId]?.fr?.size_label || ''}
                            onChange={(e) => handleVariantFieldChange(variantId, 'size_label', e.target.value)}
                            placeholder="ex: Petit, Moyen, Grand"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Save the product to add translations for this variant
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
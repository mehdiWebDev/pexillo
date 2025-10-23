// src/components/dashboard/ProductForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Package
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Switch } from '@/src/components/ui/switch';
import { Badge } from '@/src/components/ui/badge';
import { useToast } from '@/src/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

// Complete form validation schema with all database fields
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  short_description: z.string().optional(),
  description: z.string().optional(),
  base_price: z.number().min(0, 'Price must be positive'),
  category_id: z.string().min(1, 'Category is required'),
  badge: z.enum(['NEW', 'HOT', 'SALE', 'LIMITED', 'none']).optional().nullable(),
  sku: z.string().optional(),
  material: z.string().optional(),
  care_instructions: z.string().optional(),
  tags: z.array(z.string()).optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  dtf_compatible: z.boolean(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

interface Variant {
  id?: string;
  tempId?: string;
  size: string;
  color: string;
  color_hex: string;
  price_adjustment: number;
  inventory_count: number;
  sku?: string;
  is_active: boolean;
}

interface ProductImage {
  id?: string;
  file?: File;
  url?: string;
  is_primary: boolean;
  view_type: 'front' | 'back' | 'side' | 'detail';
  alt_text: string;
  variantIndex?: number;
  display_order: number;
  sort_order: number;
}

interface ProductFormProps {
  productId?: string;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('dashboard.productsSection');
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [productData, setProductData] = useState<any>(null);
  const isEditing = !!productId;
  
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      short_description: '',
      description: '',
      base_price: 0,
      category_id: '',
      badge: 'none',
      sku: '',
      material: '',
      care_instructions: '',
      tags: [],
      meta_title: '',
      meta_description: '',
      dtf_compatible: true,
      is_active: true,
      is_featured: false,
    },
  });

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    
    const { data: product } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_images (*)
      `)
      .eq('id', productId)
      .single();

    if (product) {
      setProductData(product);
      
      form.reset({
        name: product.name,
        slug: product.slug,
        short_description: product.short_description || '',
        description: product.description || '',
        base_price: product.base_price,
        category_id: product.category_id,
        badge: product.badge || 'none',
        sku: product.sku || '',
        material: product.material || '',
        care_instructions: product.care_instructions || '',
        tags: product.tags || [],
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || '',
        dtf_compatible: product.dtf_compatible ?? true,
        is_active: product.is_active,
        is_featured: product.is_featured,
      });
      
      setVariants(product.product_variants || []);
      
      const loadedImages = product.product_images?.map((img: any) => {
        const variantIndex = product.product_variants?.findIndex((v: any) => v.id === img.variant_id);
        return {
          ...img,
          url: img.image_url,
          variantIndex: variantIndex >= 0 ? variantIndex : undefined,
          display_order: img.display_order || 0,
          sort_order: img.sort_order || 0,
        };
      }) || [];
      
      setImages(loadedImages);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const generateVariantSKU = (productName: string, size: string, color: string) => {
    const prefix = productName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${size}-${color.substring(0, 3).toUpperCase()}-${timestamp}`;
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const addVariant = () => {
    const productName = form.getValues('name') || 'PROD';
    const tempId = `temp-${Date.now()}`;
    setVariants([
      ...variants,
      {
        tempId,
        size: 'M',
        color: 'Black',
        color_hex: '#000000',
        price_adjustment: 0,
        inventory_count: 0,
        sku: generateVariantSKU(productName, 'M', 'Black'),
        is_active: true,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setImages(images.filter(img => img.variantIndex !== index));
    setImages(prev => prev.map(img => ({
      ...img,
      variantIndex: img.variantIndex !== undefined && img.variantIndex > index 
        ? img.variantIndex - 1 
        : img.variantIndex
    })));
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    
    if ((field === 'size' || field === 'color') && !updated[index].sku) {
      const productName = form.getValues('name') || 'PROD';
      updated[index].sku = generateVariantSKU(
        productName,
        updated[index].size,
        updated[index].color
      );
    }
    
    setVariants(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newImages: ProductImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      
      newImages.push({
        file,
        url,
        is_primary: images.length === 0 && i === 0,
        view_type: 'front',
        alt_text: '',
        display_order: images.length + i,
        sort_order: images.length + i,
      });
    }

    setImages([...images, ...newImages]);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    
    if (images[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    
    updated.forEach((img, i) => {
      img.display_order = i;
      img.sort_order = i;
    });
    
    setImages(updated);
  };

  const setPrimaryImage = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    setImages(updated);
  };

  const updateImageViewType = (index: number, viewType: 'front' | 'back' | 'side' | 'detail') => {
    const updated = [...images];
    updated[index].view_type = viewType;
    setImages(updated);
  };

  const updateImageVariant = (imageIndex: number, variantIndex: number | null) => {
    const updated = [...images];
    updated[imageIndex].variantIndex = variantIndex === null ? undefined : variantIndex;
    setImages(updated);
  };

  const uploadImageToStorage = async (file: File, productId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Math.random()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setLoading(true);

    try {
      const submitData: any = {
        name: data.name,
        slug: data.slug,
        short_description: data.short_description || null,
        description: data.description || null,
        base_price: data.base_price,
        category_id: data.category_id,
        badge: data.badge === 'none' ? null : data.badge,
        sku: data.sku || null,
        material: data.material || null,
        care_instructions: data.care_instructions || null,
        tags: data.tags && data.tags.length > 0 ? data.tags : null,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        dtf_compatible: data.dtf_compatible,
        is_active: data.is_active,
        is_featured: data.is_featured,
      };

      let finalProductId: string;

      if (isEditing && productId) {
        const { error } = await supabase
          .from('products')
          .update(submitData)
          .eq('id', productId);

        if (error) throw error;
        finalProductId = productId;

        await supabase.from('product_images').delete().eq('product_id', productId);
        await supabase.from('product_variants').delete().eq('product_id', productId);
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([submitData])
          .select()
          .single();

        if (error) throw error;
        finalProductId = newProduct.id;
      }

      const savedVariantIds: string[] = [];
      
      for (const variant of variants) {
        const variantData = {
          product_id: finalProductId,
          size: variant.size,
          color: variant.color,
          color_hex: variant.color_hex,
          price_adjustment: variant.price_adjustment || 0,
          inventory_count: variant.inventory_count || 0,
          sku: variant.sku || generateVariantSKU(data.name, variant.size, variant.color),
          is_active: variant.is_active,
        };

        const { data: savedVariant, error: variantError } = await supabase
          .from('product_variants')
          .insert([variantData])
          .select()
          .single();

        if (variantError) throw variantError;
        savedVariantIds.push(savedVariant.id);
      }

      let primaryImageUrl: string | null = null;

      for (const [index, image] of images.entries()) {
        let imageUrl = image.url;
        
        if (image.file) {
          imageUrl = await uploadImageToStorage(image.file, finalProductId);
        }

        if (imageUrl) {
          const variantId = image.variantIndex !== undefined ? savedVariantIds[image.variantIndex] : null;
          
          const imageData = {
            product_id: finalProductId,
            variant_id: variantId,
            image_url: imageUrl,
            is_primary: image.is_primary,
            view_type: image.view_type,
            alt_text: image.alt_text || '',
            display_order: index,
            sort_order: index,
          };

          const { error: imageError } = await supabase
            .from('product_images')
            .insert([imageData]);

          if (imageError) {
            console.error('Error saving image:', imageError);
            throw imageError;
          }

          if (image.is_primary) {
            primaryImageUrl = imageUrl;
          }
        }
      }

      if (primaryImageUrl) {
        await supabase
          .from('products')
          .update({ primary_image_url: primaryImageUrl })
          .eq('id', finalProductId);
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      
      toast({
        title: t('success'),
        description: isEditing ? t('productUpdated') : t('productCreated'),
      });

      setTimeout(() => {
        router.push('/dashboard/products');
      }, 500);
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: t('error'),
        description: error.message || t('errorSaving'),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? t('editProduct') : t('newProduct')}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? t('editDescription') : t('newDescription')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/products')}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {t('save')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">{t('general')}</TabsTrigger>
            <TabsTrigger value="images">{t('images')}</TabsTrigger>
            <TabsTrigger value="variants">{t('variants')}</TabsTrigger>
          </TabsList>

          {/* Enhanced General Tab with all database fields */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('basicInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productName')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!isEditing) {
                                form.setValue('slug', generateSlug(e.target.value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('slug')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>{t('slugDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('category')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCategory')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="base_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('basePrice')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('descriptions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="short_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shortDescription')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Brief product overview" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} placeholder="Detailed product description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>Additional product information and specifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 100% Cotton, Polyester blend" />
                        </FormControl>
                        <FormDescription>Fabric or material composition</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="care_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Care Instructions</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Machine wash cold, tumble dry low" />
                        </FormControl>
                        <FormDescription>Washing and care guidelines</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="badge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('badge')}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || 'none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectBadge')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="NEW">NEW</SelectItem>
                            <SelectItem value="HOT">HOT</SelectItem>
                            <SelectItem value="SALE">SALE</SelectItem>
                            <SelectItem value="LIMITED">LIMITED</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dtf_compatible"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>DTF Compatible</FormLabel>
                          <FormDescription>Suitable for DTF printing</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Type a tag and press Enter"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  if (tagInput.trim()) {
                                    const currentTags = field.value || [];
                                    if (!currentTags.includes(tagInput.trim())) {
                                      field.onChange([...currentTags, tagInput.trim()]);
                                    }
                                    setTagInput('');
                                  }
                                }}
                              >
                                Add Tag
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {field.value?.map((tag, index) => (
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
                        </FormControl>
                        <FormDescription>Add keywords for search and filtering</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO & Settings</CardTitle>
                <CardDescription>Search engine optimization and visibility settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="meta_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SEO page title" />
                        </FormControl>
                        <FormDescription>Title for search engines (50-60 characters)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meta_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="SEO page description" />
                        </FormControl>
                        <FormDescription>Description for search engines (150-160 characters)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('active')}</FormLabel>
                          <FormDescription>{t('activeDescription')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('featured')}</FormLabel>
                          <FormDescription>{t('featuredDescription')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {isEditing && productData && (
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                  <CardDescription>Product performance metrics (read-only)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Views</p>
                      <p className="text-2xl font-bold">{productData.view_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Purchases</p>
                      <p className="text-2xl font-bold">{productData.purchase_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Rating</p>
                      <p className="text-2xl font-bold">{productData.average_rating || 0}⭐</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reviews</p>
                      <p className="text-2xl font-bold">{productData.review_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Images Tab - Same as before */}
          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('productImages')}</CardTitle>
                <CardDescription>
                  Upload images and assign them to specific variants or as general product images
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                        <div className="text-center">
                          {uploading ? (
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                          ) : (
                            <Upload className="h-8 w-8 mx-auto mb-2" />
                          )}
                          <p className="text-sm text-muted-foreground">
                            {uploading ? t('uploading') : t('uploadImages')}
                          </p>
                        </div>
                      </div>
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-square relative">
                          {image.url ? (
                            <img
                              src={image.url}
                              alt={image.alt_text || `Product image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          
                          {image.is_primary && (
                            <Badge className="absolute top-2 left-2" variant="default">
                              Primary
                            </Badge>
                          )}
                          
                          <Badge className="absolute top-2 right-2" variant="outline">
                            {image.view_type}
                          </Badge>
                        </div>
                        
                        <CardContent className="p-3 space-y-2">
                          <div>
                            <label className="text-xs font-medium">View Type</label>
                            <Select
                              value={image.view_type}
                              onValueChange={(value: 'front' | 'back' | 'side' | 'detail') => 
                                updateImageViewType(index, value)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="front">Front</SelectItem>
                                <SelectItem value="back">Back</SelectItem>
                                <SelectItem value="side">Side</SelectItem>
                                <SelectItem value="detail">Detail</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {variants.length > 0 && (
                            <div>
                              <label className="text-xs font-medium">Assign to Variant</label>
                              <Select
                                value={image.variantIndex !== undefined ? image.variantIndex.toString() : 'all'}
                                onValueChange={(value) => {
                                  updateImageVariant(index, value === 'all' ? null : parseInt(value));
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Variants</SelectItem>
                                  {variants.map((variant, vIndex) => (
                                    <SelectItem key={vIndex} value={vIndex.toString()}>
                                      {variant.size} - {variant.color}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div>
                            <label className="text-xs font-medium">Alt Text</label>
                            <Input
                              className="h-8"
                              value={image.alt_text}
                              onChange={(e) => {
                                const updated = [...images];
                                updated[index].alt_text = e.target.value;
                                setImages(updated);
                              }}
                              placeholder="Describe this image"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={image.is_primary ? 'default' : 'outline'}
                              onClick={() => setPrimaryImage(index)}
                              type="button"
                              className="flex-1"
                            >
                              {image.is_primary ? 'Primary' : 'Set Primary'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeImage(index)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants Tab - Same as before */}
          <TabsContent value="variants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('productVariants')}</CardTitle>
                    <CardDescription>{t('variantsDescription')}</CardDescription>
                  </div>
                  <Button type="button" onClick={addVariant}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addVariant')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {variants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('noVariants')}
                    </div>
                  ) : (
                    variants.map((variant, index) => (
                      <Card key={variant.id || variant.tempId || index}>
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <label className="text-sm font-medium">{t('size')}</label>
                              <Select
                                value={variant.size}
                                onValueChange={(value) => updateVariant(index, 'size', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => (
                                    <SelectItem key={size} value={size}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">{t('color')}</label>
                              <div className="flex gap-2">
                                <Input
                                  value={variant.color}
                                  onChange={(e) => updateVariant(index, 'color', e.target.value)}
                                  placeholder="Color name"
                                />
                                <Input
                                  type="color"
                                  value={variant.color_hex}
                                  onChange={(e) => updateVariant(index, 'color_hex', e.target.value)}
                                  className="w-12"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium">{t('sku')}</label>
                              <Input
                                value={variant.sku || ''}
                                onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                placeholder="Auto-generated if empty"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium">{t('inventory')}</label>
                              <Input
                                type="number"
                                value={variant.inventory_count}
                                onChange={(e) => updateVariant(index, 'inventory_count', parseInt(e.target.value))}
                                min="0"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium">{t('priceAdjustment')}</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={variant.price_adjustment}
                                onChange={(e) => updateVariant(index, 'price_adjustment', parseFloat(e.target.value))}
                              />
                            </div>

                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => removeVariant(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {images.filter(img => img.variantIndex === index).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {images.filter(img => img.variantIndex === index).length} image(s) assigned
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
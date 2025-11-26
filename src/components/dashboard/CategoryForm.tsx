// src/components/dashboard/CategoryForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Switch } from '@/src/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Loader2, Upload, X, Languages } from 'lucide-react';
import { toast } from '@/src/hooks/use-toast';
import Image from 'next/image';
import CategoryTranslationFields from './CategoryTranslationFields';

// Constants
const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Form validation schema - matches database exactly
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().nullable().optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
  // image_url is handled separately as it's not in the form
});

// Type for form data
type FormData = z.infer<typeof formSchema>;

// Database category type - matches your schema exactly
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  translations?: Record<string, {
    name?: string;
    description?: string;
  }>;
}

interface CategoryFormProps {
  categoryId?: string;
}

export default function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isEditing = !!categoryId;

  // Initialize form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      is_active: true,
      sort_order: 0,
    },
  });

  const fetchCategory = useCallback(async () => {
    if (!categoryId) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) throw error;

      if (data) {
        const category = data as Category;
        form.reset({
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          is_active: category.is_active,
          sort_order: category.sort_order,
        });
        setImageUrl(category.image_url);
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      toast({
        title: 'Error',
        description: 'Failed to load category',
        variant: 'destructive',
      });
    }
  }, [categoryId, supabase, form]);

  // Load category data if editing
  useEffect(() => {
    if (isEditing && categoryId) {
      fetchCategory();
    }
  }, [categoryId, isEditing, fetchCategory]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG or WebP image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `categories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('category-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast({
        title: 'Upload failed',
        description: uploadError.message,
        variant: 'destructive',
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('category-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const removeImage = () => {
    setImageFile(null);
    setImageUrl(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const onSubmit = async (formData: FormData) => {
    setLoading(true);

    try {
      // Check if name already exists (excluding current category when editing)
      const nameQuery = supabase
        .from('categories')
        .select('id')
        .eq('name', formData.name);

      // When editing, exclude the current category from the check
      if (isEditing) {
        nameQuery.neq('id', categoryId);
      }

      const { data: existingNameCategories, error: nameCheckError } = await nameQuery;

      if (nameCheckError) throw nameCheckError;

      if (existingNameCategories && existingNameCategories.length > 0) {
        toast({
          title: 'Duplicate Name',
          description: 'A category with this name already exists. Please use a different name.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if slug already exists (excluding current category when editing)
      const slugQuery = supabase
        .from('categories')
        .select('id')
        .eq('slug', formData.slug);

      // When editing, exclude the current category from the check
      if (isEditing) {
        slugQuery.neq('id', categoryId);
      }

      const { data: existingSlugCategories, error: slugCheckError } = await slugQuery;

      if (slugCheckError) throw slugCheckError;

      if (existingSlugCategories && existingSlugCategories.length > 0) {
        toast({
          title: 'Duplicate Slug',
          description: 'A category with this slug already exists. Please use a different slug.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      let finalImageUrl = imageUrl;

      // Upload new image if selected
      if (imageFile) {
        setUploading(true);
        const uploadedUrl = await uploadImage(imageFile);
        setUploading(false);

        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      // Prepare data for database - matches schema exactly
      const categoryData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        image_url: finalImageUrl,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };

      if (isEditing) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', categoryId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Category updated successfully',
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Category created successfully',
        });
      }

      router.push('/dashboard/categories');
      router.refresh();
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/categories');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="translations" disabled={!isEditing}>
              <Languages className="mr-2 h-4 w-4" />
              Translations
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Configure the basic details of your category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Category name"
                          onChange={(e) => {
                            field.onChange(e);
                            // Auto-generate slug for new categories
                            if (!isEditing) {
                              const newSlug = generateSlug(e.target.value);
                              form.setValue('slug', newSlug);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Slug Field */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="category-slug"
                        />
                      </FormControl>
                      <FormDescription>
                        URL-friendly version of the name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description Field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="Category description (optional)"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <div>
                  <FormLabel>Category Image</FormLabel>
                  <div className="mt-2 space-y-4">
                    {imageUrl ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                        <Image
                          src={imageUrl}
                          alt="Category"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-2">
                            <label
                              htmlFor="image-upload"
                              className="cursor-pointer text-sm text-blue-600 hover:text-blue-500"
                            >
                              <span>Upload an image</span>
                              <input
                                id="image-upload"
                                type="file"
                                className="sr-only"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                onChange={handleImageUpload}
                                disabled={uploading}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, WebP up to 5MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Sort Order Field */}
                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers appear first
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Make this category visible
                          </FormDescription>
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

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || uploading}
              >
                {(loading || uploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Update' : 'Create'} Category
              </Button>
            </div>
          </TabsContent>

          {/* Translations Tab */}
          <TabsContent value="translations">
            {isEditing && categoryId ? (
              <CategoryTranslationFields 
                categoryId={categoryId}
                categoryData={{
                  name: form.getValues('name'),
                  description: form.getValues('description') || '',
                }}
              />
            ) : (
              <Card>
                <CardContent className="py-10">
                  <p className="text-center text-muted-foreground">
                    Please save the category first to add translations
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
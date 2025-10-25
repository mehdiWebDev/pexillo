// src/components/dashboard/CategoryForm.tsx
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
  Upload,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { useToast } from '@/src/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

// Form validation schema
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug too long'),
  description: z.string().optional(),
  sort_order: z.number().min(0, 'Sort order must be positive'),
  is_active: z.boolean(),
});

interface CategoryFormProps {
  categoryId?: string;
}

export default function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('dashboard.categories');
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  const [removeImage, setRemoveImage] = useState(false);
  const isEditing = !!categoryId;
  
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      sort_order: 0,
      is_active: true,
    },
  });

  // Load category if editing
  useEffect(() => {
    if (categoryId) {
      loadCategory();
    }
  }, [categoryId]);

  const loadCategory = async () => {
    if (!categoryId) return;
    
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load category',
        variant: 'destructive',
      });
      router.push('/dashboard/categories');
      return;
    }

    if (category) {
      form.reset({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        sort_order: category.sort_order || 0,
        is_active: category.is_active,
      });
      
      if (category.image_url) {
        setExistingImageUrl(category.image_url);
        setImagePreview(category.image_url);
      }
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(true);
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `categories/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  // Delete image from storage
  const deleteImageFromStorage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // categories/filename.ext
      
      await supabase.storage
        .from('product-images')
        .remove([filePath]);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Submit form
  const onSubmit = async (data: z.infer<typeof categorySchema>) => {
    setLoading(true);

    try {
      let imageUrl = existingImageUrl;

      // Handle image upload
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImageToStorage(imageFile);
        setUploading(false);
        
        // Delete old image if replacing
        if (existingImageUrl && existingImageUrl !== imageUrl) {
          await deleteImageFromStorage(existingImageUrl);
        }
      } else if (removeImage && existingImageUrl) {
        // Delete image if removed
        await deleteImageFromStorage(existingImageUrl);
        imageUrl = '';
      }

      const categoryData = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
        image_url: imageUrl,
      };

      if (isEditing && categoryId) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', categoryId);

        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      toast({
        title: 'Success',
        description: isEditing ? 'Category updated successfully' : 'Category created successfully',
      });

      // Redirect to categories list
      setTimeout(() => {
        router.push('/dashboard/categories');
      }, 500);
      
    } catch (error: any) {
      console.error('Error saving category:', error);
      
      // Check for unique constraint violations
      if (error.code === '23505') {
        if (error.message.includes('categories_name_key')) {
          form.setError('name', {
            type: 'manual',
            message: 'A category with this name already exists',
          });
        } else if (error.message.includes('categories_slug_key')) {
          form.setError('slug', {
            type: 'manual',
            message: 'A category with this slug already exists',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save category',
          variant: 'destructive',
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Category' : 'New Category'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update category information' : 'Add a new category to your store'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Category name and identification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., T-Shirts"
                          onChange={(e) => {
                            field.onChange(e);
                            if (!isEditing) {
                              form.setValue('slug', generateSlug(e.target.value));
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The display name for this category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., t-shirts" />
                      </FormControl>
                      <FormDescription>
                        URL-friendly version of the name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          placeholder="Describe this category..."
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description for this category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Image and Settings */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Image</CardTitle>
                  <CardDescription>
                    Upload an image to represent this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Image Preview */}
                    {imagePreview ? (
                      <div className="relative aspect-square w-full max-w-xs mx-auto">
                        <img
                          src={imagePreview}
                          alt="Category preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="aspect-square w-full max-w-xs mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No image uploaded</p>
                        </div>
                      </div>
                    )}

                    {/* Upload Button */}
                    <div>
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {uploading ? 'Uploading...' : 'Upload Image'}
                        </div>
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={uploading}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        PNG, JPG, GIF up to 2MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Configure category visibility and ordering
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Category is visible to customers
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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/categories')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Switch } from '@/src/components/ui/switch';
import { Calendar } from '@/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';
import { CalendarIcon, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { discountService, DiscountCode } from '@/src/services/discountService';
import { useToast } from '@/src/hooks/use-toast';

interface DiscountFormProps {
  discount?: DiscountCode | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DiscountForm({
  discount,
  onSuccess,
  onCancel
}: DiscountFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku?: string }>>([]);
  const [variants, setVariants] = useState<Array<{
    id: string;
    display_name: string;
    sku?: string;
    size: string;
    color: string;
    color_hex?: string;
    price: number;
    stock_quantity: number;
  }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping',
    discount_value: 10,
    minimum_purchase: 0,
    maximum_discount: null as number | null,
    usage_limit: null as number | null,
    user_usage_limit: 1,
    is_active: true,
    valid_from: new Date(),
    valid_until: null as Date | null,
    applicable_to: 'all' as 'all' | 'product' | 'variant' | 'category' | 'user',
    campaign_name: '',
    discount_category: null as string | null,
    stackable: false,
    first_purchase_only: false,
    minimum_items: null as number | null,
    priority: 0,
    show_on_products: false,
  });

  // Load products, variants and categories on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load products
        const productsRes = await fetch('/api/admin/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.map((p: { id: string; name: string; sku?: string }) => ({
            id: p.id,
            name: p.name,
            sku: p.sku
          })));
        }

        // Load variants
        const variantsRes = await fetch('/api/admin/variants');
        if (variantsRes.ok) {
          const variantsData = await variantsRes.json();
          setVariants(variantsData);
        }

        // Load categories
        const categoriesRes = await fetch('/api/admin/categories');
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name
          })));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (discount) {
      setFormData({
        code: discount.code,
        description: discount.description || '',
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        minimum_purchase: discount.minimum_purchase || 0,
        maximum_discount: discount.maximum_discount || null,
        usage_limit: discount.usage_limit || null,
        user_usage_limit: discount.user_usage_limit || 1,
        is_active: discount.is_active || true,
        valid_from: discount.valid_from ? new Date(discount.valid_from) : new Date(),
        valid_until: discount.valid_until ? new Date(discount.valid_until) : null,
        applicable_to: discount.applicable_to || 'all',
        campaign_name: discount.campaign_name || '',
        discount_category: discount.discount_category || null,
        stackable: discount.stackable || false,
        first_purchase_only: discount.first_purchase_only || false,
        minimum_items: discount.minimum_items || null,
        priority: discount.priority || 0,
        show_on_products: discount.show_on_products || false,
      });

      // Set selected products/variants/categories if applicable
      if (discount.applicable_to === 'product' && discount.applicable_ids) {
        setSelectedProducts(discount.applicable_ids);
      } else if (discount.applicable_to === 'variant' && discount.applicable_ids) {
        setSelectedVariants(discount.applicable_ids);
      } else if (discount.applicable_to === 'category' && discount.applicable_ids) {
        setSelectedCategories(discount.applicable_ids);
      }
    }
  }, [discount]);

  const generateCode = () => {
    const code = discountService.generateDiscountCode();
    setFormData({ ...formData, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Determine applicable_ids based on applicable_to
      let applicable_ids = null;
      if (formData.applicable_to === 'product' && selectedProducts.length > 0) {
        applicable_ids = selectedProducts;
      } else if (formData.applicable_to === 'variant' && selectedVariants.length > 0) {
        applicable_ids = selectedVariants;
      } else if (formData.applicable_to === 'category' && selectedCategories.length > 0) {
        applicable_ids = selectedCategories;
      }

      const data = {
        ...formData,
        discount_category: formData.discount_category || null,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until?.toISOString() || null,
        applicable_ids,
      };

      const response = await fetch(
        discount
          ? `/api/admin/discounts/${discount.id}`
          : '/api/admin/discounts',
        {
          method: discount ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save discount');
      }

      toast({
        title: 'Success',
        description: discount
          ? 'Discount updated successfully'
          : 'Discount created successfully',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error saving discount:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save discount',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="code">Discount Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateCode}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="campaign">Campaign Name</Label>
            <Input
              id="campaign"
              value={formData.campaign_name}
              onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
              placeholder="Summer Sale 2024"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description of the discount (internal use)"
            rows={3}
          />
        </div>
      </div>

      {/* Discount Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Discount Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="type">Discount Type</Label>
            <Select
              value={formData.discount_type}
              onValueChange={(value: string) => {
                // Ignore empty string values (shadcn Select bug)
                if (value === '' || !value) return;
                setFormData({ ...formData, discount_type: value as 'percentage' | 'fixed_amount' | 'free_shipping' });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                <SelectItem value="free_shipping">Free Shipping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.discount_type !== 'free_shipping' && (
            <div>
              <Label htmlFor="value">
                {formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
              </Label>
              <Input
                id="value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                min="0"
                max={formData.discount_type === 'percentage' ? '100' : undefined}
                step="0.01"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="category">Discount Category</Label>
            <Select
              value={formData.discount_category || 'none'}
              onValueChange={(value) => {
                // Ignore empty string values (shadcn Select bug)
                if (value === '') return;
                setFormData({ ...formData, discount_category: value === 'none' ? null : value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
                <SelectItem value="clearance">Clearance</SelectItem>
                <SelectItem value="new_customer">New Customer</SelectItem>
                <SelectItem value="loyalty">Loyalty</SelectItem>
                <SelectItem value="flash_sale">Flash Sale</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="min-purchase">Minimum Purchase ($)</Label>
            <Input
              id="min-purchase"
              type="number"
              value={formData.minimum_purchase}
              onChange={(e) => setFormData({ ...formData, minimum_purchase: parseFloat(e.target.value) })}
              min="0"
              step="0.01"
            />
          </div>

          {formData.discount_type === 'percentage' && (
            <div>
              <Label htmlFor="max-discount">Maximum Discount ($)</Label>
              <Input
                id="max-discount"
                type="number"
                value={formData.maximum_discount || ''}
                onChange={(e) => setFormData({ ...formData, maximum_discount: e.target.value ? parseFloat(e.target.value) : null })}
                min="0"
                step="0.01"
                placeholder="No limit"
              />
            </div>
          )}

          <div>
            <Label htmlFor="min-items">Minimum Items</Label>
            <Input
              id="min-items"
              type="number"
              value={formData.minimum_items || ''}
              onChange={(e) => setFormData({ ...formData, minimum_items: e.target.value ? parseInt(e.target.value) : null })}
              min="1"
              placeholder="No minimum"
            />
          </div>
        </div>
      </div>

      {/* Applies To */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Applies To</h3>

        <div>
          <Label htmlFor="applies-to">Application Scope</Label>
          <Select
            value={formData.applicable_to}
            onValueChange={(value: string) => {
              // Ignore empty string values (shadcn Select bug)
              if (value === '' || !value) return;
              setFormData({ ...formData, applicable_to: value as 'all' | 'product' | 'variant' | 'category' | 'user' });
              // Reset selections when changing type
              setSelectedProducts([]);
              setSelectedVariants([]);
              setSelectedCategories([]);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="product">Specific Products</SelectItem>
              <SelectItem value="variant">Specific Variants</SelectItem>
              <SelectItem value="category">Specific Categories</SelectItem>
              <SelectItem value="user">Specific Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Selection */}
        {formData.applicable_to === 'product' && (
          <div>
            <Label>Select Products</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {products.length === 0 ? (
                <p className="text-sm text-gray-500">Loading products...</p>
              ) : (
                products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{product.name} {product.sku ? `(${product.sku})` : ''}</span>
                  </label>
                ))
              )}
            </div>
            {selectedProducts.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{selectedProducts.length} product(s) selected</p>
            )}
          </div>
        )}

        {/* Variant Selection */}
        {formData.applicable_to === 'variant' && (
          <div>
            <Label>Select Variants</Label>
            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
              {variants.length === 0 ? (
                <p className="text-sm text-gray-500">Loading variants...</p>
              ) : (
                <div className="space-y-1">
                  {variants.map((variant) => (
                    <label
                      key={variant.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVariants.includes(variant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVariants([...selectedVariants, variant.id]);
                          } else {
                            setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{variant.display_name}</div>
                        <div className="text-xs text-gray-500 flex gap-3">
                          <span>SKU: {variant.sku || 'N/A'}</span>
                          <span>Price: ${variant.price}</span>
                          <span>Stock: {variant.stock_quantity}</span>
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: variant.color_hex || '#ccc' }}
                            title={variant.color}
                          />
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedVariants.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{selectedVariants.length} variant(s) selected</p>
            )}
          </div>
        )}

        {/* Category Selection */}
        {formData.applicable_to === 'category' && (
          <div>
            <Label>Select Categories</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500">Loading categories...</p>
              ) : (
                categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, category.id]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))
              )}
            </div>
            {selectedCategories.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{selectedCategories.length} category(ies) selected</p>
            )}
          </div>
        )}
      </div>

      {/* Usage Limits */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Usage Limits</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="usage-limit">Total Usage Limit</Label>
            <Input
              id="usage-limit"
              type="number"
              value={formData.usage_limit || ''}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
              min="1"
              placeholder="Unlimited"
            />
          </div>

          <div>
            <Label htmlFor="user-limit">Per User Limit</Label>
            <Input
              id="user-limit"
              type="number"
              value={formData.user_usage_limit}
              onChange={(e) => setFormData({ ...formData, user_usage_limit: parseInt(e.target.value) })}
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority (0-100)</Label>
            <Input
              id="priority"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Validity Period */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Validity Period</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Valid From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.valid_from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.valid_from ? format(formData.valid_from, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.valid_from}
                  onSelect={(date) => date && setFormData({ ...formData, valid_from: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Valid Until (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.valid_until && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.valid_until ? format(formData.valid_until, "PPP") : "No expiry"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.valid_until || undefined}
                  onSelect={(date) => setFormData({ ...formData, valid_until: date || null })}
                  initialFocus
                  disabled={(date) => date < formData.valid_from}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Options</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active">Active</Label>
              <p className="text-sm text-gray-500">Enable this discount code</p>
            </div>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>


          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="stackable">Stackable</Label>
              <p className="text-sm text-gray-500">Can be combined with other discounts</p>
            </div>
            <Switch
              id="stackable"
              checked={formData.stackable}
              onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="first-purchase">First Purchase Only</Label>
              <p className="text-sm text-gray-500">Only for first-time customers</p>
            </div>
            <Switch
              id="first-purchase"
              checked={formData.first_purchase_only}
              onCheckedChange={(checked) => setFormData({ ...formData, first_purchase_only: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-on-products">Show on Product Listings</Label>
              <p className="text-sm text-gray-500">Display as sale price on product cards</p>
            </div>
            <Switch
              id="show-on-products"
              checked={formData.show_on_products}
              onCheckedChange={(checked) => setFormData({ ...formData, show_on_products: checked })}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : discount ? 'Update Discount' : 'Create Discount'}
        </Button>
      </div>
    </form>
  );
}
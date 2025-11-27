# 🔍 Search System Documentation

## Overview
The Pexillo search system provides a comprehensive, real-time product search experience with instant suggestions, trending searches, and advanced filtering capabilities. The search is bilingual (English/French) and includes analytics tracking for improving search relevance.

## Table of Contents
- [Features](#features)
- [What You Can Search](#what-you-can-search)
- [How to Use Search](#how-to-use-search)
- [Search Components](#search-components)
- [Technical Implementation](#technical-implementation)
- [Database Setup](#database-setup)
- [Analytics & Trending](#analytics--trending)

---

## Features

### 🎯 Core Search Features
- **Real-time Search** - Instant results as you type with 300ms debouncing
- **Smart Suggestions** - Dropdown with product previews, recent searches, and trending items
- **Bilingual Support** - Full support for English and French
- **Keyboard Navigation** - Arrow keys, Enter, and Escape shortcuts
- **Mobile Optimized** - Responsive design for all screen sizes
- **Search History** - Remembers your recent searches (stored locally)
- **Analytics Tracking** - Tracks popular searches to improve trending suggestions

### 🎨 Visual Features
- **Product Previews** - Thumbnail images in search suggestions
- **Price Display** - Shows current price and discounts
- **Stock Status** - Indicates if products are in stock
- **Badges** - NEW, SALE, HOT, LIMITED indicators
- **Loading States** - Smooth skeleton loaders and spinners

---

## What You Can Search

The search system looks through multiple fields to find relevant products:

### 📝 Searchable Fields

| Field | Description | Example | Priority Score |
|-------|-------------|---------|---------------|
| **Product Name** | Exact or partial product names | "T-Shirt", "Hoodie" | 100 (exact), 80 (starts with), 60 (contains) |
| **Short Description** | Brief product descriptions | "Comfortable cotton" | 40 |
| **Full Description** | Detailed product information | "Made from organic materials" | 30 |
| **Category Name** | Product categories | "Apparel", "Accessories" | 25 |
| **Tags** | Product tags and keywords | "summer", "casual" | 20 |
| **Material** | Product material info | "Cotton", "Polyester" | 20 |
| **SKU** | Product SKU (exact match) | "TSH-001-BLK" | 100 |

### 🔎 Search Examples

```
✅ "shirt"          - Finds all products with "shirt" in name/description
✅ "red hoodie"      - Finds hoodies that are red
✅ "cotton"          - Finds products made from cotton
✅ "summer"          - Finds products tagged with "summer"
✅ "TSH-001"         - Finds product with exact SKU match
✅ "new arrivals"    - Finds products with "new" badge or in description
```

---

## How to Use Search

### 🖥️ Desktop Search

1. **Click on the search bar** in the navigation header
2. **Start typing** your search query
3. **View instant suggestions** in the dropdown:
   - Product previews with images
   - Recent searches (when search is empty)
   - Trending searches
   - Browse categories
4. **Navigate with keyboard**:
   - `↑↓` Arrow keys to select suggestions
   - `Enter` to search or select
   - `Escape` to close dropdown
5. **Click on a product** to go directly to product page
6. **Click "View All Results"** to see full search results page

### 📱 Mobile Search

1. **Tap the menu icon** (☰) in the header
2. **Use the search bar** at the top of the mobile menu
3. **Same features** as desktop but optimized for touch
4. **Full-screen results** for better mobile experience

### 🎛️ Search Results Page

The search results page (`/search`) includes:

- **Result count** - Shows number of products found
- **Quick filters**:
  - "In Stock" - Show only available products
  - "On Sale" - Show only discounted products
- **Product grid** - Responsive layout (2 columns mobile, 3-4 desktop)
- **Pagination** - Navigate through multiple pages of results
- **Empty states** - Helpful messages when no results found

---

## Search Components

### Component Structure

```
/components/search/
├── SearchBar.tsx           # Main search input with logic
├── SearchDropdown.tsx      # Dropdown suggestions component
└── /app/[locale]/search/   # Search results page
    ├── page.tsx
    └── SearchPageClient.tsx
```

### SearchBar Component

**Location**: `/src/components/search/SearchBar.tsx`

**Props**:
```typescript
interface SearchBarProps {
  className?: string;        // Custom CSS classes
  inputClassName?: string;    // Custom input styles
  placeholder?: string;       // Search placeholder text
  isMobile?: boolean;        // Mobile variant
  onSearchComplete?: () => void; // Callback after search
}
```

**Usage**:
```jsx
<SearchBar
  className="flex-1 max-w-md"
  placeholder="Search products..."
/>
```

### SearchDropdown Component

**Location**: `/src/components/search/SearchDropdown.tsx`

**Features**:
- Product preview cards
- Recent search history
- Trending searches
- Category quick links
- Keyboard navigation support

---

## Technical Implementation

### Search Service

**Location**: `/src/services/searchService.ts`

#### Main Functions

```typescript
// Main search with filters
searchProducts(options: SearchOptions): Promise<SearchResponse>

// Quick search for autocomplete (max 5 results)
quickSearch(query: string): Promise<SearchResult[]>

// Get search suggestions (recent, trending, categories)
getSearchSuggestions(): Promise<SuggestionsResponse>

// Track search for analytics
trackSearch(query: string, resultCount: number): Promise<void>

// Manage search history
getSearchHistory(): string[]
addToSearchHistory(query: string): void
clearSearchHistory(): void
```

### Search Hook

**Location**: `/src/hooks/useSearch.ts`

```typescript
const {
  query,              // Current search query
  setQuery,          // Update query
  searchResults,     // Search results
  quickResults,      // Quick search results
  suggestions,       // Search suggestions
  isLoading,         // Loading state
  handleSearch,      // Execute search
  clearSearch,       // Clear search
  // ... pagination helpers
} = useSearch();
```

### Search Relevance Scoring

Products are ranked by relevance score:

| Match Type | Score | Example |
|------------|-------|---------|
| Exact name match | 100 | Query: "T-Shirt", Name: "T-Shirt" |
| Name starts with | 80 | Query: "Shirt", Name: "Shirt Blue" |
| Name contains | 60 | Query: "Blue", Name: "T-Shirt Blue" |
| Short description | 40 | Found in short description |
| Full description | 30 | Found in full description |
| Category match | 25 | Found in category name |
| Tags match | 20 | Found in product tags |
| Default | 10 | Other matches |

---

## Database Setup

### Required SQL Functions

#### 1. Search Function
**File**: `/database/functions/search_products.sql`

```sql
-- Main search function
CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (...)
```

This function:
- Searches across multiple fields
- Calculates relevance scores
- Returns paginated results
- Filters only active products

#### 2. Analytics Table (Optional)
**File**: `/database/tables/search_analytics.sql`

```sql
-- Tracks search queries for analytics
CREATE TABLE search_analytics (
  id UUID PRIMARY KEY,
  search_query TEXT,
  result_count INTEGER,
  user_id UUID,
  search_timestamp TIMESTAMPTZ
);
```

Features:
- Row Level Security (RLS) enabled
- No direct API access (security)
- Access only through secure functions

#### 3. Trending Function
**File**: `/database/functions/get_trending_products.sql`

```sql
-- Returns trending searches/products
CREATE OR REPLACE FUNCTION get_trending_searches(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 10
)
```

### Setup Instructions

1. **Create the search function**:
   ```sql
   -- Run contents of /database/functions/search_products.sql
   ```

2. **Optional: Enable analytics**:
   ```sql
   -- Run contents of /database/tables/search_analytics.sql
   ```

3. **Optional: Add trending products**:
   ```sql
   -- Run contents of /database/functions/get_trending_products.sql
   ```

---

## Analytics & Trending

### How Trending Works

The system determines trending searches through three methods (in order):

1. **Search Analytics** (Primary)
   - Tracks actual user searches
   - Counts frequency over last 7 days
   - Most accurate trending data

2. **Popular Products** (Fallback)
   - Uses `purchase_count` and `view_count`
   - Shows most popular product names
   - Good indicator of interest

3. **Default List** (Final Fallback)
   - Static list of common searches
   - Ensures something always displays

### Search History

- **Storage**: Browser localStorage
- **Limit**: Last 10 searches
- **Privacy**: User-specific, not shared
- **Clear**: Users can clear history manually

### Analytics Tracking

When enabled, the system tracks:
- Search queries
- Result counts
- User ID (if authenticated)
- Clicked products
- Timestamps

This data is used to:
- Generate trending searches
- Improve search relevance
- Understand user behavior
- Optimize product discovery

---

## Configuration

### Environment Variables
No additional environment variables required. Uses existing Supabase configuration.

### Customization Options

#### Debounce Delay
Change search debounce timing in `/src/hooks/useSearch.ts`:
```typescript
const debouncedQuery = useDebounce(query, 300); // 300ms default
```

#### Results Per Page
Modify in `/src/hooks/useSearch.ts`:
```typescript
const limit = 20; // Products per page
```

#### Quick Search Results
Adjust in `/src/services/searchService.ts`:
```typescript
quickSearch(query, 5); // Show 5 quick results
```

#### Search History Limit
Change in `/src/services/searchService.ts`:
```typescript
const MAX_HISTORY_ITEMS = 10; // Keep 10 recent searches
```

---

## Troubleshooting

### Common Issues

#### Search not working
1. Check if `search_products` function exists in Supabase
2. Verify products table has data
3. Check browser console for errors

#### No trending searches
- This is normal without analytics table
- System falls back to popular products or defaults

#### Analytics not tracking
- Optional feature - requires `search_analytics` table
- Check if table and functions are created
- Verify RLS policies are in place

---

## Performance

- **Debounced Search**: 300ms delay prevents excessive API calls
- **Cached Results**: React Query caches for 30 seconds
- **Lazy Loading**: Images load on demand
- **Pagination**: Limits results to 20 per page
- **Indexed Fields**: Database indexes on searchable columns

---

## Security

- **RLS Protected**: Analytics table has Row Level Security
- **No Direct Access**: Analytics only accessible via functions
- **Input Validation**: All queries are sanitized
- **Secure Functions**: Uses `SECURITY DEFINER` for controlled access

---

## Future Enhancements

Potential improvements for the search system:

- [ ] **Fuzzy Search** - Handle typos and misspellings
- [ ] **Search Filters** - Add category, price filters to dropdown
- [ ] **Voice Search** - Add voice input capability
- [ ] **Search Highlighting** - Highlight matched terms in results
- [ ] **AI Suggestions** - ML-based search recommendations
- [ ] **Search Synonyms** - Map related terms (e.g., "tee" → "t-shirt")
- [ ] **Advanced Analytics** - Click-through rates, conversion tracking
- [ ] **Personalized Results** - Based on user history and preferences

---

## Support

For issues or questions about the search system:
1. Check this documentation
2. Review the error messages in browser console
3. Verify database functions are properly installed
4. Check Supabase logs for any SQL errors

---

*Last Updated: November 2024*
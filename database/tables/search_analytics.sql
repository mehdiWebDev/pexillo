-- Table: search_analytics
-- Description: Track search queries for analytics and trending searches

-- Create the search analytics table
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  search_query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  user_id UUID NULL,
  session_id TEXT NULL,
  clicked_product_id UUID NULL,
  search_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT search_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT search_analytics_user_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT search_analytics_product_fkey FOREIGN KEY (clicked_product_id)
    REFERENCES products (id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_query
  ON public.search_analytics(search_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp
  ON public.search_analytics(search_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user
  ON public.search_analytics(user_id);

-- Function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  search_term TEXT,
  search_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    LOWER(search_query) as search_term,
    COUNT(*) as search_count
  FROM search_analytics
  WHERE
    search_timestamp >= NOW() - INTERVAL '1 day' * days_back
    AND result_count > 0 -- Only count searches that had results
  GROUP BY LOWER(search_query)
  ORDER BY search_count DESC
  LIMIT limit_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy 1: Nobody can SELECT directly from the table (privacy)
-- Trending data is only accessible via the function
CREATE POLICY "No direct read access to search analytics"
  ON public.search_analytics
  FOR SELECT
  USING (false);

-- Policy 2: Only allow INSERT through a secure function (prevent data manipulation)
CREATE POLICY "No direct insert to search analytics"
  ON public.search_analytics
  FOR INSERT
  WITH CHECK (false);

-- Policy 3: No UPDATE allowed
CREATE POLICY "No update on search analytics"
  ON public.search_analytics
  FOR UPDATE
  USING (false);

-- Policy 4: No DELETE allowed (keep historical data)
CREATE POLICY "No delete on search analytics"
  ON public.search_analytics
  FOR DELETE
  USING (false);

-- Create a secure function to track searches (bypasses RLS)
CREATE OR REPLACE FUNCTION track_search(
  p_search_query TEXT,
  p_result_count INTEGER DEFAULT 0,
  p_clicked_product_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
BEGIN
  -- Validate input
  IF p_search_query IS NULL OR trim(p_search_query) = '' THEN
    RETURN;
  END IF;

  -- Insert search record
  INSERT INTO search_analytics (
    search_query,
    result_count,
    user_id,
    clicked_product_id,
    session_id
  ) VALUES (
    trim(p_search_query),
    p_result_count,
    auth.uid(), -- Get current user ID if authenticated
    p_clicked_product_id,
    current_setting('request.headers', true)::json->>'x-session-id'
  );
END;
$$;

-- Grant permissions
-- Only allow execution of functions, not direct table access
REVOKE ALL ON public.search_analytics FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_trending_searches TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_search TO authenticated, anon;
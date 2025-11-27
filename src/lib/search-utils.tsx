// src/lib/search-utils.tsx
import React from 'react';

/**
 * Highlights search terms in text
 * @param text The text to highlight in
 * @param query The search query
 * @returns JSX with highlighted terms
 */
export function highlightSearchTerms(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create a regex to match the query (case-insensitive)
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  // Split text by the regex
  const parts = text.split(regex);

  // Return JSX with highlighted parts
  return parts.map((part, index) => {
    // Check if this part matches the query (case-insensitive)
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Gets the icon for a suggestion type
 */
export function getSuggestionIcon(type: string) {
  switch (type) {
    case 'category':
      return '📁';
    case 'brand':
      return '🏷️';
    case 'popular':
      return '🔥';
    case 'product':
    default:
      return '🛍️';
  }
}

/**
 * Formats a suggestion for display
 */
export function formatSuggestion(suggestion: string, type: string): string {
  if (type === 'category') {
    return `in ${suggestion}`;
  }
  return suggestion;
}
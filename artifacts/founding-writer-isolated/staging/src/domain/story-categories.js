export const STORY_CATEGORY_CATALOG = Object.freeze([
  { slug: 'trending', name: 'Trending', type: 'feed', displayOrder: 1 },
  { slug: 'reviews', name: 'Reviews', type: 'content', displayOrder: 2 },
  { slug: 'tech', name: 'Tech', type: 'content', displayOrder: 3 },
  { slug: 'culture', name: 'Culture', type: 'content', displayOrder: 4 },
  { slug: 'essays', name: 'Essays', type: 'content', displayOrder: 5 },
  { slug: 'humour', name: 'Humour', type: 'content', displayOrder: 6 },
  { slug: 'poetry', name: 'Poetry', type: 'content', displayOrder: 7 },
  { slug: 'short-stories', name: 'Short Stories', type: 'content', displayOrder: 8 },
  { slug: 'journal', name: 'Journal', type: 'content', displayOrder: 9 },
  { slug: 'journalism', name: 'Journalism', type: 'content', displayOrder: 10 },
  { slug: 'science-health', name: 'Science & Health', type: 'content', displayOrder: 11 },
  { slug: 'business-finance', name: 'Business & Finance', type: 'content', displayOrder: 12 },
  { slug: 'sports', name: 'Sports', type: 'content', displayOrder: 13 },
  { slug: 'entertainment', name: 'Entertainment', type: 'content', displayOrder: 14 },

  // Existing published stories and editorial tools still use these categories.
  // Keep them valid to preserve backward compatibility and existing URLs.
  { slug: 'shayari', name: 'Shayari', type: 'content', displayOrder: 15 },
  { slug: 'philosophy', name: 'Philosophy', type: 'content', displayOrder: 16 },
  { slug: 'satire', name: 'Satire', type: 'content', displayOrder: 17 },
  { slug: 'fiction', name: 'Fiction', type: 'content', displayOrder: 18 },
]);

export const PUBLISHABLE_STORY_CATEGORIES = Object.freeze(
  STORY_CATEGORY_CATALOG
    .filter((category) => category.type === 'content')
    .map((category) => category.name)
);

export const TRENDING_FEED_LABEL = STORY_CATEGORY_CATALOG[0].name;


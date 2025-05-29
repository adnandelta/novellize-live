# Novel Ranking Cache System

This document outlines the dedicated Redis caching system for the homepage novel rankings.

## Overview

The novel ranking system now uses a dedicated Redis cache to improve performance and reduce loading times. The system features:

1. **Dedicated cache keys** separate from the main featured content cache
2. **Extended TTL** (24 hours) since ranking content changes less frequently
3. **Simplified storage** with direct keys for each ranking list
4. **Multiple fallback layers** to ensure content is always displayed
5. **Update script** to populate/refresh the cache manually

## Components

### Redis Module (`src/lib/redis.ts`)

New functions for the ranking cache:
- `setRankingCache()` - Stores ranking lists with a simple approach optimized for performance
- `getRankingCache()` - Retrieves ranking data from the cache 
- `invalidateRankingCache()` - Clears ranking data from the cache

### Admin Interface (`src/app/admin/featured-novels/page.tsx`)

Updated to maintain both caching systems:
- When admins save a ranking list, both the original featured content cache and the new ranking cache are updated
- The admin interface fetches novel details to ensure complete data in the cache

### Frontend Component (`src/components/NovelRanking.tsx`)

Updated with an optimized data loading strategy:
1. First try the new dedicated ranking cache
2. If that fails, try the legacy featured content cache
3. If that fails, fetch from Firestore directly
4. Guaranteed fallbacks to ensure something always displays

### Cache Update Script (`src/scripts/update-ranking-cache.ts`)

A standalone script that:
- Populates the ranking cache with admin-selected novels from Firestore
- Falls back to trending/recent novels if admin selections are unavailable
- Can be run manually or scheduled as needed

## Usage

### Running the Update Script

```bash
npm run update-ranking-cache
```

This will populate the ranking cache with the latest data from Firestore.

### Debugging

The `NovelRanking` component includes a debug mode that shows:
- The source of the displayed data (ranking cache, featured cache, Firestore, etc.)
- A "Force refresh" button to bypass caches and fetch directly from Firestore

## Benefits

- **Faster Loading**: Dedicated cache keys are faster to retrieve and don't require complex parsing
- **Reduced "Loading" States**: Multiple fallback mechanisms ensure content is always displayed
- **Better Performance**: Simpler data structure with direct retrieval reduces processing time
- **Improved Reliability**: Even if Redis fails, the component will gracefully degrade to direct Firestore queries

## Cache Key Structure

- `rankings_list_v1:newReleases` - New releases list
- `rankings_list_v1:trending` - Trending novels list
- `rankings_list_v1:popular` - Popular novels list
- `rankings_list_v1:info` - Metadata about when the cache was last updated

## Best Practices

1. Run the update script after deployment to ensure the cache is populated
2. Consider setting up a scheduled job to run the script periodically
3. Monitor Redis performance and adjust TTL values if needed 
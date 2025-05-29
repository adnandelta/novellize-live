import { kv } from '@vercel/kv';

// Fallback mechanism for environments where Redis isn't configured
const redis = typeof kv !== 'undefined' ? kv : {
  get: async () => null,
  set: async () => false,
  del: async () => false,
};

// Cache key constants
const ALL_NOVELS_PREFIX = 'novels_v2';
const FEATURED_PREFIX = 'featured_v2';
const RANKING_PREFIX = 'rankings_list_v1'; // Changed to a completely different prefix
const REDIS_ENABLED = true; // Set to false to bypass Redis entirely for debugging

// Redis size constraints
const MAX_CHUNK_SIZE = 400000; // ~400KB per chunk, well below Redis limits
const NOVELS_PER_CHUNK = 20; // Store 20 novels per chunk

// Higher TTL for rankings since they change less frequently
const RANKING_TTL = 24 * 3600; // 24 hours for ranking lists

// Helper to handle Redis connection issues
const isRedisAvailable = async () => {
  if (!REDIS_ENABLED) return false;
  
  try {
    const testKey = 'redis_test_connection';
    await redis.set(testKey, 'test', { ex: 5 });
    const result = await redis.get(testKey);
    return result === 'test';
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
};

/**
 * Split novels into smaller chunks to avoid Redis size limits
 */
const chunkNovelData = (novels: any[]): any[][] => {
  if (!novels || !novels.length) return [];
  
  // Split into chunks of NOVELS_PER_CHUNK
  const chunks: any[][] = [];
  for (let i = 0; i < novels.length; i += NOVELS_PER_CHUNK) {
    chunks.push(novels.slice(i, i + NOVELS_PER_CHUNK));
  }
  
  console.log(`Split ${novels.length} novels into ${chunks.length} chunks`);
  return chunks;
};

/**
 * Store a list of novels in Redis using sharding
 */
export async function setNovelCache(novels: any[], ttl: number = 3600): Promise<boolean> {
  if (!REDIS_ENABLED) return false;
  if (!novels || !novels.length) return false;
  
  try {
    console.log(`Attempting to cache ${novels.length} novels to Redis using sharding`);
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping cache set');
      return false;
    }
    
    // Clear any existing chunks first
    await clearNovelChunks();
    
    // Split data into chunks
    const chunks = chunkNovelData(novels);
    
    // Store chunk info to help with retrieval
    await redis.set(`${ALL_NOVELS_PREFIX}:info`, JSON.stringify({
      totalNovels: novels.length,
      chunks: chunks.length,
      updatedAt: new Date().toISOString()
    }), { ex: ttl });
    
    // Store each chunk with its index
    const promises = chunks.map(async (chunk, index) => {
      const chunkKey = `${ALL_NOVELS_PREFIX}:chunk:${index}`;
      const data = JSON.stringify(chunk);
      const size = Buffer.byteLength(data, 'utf8');
      
      if (size > MAX_CHUNK_SIZE) {
        console.warn(`Chunk ${index} size (${size} bytes) exceeds maximum, skipping`);
        return false;
      }
      
      console.log(`Storing chunk ${index} with ${chunk.length} novels (${size} bytes)`);
      return redis.set(chunkKey, data, { ex: ttl });
    });
    
    const results = await Promise.all(promises);
    const success = results.every(Boolean);
    
    if (success) {
      console.log(`Successfully cached all ${chunks.length} novel chunks to Redis`);
    } else {
      console.warn(`Some chunks failed to cache (${results.filter(Boolean).length}/${chunks.length} successful)`);
    }
    
    return success;
  } catch (error) {
    console.error('Error setting Redis novel chunks:', error);
    return false;
  }
}

/**
 * Retrieve and combine all novel chunks from Redis
 */
export async function getNovelCache(): Promise<any[] | null> {
  if (!REDIS_ENABLED) return null;
  
  try {
    console.log('Attempting to fetch novels from Redis cache (sharded)');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping cache fetch');
      return null;
    }
    
    // Get chunk info first
    const infoString = await redis.get(`${ALL_NOVELS_PREFIX}:info`);
    if (!infoString) {
      console.log('No cache info found');
      return null;
    }
    
    let info;
    try {
      info = JSON.parse(infoString as string);
    } catch (e) {
      console.error('Failed to parse cache info:', e);
      return null;
    }
    
    if (!info.chunks) {
      console.log('Invalid cache info structure');
      return null;
    }
    
    console.log(`Found ${info.chunks} chunks with ${info.totalNovels} total novels`);
    
    // Fetch all chunks in parallel
    const promises = Array.from({ length: info.chunks }, (_, index) => {
      const chunkKey = `${ALL_NOVELS_PREFIX}:chunk:${index}`;
      return redis.get(chunkKey);
    });
    
    const chunks = await Promise.all(promises);
    
    // Combine and parse all chunks
    let allNovels: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (!chunks[i]) {
        console.warn(`Missing chunk ${i}, cache may be incomplete`);
        continue;
      }
      
      try {
        const novelChunk = JSON.parse(chunks[i] as string);
        allNovels = allNovels.concat(novelChunk);
      } catch (e) {
        console.error(`Failed to parse chunk ${i}:`, e);
      }
    }
    
    if (allNovels.length === 0) {
      console.log('No novels found in cache chunks');
      return null;
    }
    
    console.log(`Successfully retrieved ${allNovels.length} novels from ${chunks.filter(Boolean).length} chunks`);
    return allNovels;
  } catch (error) {
    console.error('Error fetching novel chunks from Redis:', error);
    return null;
  }
}

/**
 * Clear all novel chunks from Redis
 */
async function clearNovelChunks(): Promise<boolean> {
  try {
    const infoString = await redis.get(`${ALL_NOVELS_PREFIX}:info`);
    if (!infoString) return true; // Nothing to clear
    
    let info;
    try {
      info = JSON.parse(infoString as string);
    } catch (e) {
      return false;
    }
    
    if (!info.chunks) return true;
    
    // Delete each chunk
    const promises = Array.from({ length: info.chunks }, (_, index) => {
      const chunkKey = `${ALL_NOVELS_PREFIX}:chunk:${index}`;
      return redis.del(chunkKey);
    });
    
    // Also delete the info key
    promises.push(redis.del(`${ALL_NOVELS_PREFIX}:info`));
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error clearing novel chunks:', error);
    return false;
  }
}

/**
 * Store featured novels by category to avoid size limits
 */
export async function setFeaturedNovelsCache(featuredData: any, ttl: number = 3600): Promise<boolean> {
  if (!REDIS_ENABLED) return false;
  if (!featuredData) return false;
  
  try {
    console.log('Attempting to cache featured novels to Redis by category');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping featured novels cache set');
      return false;
    }
    
    // Store metadata
    await redis.set(`${FEATURED_PREFIX}:info`, JSON.stringify({
      categories: Object.keys(featuredData),
      updatedAt: new Date().toISOString()
    }), { ex: ttl });
    
    // Store each category separately to avoid size issues
    const promises = Object.entries(featuredData).map(async ([category, novels]) => {
      const key = `${FEATURED_PREFIX}:${category}`;
      const data = JSON.stringify(novels);
      const size = Buffer.byteLength(data, 'utf8');
      
      if (size > MAX_CHUNK_SIZE) {
        console.warn(`Category ${category} size (${size} bytes) exceeds maximum, skipping`);
        return false;
      }
      
      console.log(`Storing category ${category} with ${Array.isArray(novels) ? novels.length : 0} novels (${size} bytes)`);
      return redis.set(key, data, { ex: ttl });
    });
    
    const results = await Promise.all(promises);
    const success = results.every(Boolean);
    
    if (success) {
      console.log('Successfully cached all featured novel categories to Redis');
    } else {
      console.warn(`Some categories failed to cache (${results.filter(Boolean).length}/${Object.keys(featuredData).length} successful)`);
    }
    
    return success;
      } catch (error) {
    console.error('Error setting featured novels Redis cache:', error);
    return false;
  }
}

/**
 * Retrieve featured novels from multiple cache keys and combine them
 */
export async function getFeaturedNovelsCache(): Promise<any | null> {
  if (!REDIS_ENABLED) return null;
  
  try {
    console.log('Attempting to fetch featured novels from Redis cache (by category)');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping featured novels cache fetch');
      return null;
    }
    
    // Get info first
    const infoString = await redis.get(`${FEATURED_PREFIX}:info`);
    if (!infoString) {
      console.log('No featured novels cache info found');
      return null;
    }
    
    let info;
    try {
      info = JSON.parse(infoString as string);
    } catch (e) {
      console.error('Failed to parse featured cache info:', e);
      return null;
    }
    
    if (!info.categories || !info.categories.length) {
      console.log('Invalid featured cache info structure');
        return null;
    }
    
    console.log(`Found ${info.categories.length} featured categories`);
    
    // Fetch all categories in parallel
    const promises = info.categories.map(async (category: string) => {
      const key = `${FEATURED_PREFIX}:${category}`;
      const data = await redis.get(key);
      return { category, data };
    });
    
    const results = await Promise.all(promises);
    
    // Combine all categories into a single object
    const featuredNovels: Record<string, any> = {};
    for (const { category, data } of results) {
      if (!data) {
        console.warn(`Missing data for category ${category}`);
        continue;
      }
      
      try {
        featuredNovels[category] = JSON.parse(data as string);
      } catch (e) {
        console.error(`Failed to parse data for category ${category}:`, e);
      }
    }
    
    if (Object.keys(featuredNovels).length === 0) {
      console.log('No valid featured novel categories found in cache');
      return null;
    }
    
    console.log(`Successfully retrieved ${Object.keys(featuredNovels).length} featured novel categories`);
    return featuredNovels;
  } catch (error) {
    console.error('Error fetching featured novels from Redis:', error);
    return null;
  }
}

/**
 * Invalidate all featured novel categories
 */
export async function invalidateFeaturedNovelsCache(): Promise<boolean> {
  if (!REDIS_ENABLED) return false;
  
  try {
    console.log('Attempting to invalidate featured novels cache');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping featured novels cache invalidation');
      return false;
    }
    
    // Get info first to find all keys to delete
    const infoString = await redis.get(`${FEATURED_PREFIX}:info`);
    if (!infoString) {
      return true; // Nothing to invalidate
    }
    
    let info;
    try {
      info = JSON.parse(infoString as string);
    } catch (e) {
      return false;
    }
    
    // Delete each category key
    const promises = (info.categories || []).map((category: string) => {
      const key = `${FEATURED_PREFIX}:${category}`;
      return redis.del(key);
    });
    
    // Also delete the info key
    promises.push(redis.del(`${FEATURED_PREFIX}:info`));
    
    await Promise.all(promises);
    console.log('Successfully invalidated all featured novel categories');
    return true;
  } catch (error) {
    console.error('Error invalidating featured novels cache:', error);
    return false;
  }
}

/**
 * Store ranking lists with a simplified approach optimized for performance
 */
export async function setRankingCache(rankingData: any): Promise<boolean> {
  if (!REDIS_ENABLED) return false;
  if (!rankingData) return false;
  
  try {
    console.log('Caching ranking lists with dedicated cache method');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping ranking cache set');
      return false;
    }
    
    // Store each ranking list separately
    const { newReleases, trending, popular } = rankingData;
    
    const promises = [];
    
    if (newReleases?.length) {
      const newData = JSON.stringify(newReleases);
      console.log(`Storing 'newReleases' ranking (${newReleases.length} novels, ${Buffer.byteLength(newData, 'utf8')} bytes)`);
      promises.push(redis.set(`${RANKING_PREFIX}:newReleases`, newData, { ex: RANKING_TTL }));
    }
    
    if (trending?.length) {
      const trendingData = JSON.stringify(trending);
      console.log(`Storing 'trending' ranking (${trending.length} novels, ${Buffer.byteLength(trendingData, 'utf8')} bytes)`);
      promises.push(redis.set(`${RANKING_PREFIX}:trending`, trendingData, { ex: RANKING_TTL }));
    }
    
    if (popular?.length) {
      const popularData = JSON.stringify(popular);
      console.log(`Storing 'popular' ranking (${popular.length} novels, ${Buffer.byteLength(popularData, 'utf8')} bytes)`);
      promises.push(redis.set(`${RANKING_PREFIX}:popular`, popularData, { ex: RANKING_TTL }));
    }
    
    // Store a timestamp to track when the cache was last updated
    promises.push(redis.set(`${RANKING_PREFIX}:info`, JSON.stringify({ 
      timestamp: Date.now(),
      lists: Object.keys(rankingData).filter(k => rankingData[k]?.length > 0),
      updatedAt: new Date().toISOString()
    }), { ex: RANKING_TTL }));
    
    const results = await Promise.all(promises);
    const success = results.every(Boolean);
    
    if (success) {
      console.log('Successfully cached all ranking lists');
    } else {
      console.warn('Some ranking lists failed to cache');
    }
    
    return success;
  } catch (error) {
    console.error('Error setting ranking cache:', error);
    return false;
  }
}

/**
 * Retrieve ranking lists using the optimized approach
 */
export async function getRankingCache(): Promise<any | null> {
  if (!REDIS_ENABLED) return null;
  
  try {
    console.log('Fetching ranking lists from dedicated cache');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping ranking cache fetch');
      return null;
    }
    
    // Check if cache is available
    const infoString = await redis.get(`${RANKING_PREFIX}:info`);
    if (!infoString) {
      console.log('No ranking cache information found');
      return null;
    }
    
    // Fetch all ranking lists in parallel
    const [newReleases, trending, popular] = await Promise.all([
      redis.get(`${RANKING_PREFIX}:newReleases`),
      redis.get(`${RANKING_PREFIX}:trending`),
      redis.get(`${RANKING_PREFIX}:popular`)
    ]);
    
    // Parse the data
    const rankings: Record<string, any> = {};
    
    if (newReleases) {
      try {
        const parsed = JSON.parse(newReleases as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rankings.newReleases = parsed;
          console.log(`Retrieved ${parsed.length} novels for newReleases from cache`);
        }
      } catch (e) {
        console.error('Failed to parse newReleases cache:', e);
      }
    }
    
    if (trending) {
      try {
        const parsed = JSON.parse(trending as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rankings.trending = parsed;
          console.log(`Retrieved ${parsed.length} novels for trending from cache`);
        }
      } catch (e) {
        console.error('Failed to parse trending cache:', e);
      }
    }
    
    if (popular) {
      try {
        const parsed = JSON.parse(popular as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rankings.popular = parsed;
          console.log(`Retrieved ${parsed.length} novels for popular from cache`);
        }
      } catch (e) {
        console.error('Failed to parse popular cache:', e);
      }
    }
    
    // Check if we got any valid data
    if (Object.keys(rankings).length === 0) {
      console.log('No valid ranking data found in cache');
      return null;
    }
    
    console.log(`Successfully retrieved ${Object.keys(rankings).length} ranking lists from cache`);
    return rankings;
  } catch (error) {
    console.error('Error fetching ranking cache:', error);
    return null;
  }
}

/**
 * Invalidate the ranking cache
 */
export async function invalidateRankingCache(): Promise<boolean> {
  if (!REDIS_ENABLED) return false;
  
  try {
    console.log('Invalidating ranking cache');
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      console.warn('Redis is not available, skipping ranking cache invalidation');
      return false;
    }
    
    // Delete all ranking keys
    const keys = [
      `${RANKING_PREFIX}:newReleases`,
      `${RANKING_PREFIX}:trending`,
      `${RANKING_PREFIX}:popular`,
      `${RANKING_PREFIX}:info`
    ];
    
    const promises = keys.map(key => redis.del(key));
    await Promise.all(promises);
    
    console.log('Successfully invalidated all ranking lists');
    return true;
  } catch (error) {
    console.error('Error invalidating ranking cache:', error);
    return false;
  }
}

export { redis };

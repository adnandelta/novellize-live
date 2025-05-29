import { db } from '../lib/firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { setRankingCache, invalidateRankingCache } from '../lib/redis';

console.log('Running ranking cache update with prefix: rankings_list_v1');

// Define novel interface
interface Novel {
  novelId: string;
  title: string;
  coverPhoto: string;
  genres: { name: string }[];
  rating: number;
  author: string;
  synopsis: string;
  views?: number;
}

/**
 * Fetches novels directly from Firestore
 */
async function fetchNovelsByField(orderByField: string, desc: boolean = true, limit_: number = 5): Promise<Novel[]> {
  console.log(`Fetching novels ordered by ${orderByField}...`);
  
  const q = query(
    collection(db, 'novels'),
    orderBy(orderByField, desc ? 'desc' : 'asc'),
    limit(limit_)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ 
    novelId: doc.id, 
    ...doc.data(),
    author: doc.data().publishers?.original || 'Unknown',
    genres: doc.data().genres || []
  } as Novel));
}

/**
 * Fetches admin-selected featured novels
 */
async function fetchFeaturedNovels(): Promise<{ 
  newReleases: Novel[], 
  trending: Novel[], 
  popular: Novel[] 
}> {
  console.log('Fetching admin-selected featured novels...');
  
  // Default empty arrays
  const result = {
    newReleases: [] as Novel[],
    trending: [] as Novel[],
    popular: [] as Novel[]
  };
  
  try {
    // Get the IDs for each list from the featuredContent document
    const featuredDoc = await getDoc(doc(db, 'featuredContent', 'ranking'));
    
    if (!featuredDoc.exists()) {
      console.log('No featured content document found, using direct queries');
      return result;
    }
    
    const data = featuredDoc.data();
    console.log('Featured content data:', data);
    
    // Helper function to fetch novels by ids
    const fetchNovelsByIds = async (ids: string[]): Promise<Novel[]> => {
      if (!ids || ids.length === 0) return [];
      
      const novels: Novel[] = [];
      
      for (const id of ids) {
        try {
          const novelDoc = await getDoc(doc(db, 'novels', id));
          if (novelDoc.exists()) {
            novels.push({
              novelId: novelDoc.id,
              ...novelDoc.data(),
              author: novelDoc.data().publishers?.original || 'Unknown',
              genres: novelDoc.data().genres || []
            } as Novel);
          }
        } catch (error) {
          console.error(`Error fetching novel ${id}:`, error);
        }
      }
      
      return novels;
    };
    
    // Fetch each list in parallel
    const [newReleases, trending, popular] = await Promise.all([
      data.newReleases ? fetchNovelsByIds(data.newReleases) : [],
      data.trending ? fetchNovelsByIds(data.trending) : [],
      data.popular ? fetchNovelsByIds(data.popular) : []
    ]);
    
    console.log(`Found ${newReleases.length} new releases, ${trending.length} trending, ${popular.length} popular novels`);
    
    result.newReleases = newReleases;
    result.trending = trending;
    result.popular = popular;
    
    return result;
  } catch (error) {
    console.error('Error fetching featured novels:', error);
    return result;
  }
}

/**
 * Main function to update the ranking cache
 */
async function updateRankingCache() {
  console.log('Starting ranking cache update...');
  
  try {
    // First, try to get admin-selected featured novels
    const featuredNovels = await fetchFeaturedNovels();
    
    // If any list is empty, fetch direct from Firestore as fallback
    if (featuredNovels.newReleases.length === 0) {
      console.log('No admin-selected new releases, fetching directly...');
      featuredNovels.newReleases = await fetchNovelsByField('metadata.createdAt', true, 5);
    }
    
    if (featuredNovels.trending.length === 0) {
      console.log('No admin-selected trending novels, fetching directly...');
      featuredNovels.trending = await fetchNovelsByField('views', true, 5);
    }
    
    if (featuredNovels.popular.length === 0) {
      console.log('No admin-selected popular novels, fetching directly...');
      featuredNovels.popular = await fetchNovelsByField('rating', true, 5);
    }
    
    // Invalidate existing cache first
    await invalidateRankingCache();
    
    // Update the cache with the combined data
    const result = await setRankingCache(featuredNovels);
    
    if (result) {
      console.log('Successfully updated ranking cache!');
    } else {
      console.error('Failed to update ranking cache');
    }
  } catch (error) {
    console.error('Error updating ranking cache:', error);
  }
}

// Run the function
updateRankingCache()
  .then(() => {
    console.log('Ranking cache update process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in ranking cache update:', error);
    process.exit(1);
  }); 
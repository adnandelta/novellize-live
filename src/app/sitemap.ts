import { MetadataRoute } from 'next'
import { db } from '@/lib/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'

const BASE_URL = 'https://novellize.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/forum`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ] as MetadataRoute.Sitemap

  try {
    // Fetch all novels from Firestore
    const novelsRef = collection(db, 'novels')
    const novelsSnapshot = await getDocs(novelsRef)
    
    // Generate dynamic routes for each novel
    const novelRoutes = novelsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        url: `${BASE_URL}/novel/${doc.id}`,
        lastModified: data.metadata?.updatedAt?.toDate() || new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      }
    }) as MetadataRoute.Sitemap

    // Generate dynamic routes for each author
    const uniqueAuthors = new Set(novelsSnapshot.docs.map(doc => doc.data().uploader).filter(Boolean))
    const authorRoutes = Array.from(uniqueAuthors).map(authorId => ({
      url: `${BASE_URL}/author/${authorId}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    })) as MetadataRoute.Sitemap

    // Combine all routes
    return [...staticRoutes, ...novelRoutes, ...authorRoutes]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticRoutes
  }
} 
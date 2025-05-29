'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, query, getDocs, doc, getDoc, setDoc, where, orderBy, limit, startAfter } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Search, Loader2, Plus, X, Save, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  getNovelCache, 
  setNovelCache, 
  getFeaturedNovelsCache, 
  setFeaturedNovelsCache, 
  invalidateFeaturedNovelsCache,
  setRankingCache,
  invalidateRankingCache
} from '@/lib/redis'

interface Novel {
  novelId: string
  title: string
  coverPhoto: string
  genres: { name: string }[]
  rating: number
  synopsis: string
  author: string
}

export default function FeaturedNovelsManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [availableNovels, setAvailableNovels] = useState<Novel[]>([])
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState('new')
  const { user } = useAuth()
  const router = useRouter()
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isRefreshingCache, setIsRefreshingCache] = useState(false)
  const [allNovelsLoaded, setAllNovelsLoaded] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const totalPages = Math.ceil(filteredNovels.length / itemsPerPage)

  // Selected novels for each category
  const [newReleases, setNewReleases] = useState<Novel[]>([])
  const [trending, setTrending] = useState<Novel[]>([])
  const [popular, setPopular] = useState<Novel[]>([])
  
  // Loading states for saving
  const [savingNew, setSavingNew] = useState(false)
  const [savingTrending, setSavingTrending] = useState(false)
  const [savingPopular, setSavingPopular] = useState(false)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        router.push('/')
        return
      }

      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid), where('userType', '==', 'admin')))
      
      if (userSnap.empty) {
        router.push('/')
        return
      }
    }

    checkAdminAccess()
    fetchInitialNovels()
    fetchFeaturedNovels()
  }, [user, router])

  // Filter novels whenever search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredNovels(availableNovels)
    } else {
      const filtered = availableNovels.filter(novel => 
        novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (novel.author && novel.author.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredNovels(filtered)
    }
    setCurrentPage(1) // Reset to first page whenever filter changes
  }, [searchTerm, availableNovels])

  const fetchInitialNovels = async () => {
    try {
      setLoading(true)
      
      // Try to get novels from Redis cache first
      const cachedNovels = await getNovelCache()
      
      if (cachedNovels && Array.isArray(cachedNovels) && cachedNovels.length > 0) {
        console.log('Using cached novels data:', cachedNovels.length, 'novels found')
        setAvailableNovels(cachedNovels)
        setFilteredNovels(cachedNovels)
        setAllNovelsLoaded(true)
        setLoading(false)
        return
      }
      
      // If cache miss, fetch from Firestore
      const novels = await fetchNovelsFromFirestore(200)
      
      if (novels.length < 200) {
        setAllNovelsLoaded(true)
      }
      
      // Cache the results
      await setNovelCache(novels)
      
      setAvailableNovels(novels)
      setFilteredNovels(novels)
    } catch (error) {
      console.error('Error fetching novels:', error)
      toast.error('Failed to fetch novels')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchMoreNovels = async () => {
    if (isFetchingMore || allNovelsLoaded) return
    
    try {
      setIsFetchingMore(true)
      
      // Get the last document as the starting point
      const lastNovel = availableNovels[availableNovels.length - 1]
      if (!lastNovel) return
      
      // Fetch the next batch
      const q = query(
        collection(db, 'novels'),
        orderBy('title'),
        startAfter(lastNovel.title),
        limit(100)
      )
      
      const querySnapshot = await getDocs(q)
      const newNovels = querySnapshot.docs.map(doc => ({ 
        novelId: doc.id, 
        ...doc.data(),
        author: doc.data().publishers?.original || 'Unknown'
      } as Novel))
      
      // If we got fewer novels than the limit, we've reached the end
      if (newNovels.length < 100) {
        setAllNovelsLoaded(true)
      }
      
      if (newNovels.length > 0) {
        const updatedNovels = [...availableNovels, ...newNovels]
        setAvailableNovels(updatedNovels)
        
        // Update the cache with all novels
        await setNovelCache(updatedNovels)
        
        // Apply current filter if any
        if (searchTerm.trim()) {
          const filtered = updatedNovels.filter(novel => 
            novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (novel.author && novel.author.toLowerCase().includes(searchTerm.toLowerCase()))
          )
          setFilteredNovels(filtered)
        } else {
          setFilteredNovels(updatedNovels)
        }
      }
    } catch (error) {
      console.error('Error fetching more novels:', error)
      toast.error('Failed to fetch more novels')
    } finally {
      setIsFetchingMore(false)
    }
  }
  
  const refreshNovelCache = async () => {
    try {
      setIsRefreshingCache(true)
      toast.info('Refreshing novel data cache...')
      
      // Clear existing novels and fetch fresh ones
      setAvailableNovels([])
      setFilteredNovels([])
      setAllNovelsLoaded(false)
      
      const novels = await fetchNovelsFromFirestore(300)
      
      if (novels.length < 300) {
        setAllNovelsLoaded(true)
      }
      
      // Update the cache
      await setNovelCache(novels)
      
      setAvailableNovels(novels)
      setFilteredNovels(novels)
      
      toast.success('Novel cache refreshed successfully')
    } catch (error) {
      console.error('Error refreshing cache:', error)
      toast.error('Failed to refresh novel cache')
    } finally {
      setIsRefreshingCache(false)
    }
  }
  
  const fetchNovelsFromFirestore = async (batchSize: number) => {
    const q = query(
      collection(db, 'novels'),
      orderBy('title'),
      limit(batchSize)
    )
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ 
      novelId: doc.id, 
      ...doc.data(),
      author: doc.data().publishers?.original || 'Unknown'
    } as Novel))
  }

  const fetchFeaturedNovels = async () => {
    try {
      // Try to get featured novels from Redis cache first
      const cachedFeatured = await getFeaturedNovelsCache()
      
      if (cachedFeatured && 
          cachedFeatured.newReleases && 
          cachedFeatured.trending && 
          cachedFeatured.popular) {
        console.log('Using cached featured novels data')
        
        setNewReleases(cachedFeatured.newReleases || [])
        setTrending(cachedFeatured.trending || [])
        setPopular(cachedFeatured.popular || [])
        return
      }
      
      // If cache miss, fetch from Firestore
      const featuredDoc = await getDoc(doc(db, 'featuredContent', 'ranking'))
      
      if (featuredDoc.exists()) {
        const data = featuredDoc.data()
        
        // Fetch full novel details for each category
        const fetchNovelDetails = async (ids: string[]): Promise<Novel[]> => {
          if (!ids || ids.length === 0) return []
          
          const novels: Novel[] = []
          for (const id of ids) {
            const novelDoc = await getDoc(doc(db, 'novels', id))
            if (novelDoc.exists()) {
              novels.push({
                novelId: novelDoc.id,
                ...novelDoc.data(),
                author: novelDoc.data().publishers?.original || 'Unknown'
              } as Novel)
            }
          }
          return novels
        }
        
        // Populate the lists with novel details
        const [newList, trendingList, popularList] = await Promise.all([
          fetchNovelDetails(data.newReleases || []),
          fetchNovelDetails(data.trending || []),
          fetchNovelDetails(data.popular || [])
        ])
        
        setNewReleases(newList)
        setTrending(trendingList)
        setPopular(popularList)
        
        // Cache the featured data
        await setFeaturedNovelsCache({
          newReleases: newList,
          trending: trendingList,
          popular: popularList
        })
      }
    } catch (error) {
      console.error('Error fetching featured novels:', error)
      toast.error('Failed to fetch featured novels')
    }
  }

  const addNovel = (novel: Novel) => {
    switch (currentTab) {
      case 'new':
        if (!newReleases.some(n => n.novelId === novel.novelId)) {
          setNewReleases([...newReleases, novel])
        }
        break
      case 'trending':
        if (!trending.some(n => n.novelId === novel.novelId)) {
          setTrending([...trending, novel])
        }
        break
      case 'popular':
        if (!popular.some(n => n.novelId === novel.novelId)) {
          setPopular([...popular, novel])
        }
        break
    }
  }

  const removeNovel = (novelId: string) => {
    switch (currentTab) {
      case 'new':
        setNewReleases(newReleases.filter(n => n.novelId !== novelId))
        break
      case 'trending':
        setTrending(trending.filter(n => n.novelId !== novelId))
        break
      case 'popular':
        setPopular(popular.filter(n => n.novelId !== novelId))
        break
    }
  }

  const saveList = async (type: 'new' | 'trending' | 'popular') => {
    let setSaving: (value: boolean) => void
    let ids: string[]
    let updatedFeatured: any = {}
    
    switch (type) {
      case 'new':
        setSaving = setSavingNew
        ids = newReleases.map(n => n.novelId)
        updatedFeatured = { newReleases }
        break
      case 'trending':
        setSaving = setSavingTrending
        ids = trending.map(n => n.novelId)
        updatedFeatured = { trending }
        break
      case 'popular':
        setSaving = setSavingPopular
        ids = popular.map(n => n.novelId)
        updatedFeatured = { popular }
        break
    }
    
    try {
      setSaving(true)
      
      // Get the current document or create it if it doesn't exist
      const featuredRef = doc(db, 'featuredContent', 'ranking')
      const featuredDoc = await getDoc(featuredRef)
      
      const data = featuredDoc.exists() ? featuredDoc.data() : {}
      
      // Update only the specific list while preserving others
      await setDoc(featuredRef, {
        ...data,
        [type === 'new' ? 'newReleases' : type]: ids,
        updatedAt: new Date()
      }, { merge: true })
      
      // Update both Redis caches
      
      // 1. First, update the dedicated ranking cache (primary)
      const allRankings = {
        newReleases: type === 'new' ? newReleases : (data.newReleases ? await fetchNovelDetails(data.newReleases) : []),
        trending: type === 'trending' ? trending : (data.trending ? await fetchNovelDetails(data.trending) : []),
        popular: type === 'popular' ? popular : (data.popular ? await fetchNovelDetails(data.popular) : [])
      };
      
      await setRankingCache(allRankings);
      
      // 2. As a backup, also update the legacy cache
      await invalidateFeaturedNovelsCache() // Invalidate first to ensure fresh data
      
      // Get current cached data and update just the part that changed
      const cachedData = await getFeaturedNovelsCache() || {}
      await setFeaturedNovelsCache({
        ...cachedData,
        ...updatedFeatured
      })
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ranking list saved`)
    } catch (error) {
      console.error(`Error saving ${type} list:`, error)
      toast.error(`Failed to save ${type} list`)
    } finally {
      setSaving(false)
    }
  }

  // Helper to fetch novel details by IDs (needed for ranking cache update)
  const fetchNovelDetails = async (ids: string[]): Promise<Novel[]> => {
    if (!ids || ids.length === 0) return [];
    
    const novels: Novel[] = [];
    
    // First try to find in the available novels list
    for (const id of ids) {
      const found = availableNovels.find(n => n.novelId === id);
      if (found) novels.push(found);
    }
    
    // If we found all novels, return early
    if (novels.length === ids.length) return novels;
    
    // Otherwise, fetch the missing ones from Firestore
    const missingIds = ids.filter(id => !novels.some(n => n.novelId === id));
    
    try {
      for (const id of missingIds) {
        const novelDoc = await getDoc(doc(db, 'novels', id));
        if (novelDoc.exists()) {
          novels.push({
            novelId: novelDoc.id,
            ...novelDoc.data(),
            author: novelDoc.data().publishers?.original || 'Unknown'
          } as Novel);
        }
      }
    } catch (error) {
      console.error('Error fetching novel details:', error);
    }
    
    return novels;
  }

  // Check if a novel is already in the current list
  const isNovelInCurrentList = (novelId: string) => {
    switch (currentTab) {
      case 'new':
        return newReleases.some(n => n.novelId === novelId)
      case 'trending':
        return trending.some(n => n.novelId === novelId)
      case 'popular':
        return popular.some(n => n.novelId === novelId)
      default:
        return false
    }
  }

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredNovels.slice(startIndex, endIndex)
  }

  // Pagination controls
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster />
      <Card className="mb-8 shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-3xl font-bold">Featured Novels Management</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshNovelCache}
                disabled={isRefreshingCache}
              >
                {isRefreshingCache ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Cache
              </Button>
              <Link href="/admin">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="new" onValueChange={(value) => setCurrentTab(value)}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="new">New Releases</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
            </TabsList>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column: Available novels to select from */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Available Novels ({filteredNovels.length})</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Filter novels..."
                      className="pl-9 py-2"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <>
                    <div className="border rounded-md overflow-hidden h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-16">Cover</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead className="w-24">Rating</TableHead>
                            <TableHead className="w-24 text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCurrentPageData().length > 0 ? (
                            getCurrentPageData().map((novel) => {
                              const isInList = isNovelInCurrentList(novel.novelId);
                              return (
                                <TableRow key={novel.novelId} className={isInList ? 'bg-primary/10' : ''}>
                                  <TableCell>
                                    <div className="w-10 h-14 relative">
                                      <Image
                                        src={novel.coverPhoto || '/assets/cover.jpg'}
                                        alt={novel.title}
                                        fill
                                        className="object-cover rounded"
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm truncate">{novel.title}</p>
                                        <p className="text-xs text-gray-500">{novel.author}</p>
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant={isInList ? "secondary" : "outline"}
                                        onClick={() => addNovel(novel)}
                                        disabled={isInList}
                                        className="h-8 w-10 p-0 ml-2"
                                      >
                                        {isInList ? 
                                          <span className="text-xs">Added</span> : 
                                          <Plus className="h-4 w-4" />
                                        }
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell>{novel.rating?.toFixed(1) || '0.0'}</TableCell>
                                  <TableCell className="text-center">
                                    <Button 
                                      size="sm" 
                                      variant={isInList ? "secondary" : "default"} 
                                      onClick={() => addNovel(novel)}
                                      disabled={isInList}
                                    >
                                      {isInList ? 'Added' : 'Add'}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                                {searchTerm ? 'No novels match your search.' : 'No novels available.'}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Load More Button */}
                    {!allNovelsLoaded && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={fetchMoreNovels}
                          disabled={isFetchingMore}
                          className="w-full"
                        >
                          {isFetchingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading more novels...
                            </>
                          ) : (
                            'Load More Novels'
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages || 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous</span>
                        </Button>
                        {totalPages > 0 && (
                          <div className="flex items-center">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum = i + 1;
                              
                              // Adjust for larger pagination sets
                              if (totalPages > 5) {
                                if (currentPage > 3) {
                                  pageNum = (currentPage - 3) + i;
                                }
                                
                                // Don't go beyond total pages
                                if (pageNum > totalPages) {
                                  return null;
                                }
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="h-8 w-8 p-0 mx-0.5"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                            
                            {/* Show ellipsis if needed */}
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                              <span className="mx-1">...</span>
                            )}
                            
                            {/* Always show last page if we have many pages */}
                            {totalPages > 5 && currentPage < totalPages - 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="h-8 w-8 p-0 mx-0.5"
                              >
                                {totalPages}
                              </Button>
                            )}
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages || totalPages === 0}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next</span>
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Right column: Selected novels */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    {currentTab === 'new' && `New Releases List (${newReleases.length})`}
                    {currentTab === 'trending' && `Trending List (${trending.length})`}
                    {currentTab === 'popular' && `Popular List (${popular.length})`}
                  </h3>
                  <Button
                    onClick={() => saveList(currentTab as 'new' | 'trending' | 'popular')}
                    disabled={
                      (currentTab === 'new' && savingNew) ||
                      (currentTab === 'trending' && savingTrending) ||
                      (currentTab === 'popular' && savingPopular)
                    }
                  >
                    {(currentTab === 'new' && savingNew) ||
                     (currentTab === 'trending' && savingTrending) ||
                     (currentTab === 'popular' && savingPopular) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save List
                  </Button>
                </div>
                
                <div className="border rounded-md overflow-hidden h-[550px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead className="w-16">Cover</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-16">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Render the appropriate list based on current tab */}
                      {(() => {
                        let currentList: Novel[] = [];
                        if (currentTab === 'new') currentList = newReleases;
                        else if (currentTab === 'trending') currentList = trending;
                        else if (currentTab === 'popular') currentList = popular;
                        
                        if (currentList.length > 0) {
                          return currentList.map((novel, index) => (
                            <TableRow key={novel.novelId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <div className="w-10 h-14 relative">
                                  <Image
                                    src={novel.coverPhoto || '/assets/cover.jpg'}
                                    alt={novel.title}
                                    fill
                                    className="object-cover rounded"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div>
                                  <p className="text-sm truncate">{novel.title}</p>
                                  <p className="text-xs text-gray-500">{novel.author}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => removeNovel(novel.novelId)}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ));
                        } else {
                          return (
                            <TableRow>
                              <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                                No novels selected for this list. Add novels from the available list.
                              </TableCell>
                            </TableRow>
                          );
                        }
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 
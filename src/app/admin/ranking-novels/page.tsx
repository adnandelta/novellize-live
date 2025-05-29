'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, query, getDocs, doc, getDoc, setDoc, where, orderBy, limit, startAfter } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Search, Loader2, Plus, X, Save, ChevronLeft, ChevronRight, RefreshCw, TrendingUp, Star, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Novel {
  novelId: string
  title: string
  coverPhoto: string
  genres: { name: string }[]
  rating: number
  synopsis: string
  author: string
}

export default function RankingNovelsManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [availableNovels, setAvailableNovels] = useState<Novel[]>([])
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState('newReleases')
  const { user } = useAuth()
  const router = useRouter()
  const [isFetchingMore, setIsFetchingMore] = useState(false)
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
  const [savingNewReleases, setSavingNewReleases] = useState(false)
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
    fetchRankingNovels()
  }, [user, router])

  const fetchInitialNovels = async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'novels'),
        orderBy('metadata.createdAt', 'desc'),
        limit(25)
      )
      
      const querySnapshot = await getDocs(q)
      const novels = querySnapshot.docs.map(doc => ({
        novelId: doc.id,
        ...doc.data(),
        author: doc.data().publishers?.original || 'Unknown',
        genres: doc.data().genres || []
      } as Novel))
      
      setAvailableNovels(novels)
      setFilteredNovels(novels)
      
      if (novels.length < 25) {
        setAllNovelsLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching novels:', error)
      toast.error('Failed to load novels')
    } finally {
      setLoading(false)
    }
  }

  const fetchRankingNovels = async () => {
    try {
      const rankingDoc = await getDoc(doc(db, 'featuredContent', 'ranking'))
      
      if (rankingDoc.exists()) {
        const data = rankingDoc.data()
        
        // Fetch full novel details for each category
        const fetchNovelsByIds = async (ids: string[]) => {
          const novels: Novel[] = []
          for (const id of ids || []) {
            try {
              const novelDoc = await getDoc(doc(db, 'novels', id))
              if (novelDoc.exists()) {
                novels.push({
                  novelId: novelDoc.id,
                  ...novelDoc.data(),
                  author: novelDoc.data().publishers?.original || 'Unknown',
                  genres: novelDoc.data().genres || []
                } as Novel)
              }
            } catch (error) {
              console.error(`Error fetching novel ${id}:`, error)
            }
          }
          return novels
        }
        
        setNewReleases(await fetchNovelsByIds(data.newReleases))
        setTrending(await fetchNovelsByIds(data.trending))
        setPopular(await fetchNovelsByIds(data.popular))
      }
    } catch (error) {
      console.error('Error fetching ranking novels:', error)
    }
  }

  const loadMoreNovels = async () => {
    if (isFetchingMore || allNovelsLoaded) return
    
    try {
      setIsFetchingMore(true)
      
      const lastNovel = availableNovels[availableNovels.length - 1]
      const lastDoc = await getDoc(doc(db, 'novels', lastNovel.novelId))
      
      const q = query(
        collection(db, 'novels'),
        orderBy('metadata.createdAt', 'desc'),
        startAfter(lastDoc),
        limit(25)
      )
      
      const querySnapshot = await getDocs(q)
      const newNovels = querySnapshot.docs.map(doc => ({
        novelId: doc.id,
        ...doc.data(),
        author: doc.data().publishers?.original || 'Unknown',
        genres: doc.data().genres || []
      } as Novel))
      
      if (newNovels.length === 0) {
        setAllNovelsLoaded(true)
        return
      }
      
      setAvailableNovels(prev => [...prev, ...newNovels])
      
      if (!searchTerm) {
        setFilteredNovels(prev => [...prev, ...newNovels])
      }
      
      if (newNovels.length < 25) {
        setAllNovelsLoaded(true)
      }
    } catch (error) {
      console.error('Error loading more novels:', error)
      toast.error('Failed to load more novels')
    } finally {
      setIsFetchingMore(false)
    }
  }

  const loadAllNovels = async () => {
    if (allNovelsLoaded) return
    
    try {
      setIsFetchingMore(true)
      
      const allNovels: Novel[] = []
      let lastDoc = availableNovels.length > 0 ? await getDoc(doc(db, 'novels', availableNovels[availableNovels.length - 1].novelId)) : null
      
      while (true) {
        const q = lastDoc 
          ? query(
              collection(db, 'novels'),
              orderBy('metadata.createdAt', 'desc'),
              startAfter(lastDoc),
              limit(100)
            )
          : query(
              collection(db, 'novels'),
              orderBy('metadata.createdAt', 'desc'),
              limit(100)
            )
        
        const querySnapshot = await getDocs(q)
        if (querySnapshot.empty) break
        
        const batchNovels = querySnapshot.docs.map(doc => ({
          novelId: doc.id,
          ...doc.data(),
          author: doc.data().publishers?.original || 'Unknown',
          genres: doc.data().genres || []
        } as Novel))
        
        allNovels.push(...batchNovels)
        lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
        
        if (batchNovels.length < 100) break
      }
      
      const combinedNovels = [...availableNovels, ...allNovels]
      setAvailableNovels(combinedNovels)
      
      if (!searchTerm) {
        setFilteredNovels(combinedNovels)
      }
      
      setAllNovelsLoaded(true)
      toast.success(`Loaded ${allNovels.length} additional novels`)
    } catch (error) {
      console.error('Error loading all novels:', error)
      toast.error('Failed to load all novels')
    } finally {
      setIsFetchingMore(false)
    }
  }

  // Handle search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredNovels(availableNovels)
      setCurrentPage(1)
      return
    }

    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = availableNovels.filter(novel => {
      const titleMatch = novel.title.toLowerCase().includes(searchLower)
      const authorMatch = novel.author.toLowerCase().includes(searchLower)
      const genreMatch = novel.genres?.some(genre => 
        genre.name.toLowerCase().includes(searchLower)
      )
      const synopsisMatch = novel.synopsis?.toLowerCase().includes(searchLower)
      
      return titleMatch || authorMatch || genreMatch || synopsisMatch
    })
    
    setFilteredNovels(filtered)
    setCurrentPage(1)
  }, [searchTerm, availableNovels])

  const getCurrentNovels = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredNovels.slice(startIndex, endIndex)
  }

  const addToCategory = (novel: Novel, category: 'newReleases' | 'trending' | 'popular') => {
    if (category === 'newReleases') {
      if (newReleases.length >= 5) {
        toast.error('You can only have 5 novels in New Releases')
        return
      }
      if (!newReleases.find(n => n.novelId === novel.novelId)) {
        setNewReleases([...newReleases, novel])
        toast.success(`Added "${novel.title}" to New Releases`)
      }
    } else if (category === 'trending') {
      if (trending.length >= 5) {
        toast.error('You can only have 5 novels in Trending')
        return
      }
      if (!trending.find(n => n.novelId === novel.novelId)) {
        setTrending([...trending, novel])
        toast.success(`Added "${novel.title}" to Trending`)
      }
    } else if (category === 'popular') {
      if (popular.length >= 5) {
        toast.error('You can only have 5 novels in Popular')
        return
      }
      if (!popular.find(n => n.novelId === novel.novelId)) {
        setPopular([...popular, novel])
        toast.success(`Added "${novel.title}" to Popular`)
      }
    }
  }

  const removeFromCategory = (novelId: string, category: 'newReleases' | 'trending' | 'popular') => {
    if (category === 'newReleases') {
      setNewReleases(newReleases.filter(n => n.novelId !== novelId))
    } else if (category === 'trending') {
      setTrending(trending.filter(n => n.novelId !== novelId))
    } else if (category === 'popular') {
      setPopular(popular.filter(n => n.novelId !== novelId))
    }
    toast.success('Novel removed')
  }

  const saveCategory = async (category: 'newReleases' | 'trending' | 'popular') => {
    const setLoading = category === 'newReleases' ? setSavingNewReleases : 
                      category === 'trending' ? setSavingTrending : setSavingPopular
    
    try {
      setLoading(true)
      
      const novels = category === 'newReleases' ? newReleases : 
                     category === 'trending' ? trending : popular
      
      const rankingDoc = await getDoc(doc(db, 'featuredContent', 'ranking'))
      const currentData = rankingDoc.exists() ? rankingDoc.data() : {}
      
      await setDoc(doc(db, 'featuredContent', 'ranking'), {
        ...currentData,
        [category]: novels.map(novel => novel.novelId),
        [`${category}UpdatedAt`]: new Date(),
        [`${category}UpdatedBy`]: user?.uid
      })
      
      toast.success(`${category === 'newReleases' ? 'New Releases' : 
                     category === 'trending' ? 'Trending' : 'Popular'} saved successfully!`)
    } catch (error) {
      console.error(`Error saving ${category}:`, error)
      toast.error(`Failed to save ${category}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A]">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#232120] to-[#2A2827] border-b border-[#333] sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-[#333] transition-all duration-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#F1592A] to-[#FF8C94] bg-clip-text text-transparent">
                Ranking Novels Management
              </h1>
              <p className="text-gray-400 text-sm">Manage novels for New Releases, Trending, and Popular sections</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Selected Novels Panel */}
          <div className="xl:col-span-1">
            <div className="bg-gradient-to-br from-[#2A2827] to-[#333] rounded-2xl border border-[#444] shadow-xl overflow-hidden">
              <div className="p-6 border-b border-[#444]">
                <h2 className="text-xl font-bold text-white mb-2">Selected Novels</h2>
                <p className="text-gray-400 text-sm">5 novels maximum per category</p>
              </div>
              
              <div className="p-6">
                <div className="flex mb-4 bg-[#1A1A1A] rounded-lg p-1">
                  <button
                    onClick={() => setCurrentTab('newReleases')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      currentTab === 'newReleases' 
                        ? 'bg-[#F1592A] text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    New ({newReleases.length}/5)
                  </button>
                  <button
                    onClick={() => setCurrentTab('trending')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      currentTab === 'trending' 
                        ? 'bg-[#F1592A] text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Trending ({trending.length}/5)
                  </button>
                  <button
                    onClick={() => setCurrentTab('popular')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      currentTab === 'popular' 
                        ? 'bg-[#F1592A] text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-4 h-4 inline mr-2" />
                    Popular ({popular.length}/5)
                  </button>
                </div>

                {/* Selected Novels List */}
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {(currentTab === 'newReleases' ? newReleases : 
                    currentTab === 'trending' ? trending : popular).map((novel, index) => (
                    <div key={novel.novelId} className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#333]">
                      <span className="text-[#F1592A] font-bold text-sm w-6">{index + 1}</span>
                      <Image
                        src={novel.coverPhoto || '/assets/cover.jpg'}
                        alt={novel.title}
                        width={40}
                        height={60}
                        className="object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate">{novel.title}</h4>
                        <p className="text-gray-400 text-xs">{novel.author}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCategory(novel.novelId, currentTab as any)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <Button
                  onClick={() => saveCategory(currentTab as any)}
                  disabled={savingNewReleases || savingTrending || savingPopular}
                  className="w-full bg-gradient-to-r from-[#F1592A] to-[#FF8C94] hover:from-[#E44D1F] hover:to-[#FF6B6B] text-white"
                >
                  {(currentTab === 'newReleases' && savingNewReleases) ||
                   (currentTab === 'trending' && savingTrending) ||
                   (currentTab === 'popular' && savingPopular) ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save {currentTab === 'newReleases' ? 'New Releases' : 
                        currentTab === 'trending' ? 'Trending' : 'Popular'}
                </Button>
              </div>
            </div>
          </div>

          {/* Available Novels Panel */}
          <div className="xl:col-span-2">
            <div className="bg-gradient-to-br from-[#2A2827] to-[#333] rounded-2xl border border-[#444] shadow-xl overflow-hidden">
              <div className="p-6 border-b border-[#444]">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by novel title, author, or genre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white placeholder-gray-400 focus:border-[#F1592A] transition-all duration-300"
                    />
                  </div>
                  <Button
                    onClick={loadMoreNovels}
                    disabled={isFetchingMore || allNovelsLoaded}
                    variant="outline"
                    className="border-[#444] text-gray-300 hover:bg-[#333] hover:text-white transition-all duration-300"
                  >
                    {isFetchingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {allNovelsLoaded ? 'All Loaded' : 'Load More'}
                  </Button>
                  <Button
                    onClick={loadAllNovels}
                    disabled={isFetchingMore || allNovelsLoaded}
                    variant="outline"
                    className="border-[#F1592A] text-[#F1592A] hover:bg-[#F1592A] hover:text-white transition-all duration-300"
                  >
                    {isFetchingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Load All
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#444] hover:bg-[#333]">
                      <TableHead className="text-gray-300">Novel</TableHead>
                      <TableHead className="text-gray-300">Author</TableHead>
                      <TableHead className="text-gray-300">Genre</TableHead>
                      <TableHead className="text-gray-300">Rating</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-[#444]">
                          <TableCell colSpan={5}>
                            <div className="animate-pulse flex items-center gap-3">
                              <div className="w-12 h-16 bg-gray-700 rounded"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-700 rounded w-48"></div>
                                <div className="h-3 bg-gray-700 rounded w-32"></div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : getCurrentNovels().map((novel) => (
                      <TableRow key={novel.novelId} className="border-[#444] hover:bg-[#333] transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Image
                              src={novel.coverPhoto || '/assets/cover.jpg'}
                              alt={novel.title}
                              width={40}
                              height={60}
                              className="object-cover rounded"
                            />
                            <div>
                              <div className="font-medium text-white">{novel.title}</div>
                              <div className="text-sm text-gray-400 truncate max-w-48">
                                {novel.synopsis}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">{novel.author}</TableCell>
                        <TableCell className="text-gray-300">
                          {novel.genres[0]?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          ⭐ {novel.rating?.toFixed(1) || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => addToCategory(novel, 'newReleases')}
                              disabled={newReleases.length >= 5 || newReleases.some(n => n.novelId === novel.novelId)}
                              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              New
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => addToCategory(novel, 'trending')}
                              disabled={trending.length >= 5 || trending.some(n => n.novelId === novel.novelId)}
                              className="bg-pink-600 hover:bg-pink-700 text-white text-xs"
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Trend
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => addToCategory(novel, 'popular')}
                              disabled={popular.length >= 5 || popular.some(n => n.novelId === novel.novelId)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Pop
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-[#444] flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredNovels.length)} of {filteredNovels.length} novels
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-[#444] text-gray-300 hover:bg-[#333]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-gray-300 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-[#444] text-gray-300 hover:bg-[#333]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
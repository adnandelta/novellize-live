'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, query, getDocs, doc, getDoc, setDoc, where, orderBy, limit, startAfter } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Search, Loader2, Plus, X, Save, ChevronLeft, ChevronRight, RefreshCw, BookOpen, Star } from 'lucide-react'
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

export default function WeeklyFeaturedManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [availableNovels, setAvailableNovels] = useState<Novel[]>([])
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [allNovelsLoaded, setAllNovelsLoaded] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const totalPages = Math.ceil(filteredNovels.length / itemsPerPage)

  // Selected novels for weekly featured
  const [weeklyFeaturedNovels, setWeeklyFeaturedNovels] = useState<Novel[]>([])
  
  // Loading state for saving
  const [savingWeeklyFeatured, setSavingWeeklyFeatured] = useState(false)

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
    fetchWeeklyFeaturedContent()
  }, [user, router])

  const fetchInitialNovels = async () => {
    try {
      setLoading(true)
      
      const q = query(
        collection(db, 'novels'),
        orderBy('metadata.createdAt', 'desc'),
        limit(50)
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
      
      if (novels.length < 50) {
        setAllNovelsLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching novels:', error)
      toast.error('Failed to fetch novels')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyFeaturedContent = async () => {
    try {
      const weeklyFeaturedRef = doc(db, 'featuredContent', 'weeklyFeatured')
      const weeklyFeaturedDoc = await getDoc(weeklyFeaturedRef)
      
      if (weeklyFeaturedDoc.exists()) {
        const data = weeklyFeaturedDoc.data()
        
        // Fetch full novel details for weekly featured novels
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
        
        // Populate the list with novel details
        const weeklyFeaturedList = await fetchNovelDetails(data.novels || [])
        setWeeklyFeaturedNovels(weeklyFeaturedList)
      }
    } catch (error) {
      console.error('Error fetching weekly featured content:', error)
      toast.error('Failed to fetch existing selections')
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
      } else {
        setAvailableNovels(prev => [...prev, ...newNovels])
        
        // Update filtered novels if no search is active
        if (!searchTerm.trim()) {
          setFilteredNovels(prev => [...prev, ...newNovels])
        }
      }
    } catch (error) {
      console.error('Error loading more novels:', error)
      toast.error('Failed to load more novels')
    } finally {
      setIsFetchingMore(false)
    }
  }

  const loadAllNovels = async () => {
    if (isFetchingMore || allNovelsLoaded) return
    
    try {
      setIsFetchingMore(true)
      toast.info('Loading all novels... This may take a moment.')
      
      let allNewNovels: Novel[] = []
      let hasMore = true
      let lastDocument = availableNovels.length > 0 ? await getDoc(doc(db, 'novels', availableNovels[availableNovels.length - 1].novelId)) : null
      
      while (hasMore) {
        let q
        if (lastDocument) {
          q = query(
            collection(db, 'novels'),
            orderBy('metadata.createdAt', 'desc'),
            startAfter(lastDocument),
            limit(100) // Load in larger batches for efficiency
          )
        } else {
          q = query(
            collection(db, 'novels'),
            orderBy('metadata.createdAt', 'desc'),
            limit(100)
          )
        }
        
        const querySnapshot = await getDocs(q)
        const batchNovels = querySnapshot.docs.map(doc => ({
          novelId: doc.id,
          ...doc.data(),
          author: doc.data().publishers?.original || 'Unknown',
          genres: doc.data().genres || []
        } as Novel))
        
        if (batchNovels.length === 0) {
          hasMore = false
          setAllNovelsLoaded(true)
        } else {
          allNewNovels = [...allNewNovels, ...batchNovels]
          lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1]
          
          // If we got less than 100, we've reached the end
          if (batchNovels.length < 100) {
            hasMore = false
            setAllNovelsLoaded(true)
          }
        }
      }
      
      if (allNewNovels.length > 0) {
        setAvailableNovels(prev => [...prev, ...allNewNovels])
        
        // Update filtered novels if no search is active
        if (!searchTerm.trim()) {
          setFilteredNovels(prev => [...prev, ...allNewNovels])
        }
        
        toast.success(`Loaded ${allNewNovels.length} additional novels`)
      } else {
        toast.info('All novels are already loaded')
      }
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
      // Search in title (most important)
      const titleMatch = novel.title.toLowerCase().includes(searchLower)
      
      // Search in author/publisher
      const authorMatch = novel.author.toLowerCase().includes(searchLower)
      
      // Search in genres
      const genreMatch = novel.genres?.some(genre => 
        genre.name.toLowerCase().includes(searchLower)
      )
      
      // Search in synopsis for more comprehensive results
      const synopsisMatch = novel.synopsis?.toLowerCase().includes(searchLower)
      
      return titleMatch || authorMatch || genreMatch || synopsisMatch
    })
    
    // Sort results: exact title matches first, then partial title matches, then other matches
    const sortedFiltered = filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      
      // Exact title match gets highest priority
      const aExactTitle = aTitle === searchLower
      const bExactTitle = bTitle === searchLower
      if (aExactTitle && !bExactTitle) return -1
      if (!aExactTitle && bExactTitle) return 1
      
      // Title starts with search term gets second priority
      const aTitleStarts = aTitle.startsWith(searchLower)
      const bTitleStarts = bTitle.startsWith(searchLower)
      if (aTitleStarts && !bTitleStarts) return -1
      if (!aTitleStarts && bTitleStarts) return 1
      
      // Then by relevance (title contains search term)
      const aTitleContains = aTitle.includes(searchLower)
      const bTitleContains = bTitle.includes(searchLower)
      if (aTitleContains && !bTitleContains) return -1
      if (!aTitleContains && bTitleContains) return 1
      
      // Finally sort alphabetically
      return aTitle.localeCompare(bTitle)
    })
    
    setFilteredNovels(sortedFiltered)
    setCurrentPage(1)
  }, [searchTerm, availableNovels])

  const paginatedNovels = filteredNovels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const addToWeeklyFeatured = (novel: Novel) => {
    if (isNovelInWeeklyFeatured(novel.novelId)) {
      toast.error('Novel already in weekly featured list')
      return
    }

    if (weeklyFeaturedNovels.length >= 5) {
      toast.error('Maximum 5 novels allowed for Weekly Featured')
      return
    }
    
    setWeeklyFeaturedNovels(prev => [...prev, novel])
    toast.success(`Added "${novel.title}" to Weekly Featured`)
  }

  const removeFromWeeklyFeatured = (novelId: string) => {
    setWeeklyFeaturedNovels(prev => prev.filter(n => n.novelId !== novelId))
    toast.success('Novel removed from weekly featured list')
  }

  const saveWeeklyFeatured = async () => {
    try {
      setSavingWeeklyFeatured(true)
      
      const ids = weeklyFeaturedNovels.map(n => n.novelId)
      
      // Get the current document or create it if it doesn't exist
      const weeklyFeaturedRef = doc(db, 'featuredContent', 'weeklyFeatured')
      const weeklyFeaturedDoc = await getDoc(weeklyFeaturedRef)
      
      const data = weeklyFeaturedDoc.exists() ? weeklyFeaturedDoc.data() : {}
      
      // Update the weekly featured novels
      await setDoc(weeklyFeaturedRef, {
        ...data,
        novels: ids,
        updatedAt: new Date()
      }, { merge: true })
      
      toast.success('Weekly Featured novels saved successfully')
    } catch (error) {
      console.error('Error saving weekly featured novels:', error)
      toast.error('Failed to save weekly featured novels')
    } finally {
      setSavingWeeklyFeatured(false)
    }
  }

  // Check if a novel is already in the weekly featured list
  const isNovelInWeeklyFeatured = (novelId: string) => {
    return weeklyFeaturedNovels.some(n => n.novelId === novelId)
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] bg-clip-text text-transparent">
              Weekly Featured Management
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Novel Selection */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg shadow-lg border border-[#333] overflow-hidden">
              <div className="p-6 border-b border-[#333]">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#F1592A]" />
                  Available Novels
                </h3>
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
                    className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300"
                  >
                    {isFetchingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Load More
                  </Button>
                  <Button
                    onClick={loadAllNovels}
                    disabled={isFetchingMore || allNovelsLoaded}
                    variant="outline"
                    className="bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] border-[#F1592A] text-white hover:from-[#E14A1B] hover:to-[#FF6B3D] transition-all duration-300 shadow-md hover:shadow-[0_0_12px_rgba(241,89,42,0.4)]"
                  >
                    {isFetchingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Load All
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F1592A]"></div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#333] hover:bg-[#2A2827]/30">
                          <TableHead className="text-white font-bold uppercase text-xs opacity-80">Cover</TableHead>
                          <TableHead className="text-white font-bold uppercase text-xs opacity-80">Title</TableHead>
                          <TableHead className="text-white font-bold uppercase text-xs opacity-80">Author</TableHead>
                          <TableHead className="text-white font-bold uppercase text-xs opacity-80">Genre</TableHead>
                          <TableHead className="text-white font-bold uppercase text-xs opacity-80">Rating</TableHead>
                          <TableHead className="text-white font-bold uppercase text-xs opacity-80">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedNovels.map((novel, index) => (
                          <TableRow 
                            key={novel.novelId} 
                            className={`border-[#333] hover:bg-[#2A2827]/50 transition-colors group ${
                              index % 2 === 0 ? 'bg-gradient-to-r from-[#232120]/20 to-[#2A2827]/20' : 'bg-gradient-to-r from-[#2A2827]/40 to-[#232120]/40'
                            }`}
                          >
                            <TableCell className="border-l-4 border-l-transparent group-hover:border-l-[#F1592A] transition-colors">
                              <div className="relative w-12 h-18 overflow-hidden rounded shadow-md group-hover:shadow-[0_0_15px_rgba(241,89,42,0.3)] transition-shadow">
                                <Image
                                  src={novel.coverPhoto}
                                  alt={novel.title}
                                  width={48}
                                  height={72}
                                  className="object-cover rounded transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-medium group-hover:text-[#F1592A] transition-colors">
                              <div className="max-w-[200px]">
                                <div className="font-medium truncate">{novel.title}</div>
                                <div className="text-xs text-gray-400 truncate mt-1">
                                  {novel.synopsis ? novel.synopsis.substring(0, 50) + '...' : 'No synopsis'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300 group-hover:text-cyan-300 transition-colors">
                              <span className="px-2 py-1 bg-gradient-to-r from-[#333]/70 to-[#333]/50 group-hover:from-[#F1592A]/30 group-hover:to-[#FF7B4D]/30 rounded-full text-xs">
                                {novel.author}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300 group-hover:text-indigo-300 transition-colors">
                              <span className="px-2 py-1 bg-gradient-to-r from-[#333]/70 to-[#333]/50 group-hover:from-[#F1592A]/30 group-hover:to-[#FF7B4D]/30 rounded-full text-xs">
                                {novel.genres?.[0]?.name || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center group-hover:scale-110 transition-transform">
                                <Star className="h-4 w-4 text-yellow-400 mr-1 group-hover:text-yellow-300 group-hover:drop-shadow-[0_0_3px_rgba(250,204,21,0.5)]" />
                                <span className="text-white group-hover:text-yellow-100">{novel.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => addToWeeklyFeatured(novel)}
                                disabled={isNovelInWeeklyFeatured(novel.novelId)}
                                size="sm"
                                className={`bg-gradient-to-r transition-all duration-300 shadow-md ${
                                  isNovelInWeeklyFeatured(novel.novelId)
                                    ? 'from-gray-600 to-gray-700 cursor-not-allowed opacity-50'
                                    : 'from-[#F1592A] to-[#FF7B4D] hover:from-[#E14A1B] hover:to-[#FF6B3D] hover:scale-105 hover:shadow-[0_0_12px_rgba(241,89,42,0.4)]'
                                }`}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#333]">
                      <div className="text-sm text-gray-400">
                        Showing {Math.min(filteredNovels.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredNovels.length, currentPage * itemsPerPage)} of {filteredNovels.length} novels
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] disabled:opacity-50 transition-all duration-300"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm text-gray-300 bg-gradient-to-r from-[#2A2827] to-[#333] rounded border border-[#444]">
                          {currentPage} / {totalPages || 1}
                        </span>
                        <Button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage >= totalPages}
                          variant="outline"
                          size="sm"
                          className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] disabled:opacity-50 transition-all duration-300"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Selected Weekly Featured List */}
          <div>
            <div className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg shadow-lg border border-[#333] overflow-hidden">
              <div className="p-6 border-b border-[#333]">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-[#F1592A]" />
                  Weekly Featured ({weeklyFeaturedNovels.length}/5)
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {weeklyFeaturedNovels.map((novel, index) => (
                    <div 
                      key={novel.novelId} 
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 rounded-lg border border-[#444] hover:from-[#3A3837] hover:to-[#444] transition-all duration-300 group"
                    >
                      <span className="text-[#F1592A] font-bold text-lg min-w-[24px] text-center">#{index + 1}</span>
                      <div className="relative w-8 h-12 overflow-hidden rounded shadow-sm group-hover:shadow-[0_0_8px_rgba(241,89,42,0.3)] transition-shadow">
                        <Image
                          src={novel.coverPhoto}
                          alt={novel.title}
                          width={32}
                          height={48}
                          className="object-cover rounded transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate group-hover:text-[#F1592A] transition-colors">{novel.title}</h4>
                        <p className="text-gray-400 text-xs truncate group-hover:text-gray-300 transition-colors">{novel.author}</p>
                      </div>
                      <Button
                        onClick={() => removeFromWeeklyFeatured(novel.novelId)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {weeklyFeaturedNovels.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-[#444] rounded-lg">
                      <div className="flex flex-col items-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300 text-lg font-medium">No novels selected</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Add novels to Weekly Featured from the list
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={saveWeeklyFeatured}
                  disabled={savingWeeklyFeatured || weeklyFeaturedNovels.length === 0}
                  className="w-full mt-6 bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] hover:from-[#E14A1B] hover:to-[#FF6B3D] text-white transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-[0_0_20px_rgba(241,89,42,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {savingWeeklyFeatured ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Weekly Featured
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
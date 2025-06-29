'use client'

import { useState, useEffect, Suspense } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from '../authcontext'
import { db } from '@/lib/firebaseConfig'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { FaDiscord, FaTwitter, FaEdit } from 'react-icons/fa'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from 'next/navigation'

// Use dynamic import for Chart.js components to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false })
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false })
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface UserProfile {
  uid: string
  username: string
  bio: string
  profilePicture: string
  totalBooks: number
  completionRate: number
  dropRate: number
  level: number
  favoriteGenres?: string[]
  userType?: 'reader' | 'author' | 'admin'
}

interface Novel {
  novelId: string
  title: string
  coverPhoto?: string
  synopsis?: string
  rating?: number
  genres?: string[]
  progress?: {
    chapter?: number
    percentage?: number
  }
  lastRead?: any
  likes?: number
  availability?: string
  publishers?: any[]
  tags?: string[]
  chapters?: number
  wordCount?: number
  readTime?: number
}

function UserProfileContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [followedNovels, setFollowedNovels] = useState<Novel[]>([])
  const [recommendations, setRecommendations] = useState<Novel[]>([])
  const [editFormData, setEditFormData] = useState({
    username: '',
    bio: '',
    profilePicture: '',
    favoriteGenres: [] as string[]
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewingUserId = searchParams.get('userId') // Get userId from URL params
  const isViewingOwnProfile = !viewingUserId || viewingUserId === user?.uid

  // Available genres
  const availableGenres = [
    { id: 'fantasy', label: 'Fantasy', color: 'blue' },
    { id: 'romance', label: 'Romance', color: 'pink' },
    { id: 'sci-fi', label: 'Science Fiction', color: 'purple' },
    { id: 'mystery', label: 'Mystery', color: 'green' },
    { id: 'horror', label: 'Horror', color: 'orange' },
    { id: 'adventure', label: 'Adventure', color: 'yellow' },
    { id: 'thriller', label: 'Thriller', color: 'red' },
    { id: 'historical', label: 'Historical', color: 'amber' },
  ]

  // Data for the weekly reading streak chart
  const readingStreakData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Pages Read',
        data: [65, 48, 80, 25, 56, 45, 72],
        fill: false,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.5)',
        tension: 0.4,
      },
    ],
  }

  // Options for the weekly reading streak chart
  const readingStreakOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#4b5563',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#4b5563',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  }

  // Data for the favorite genres chart
  const favoriteGenresData = {
    labels: ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Horror'],
    datasets: [
      {
        data: [35, 25, 15, 15, 10],
        backgroundColor: [
          'rgba(249, 115, 22, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(209, 213, 219, 0.8)',
          'rgba(107, 114, 128, 0.8)',
          'rgba(75, 85, 99, 0.8)',
        ],
        borderColor: [
          'rgba(249, 115, 22, 1)',
          'rgba(156, 163, 175, 1)',
          'rgba(209, 213, 219, 1)',
          'rgba(107, 114, 128, 1)',
          'rgba(75, 85, 99, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // Options for the favorite genres chart
  const favoriteGenresOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  }

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
      const targetUserId = viewingUserId || user.uid
      const userQuery = query(collection(db, 'users'), where('uid', '==', targetUserId))
      const userSnapshot = await getDocs(userQuery)
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data() as UserProfile
        setProfile(userData)
        setEditFormData({
          username: userData.username || '',
          bio: userData.bio || '',
          profilePicture: userData.profilePicture || '',
          favoriteGenres: userData.favoriteGenres || []
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch followed novels
  const fetchFollowedNovels = async () => {
    if (!user) return
    
    try {
      const targetUserId = viewingUserId || user.uid
      
      // Get user's followed novels from bookmarks
      const bookmarksQuery = query(
        collection(db, 'bookmarks'), 
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      const bookmarksSnapshot = await getDocs(bookmarksQuery)
      
      const novelIds = bookmarksSnapshot.docs.map(doc => doc.data().novelId)
      
      if (novelIds.length === 0) {
        setFollowedNovels([])
        return
      }
      
      // Fetch novel details for each bookmarked novel
      const novelsData: Novel[] = []
      
      for (const novelId of novelIds) {
        try {
          const novelDoc = await getDoc(doc(db, 'novels', novelId))
          if (novelDoc.exists()) {
            const novelData = novelDoc.data()
            
            // Get user's reading progress for this novel
            const progressQuery = query(
              collection(db, 'readingProgress'),
              where('userId', '==', targetUserId),
              where('novelId', '==', novelId)
            )
            const progressSnapshot = await getDocs(progressQuery)
            
            let progress = { chapter: 0, percentage: 0 }
            let lastRead = null
            
            if (!progressSnapshot.empty) {
              const progressData = progressSnapshot.docs[0].data()
              progress = {
                chapter: progressData.currentChapter || 0,
                percentage: progressData.progressPercentage || 0
              }
              lastRead = progressData.lastReadAt
            }
            
            novelsData.push({
              novelId: novelId,
              title: novelData.title || 'Untitled',
              coverPhoto: novelData.coverPhoto || '',
              synopsis: novelData.synopsis || '',
              rating: novelData.averageRating || 0,
              genres: novelData.genres || [],
              progress: progress,
              lastRead: lastRead,
              likes: novelData.totalLikes || 0,
              availability: novelData.availability || 'free',
              publishers: novelData.publishers || [],
              tags: novelData.tags || [],
              chapters: novelData.totalChapters || 0,
              wordCount: novelData.wordCount || 0,
              readTime: novelData.estimatedReadTime || 0
            })
          }
        } catch (error) {
          console.error(`Error fetching novel ${novelId}:`, error)
        }
      }
      
      setFollowedNovels(novelsData)
    } catch (error) {
      console.error('Error fetching followed novels:', error)
    }
  }

  // Fetch recommendations based on user's reading history and preferences
  const fetchRecommendations = async () => {
    try {
      // For now, fetch some random novels as recommendations
      // In a real app, this would use a recommendation algorithm
      const novelsQuery = query(
        collection(db, 'novels'), 
        orderBy('averageRating', 'desc'),
        limit(8)
      )
      const novelsSnapshot = await getDocs(novelsQuery)
      
      const recommendedNovels = novelsSnapshot.docs.map(doc => ({
        novelId: doc.id,
        title: doc.data().title || 'Untitled',
        coverPhoto: doc.data().coverPhoto || '',
        synopsis: doc.data().synopsis || '',
        rating: doc.data().averageRating || 0,
        genres: doc.data().genres || [],
        likes: doc.data().totalLikes || 0,
        availability: doc.data().availability || 'free',
        publishers: doc.data().publishers || [],
        tags: doc.data().tags || [],
        chapters: doc.data().totalChapters || 0,
        wordCount: doc.data().wordCount || 0,
        readTime: doc.data().estimatedReadTime || 0
      })) as Novel[]
      
      setRecommendations(recommendedNovels)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!user || !isViewingOwnProfile) return
    
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid))
      const userSnapshot = await getDocs(userQuery)
      
      if (!userSnapshot.empty) {
        const userDocRef = userSnapshot.docs[0].ref
        await updateDoc(userDocRef, {
          username: editFormData.username,
          bio: editFormData.bio,
          profilePicture: editFormData.profilePicture,
          favoriteGenres: editFormData.favoriteGenres
        })
        
        // Update local state
        setProfile(prev => prev ? {
          ...prev,
          username: editFormData.username,
          bio: editFormData.bio,
          profilePicture: editFormData.profilePicture,
          favoriteGenres: editFormData.favoriteGenres
        } : null)
        
        setIsEditProfileOpen(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  // Handle genre selection
  const handleGenreToggle = (genreId: string) => {
    setEditFormData(prev => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genreId)
        ? prev.favoriteGenres.filter(id => id !== genreId)
        : [...prev.favoriteGenres, genreId]
    }))
  }

  useEffect(() => {
    setMounted(true)
    if (user) {
      fetchUserProfile()
      fetchFollowedNovels()
      fetchRecommendations()
    }
  }, [user, viewingUserId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A2234] to-[#0F1419] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A2234] to-[#0F1419] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A2234] to-[#0F1419] text-white">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-[#1A2234]/80 to-[#0F1419]/80 backdrop-blur-md border-b border-gray-700/20">
        <div className="absolute inset-0 bg-[url('/assets/hero-section.jpg')] bg-cover bg-center opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-orange-500/30 shadow-2xl">
                <AvatarImage src={profile.profilePicture || '/assets/default-avatar.png'} alt={profile.username} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-4xl font-bold">
                  {profile.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Lv.{profile.level || 1}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{profile.username || 'Anonymous User'}</h1>
                  <div className="flex items-center gap-4 text-gray-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {profile.userType || 'Reader'}
                    </span>
                    <span>•</span>
                    <span>{profile.totalBooks || 0} Books</span>
                    <span>•</span>
                    <span>{profile.completionRate || 0}% Completion Rate</span>
                  </div>
                </div>
                
                {isViewingOwnProfile && (
                  <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-500/20 hover:bg-orange-500/30 backdrop-blur-sm border border-orange-500/30 text-orange-300 px-4 py-2 rounded-lg flex items-center gap-2">
                        <FaEdit className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-[#1A2234]/95 backdrop-blur-xl border border-gray-700/50 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Update your profile information and preferences.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                          <Input
                            id="username"
                            value={editFormData.username}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                            className="bg-[#2A3447]/50 border-gray-600/50 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editFormData.bio}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="bg-[#2A3447]/50 border-gray-600/50 text-white min-h-[80px]"
                            placeholder="Tell us about yourself..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="profilePicture" className="text-sm font-medium">Profile Picture URL</Label>
                          <Input
                            id="profilePicture"
                            value={editFormData.profilePicture}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, profilePicture: e.target.value }))}
                            className="bg-[#2A3447]/50 border-gray-600/50 text-white"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Favorite Genres</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {availableGenres.map((genre) => (
                              <div key={genre.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={genre.id}
                                  checked={editFormData.favoriteGenres.includes(genre.id)}
                                  onCheckedChange={() => handleGenreToggle(genre.id)}
                                  className="border-gray-600"
                                />
                                <Label htmlFor={genre.id} className="text-sm text-gray-300">
                                  {genre.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProfileOpen(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateProfile} className="bg-orange-500 hover:bg-orange-600 text-white">
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <p className="text-gray-300 mb-4 max-w-2xl">{profile.bio || 'No bio available.'}</p>

              {/* Social Links */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                  <FaDiscord className="w-4 h-4 mr-2" />
                  Discord
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700/50">
                  <FaTwitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-12 gap-4 mb-8">
          {/* Left Column */}
          <div className="col-span-3">
            <div className="bg-white/40 dark:bg-[#1A2234]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg rounded-xl p-4 h-full">
              <h3 className="text-lg font-semibold mb-4">Reading Stats</h3>
              <div className="space-y-4">
                <div className="bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-3">
                  <div className="text-2xl font-bold text-orange-400">{profile.totalBooks || 0}</div>
                  <div className="text-sm text-gray-400">Total Books</div>
                </div>
                <div className="bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-3">
                  <div className="text-2xl font-bold text-green-400">{profile.completionRate || 0}%</div>
                  <div className="text-sm text-gray-400">Completion Rate</div>
                </div>
                <div className="bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-3">
                  <div className="text-2xl font-bold text-red-400">{profile.dropRate || 0}%</div>
                  <div className="text-sm text-gray-400">Drop Rate</div>
                </div>
                <div className="bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-3">
                  <div className="text-2xl font-bold text-purple-400">Lv.{profile.level || 1}</div>
                  <div className="text-sm text-gray-400">Reader Level</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="col-span-6">
            <div className="bg-white/40 dark:bg-[#1A2234]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg rounded-xl p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Reading Progress</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-[#f97316] hover:bg-[#ea580c] backdrop-blur-md text-white rounded-full text-sm">Monthly</button>
                  <button className="px-3 py-1 bg-white/20 dark:bg-[#2A3447]/40 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-full text-sm">Weekly</button>
                </div>
              </div>
              <div className="h-[calc(100%-50px)] bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-3">
                {mounted && <Line data={readingStreakData} options={readingStreakOptions} />}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-3">
            <div className="bg-white/40 dark:bg-[#1A2234]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg rounded-xl p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-3">Reading Preferences</h3>
              <div className="flex-1 bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-3 flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  {mounted && <Doughnut data={favoriteGenresData} options={favoriteGenresOptions} />}
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[rgba(249,115,22,0.8)]"></div>
                    <span className="text-xs text-gray-300">Fantasy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[rgba(156,163,175,0.8)]"></div>
                    <span className="text-xs text-gray-300">Sci-Fi</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[rgba(209,213,219,0.8)]"></div>
                    <span className="text-xs text-gray-300">Romance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[rgba(107,114,128,0.8)]"></div>
                    <span className="text-xs text-gray-300">Mystery</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[rgba(75,85,99,0.8)]"></div>
                    <span className="text-xs text-gray-300">Horror</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Novel Library Section */}
        <div className="mt-8">
          <div className="bg-white/40 dark:bg-[#1A2234]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Playing</h3>
              <Link href="/browse" className="text-orange-400 hover:text-orange-300 text-sm">
                All Time
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-gray-400 text-sm">
                  <tr>
                    <th className="text-left pb-3 font-medium w-2/5">Book/Novel</th>
                    <th className="text-left pb-3 font-medium w-1/5">Activity</th>
                    <th className="text-left pb-3 font-medium w-1/5">Genres</th>
                    <th className="text-left pb-3 font-medium w-1/5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {followedNovels.length > 0 ? (
                    followedNovels.slice(0, 3).map((novel) => (
                      <tr key={novel.novelId} className="border-t border-[#2A3447]/30">
                        <td className="py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-700 mr-3">
                              {novel.coverPhoto ? (
                                <Image 
                                  src={novel.coverPhoto} 
                                  alt={novel.title} 
                                  width={40} 
                                  height={40} 
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-700" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{novel.title}</div>
                              <div className="text-xs text-gray-400">
                                {novel.progress?.percentage ? `${novel.progress.percentage}% complete` : "Not started"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="px-2 py-1 rounded-md inline-block bg-[#f97316]/20 backdrop-blur-sm text-[#f97316] border border-[#f97316]/10">
                            {novel.lastRead ? 
                              `${Math.floor((Date.now() - novel.lastRead.toDate().getTime()) / (1000 * 60 * 60 * 24))} days` : 
                              "No activity"}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="text-gray-300 flex flex-wrap gap-1">
                            {novel.genres && novel.genres.length > 0 ? 
                              novel.genres.slice(0, 2).map((genre, idx) => (
                                <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50">
                                  {typeof genre === 'object' && genre !== null ? 
                                    (genre as any).name || 'Unknown' : 
                                    typeof genre === 'string' ? 
                                      genre : 
                                      'Unknown'}
                                </span>
                              )) 
                              : <span className="text-xs text-gray-400">No genres</span>
                            }
                          </div>
                        </td>
                        <td className="py-4">
                          <Link href={`/novel/${novel.novelId}`}>
                            <Button className="bg-[#f97316]/90 hover:bg-[#ea580c] backdrop-blur-sm border border-[#f97316]/20 text-white px-3 py-1 rounded-md text-xs">
                              Resume
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        <div className="bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl p-6">
                          <div className="mb-2">You haven't followed any novels yet</div>
                          <Link href="/browse" className="text-orange-400 hover:text-orange-300">
                            Browse novels to add to your library
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="mt-8">
          <div className="bg-white/40 dark:bg-[#1A2234]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">Recommended For You</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendations.map((novel) => (
                <Link key={novel.novelId} href={`/novel/${novel.novelId}`} className="block">
                  <div className="bg-white/30 dark:bg-[#2A3447]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-xl overflow-hidden hover:bg-white/50 dark:hover:bg-[#2A3447]/50 transition duration-300">
                    <div className="aspect-[2/3] relative">
                      {novel.coverPhoto ? (
                        <Image 
                          src={novel.coverPhoto} 
                          alt={novel.title} 
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700" />
                      )}
                      <div className="absolute top-2 right-2 bg-orange-500/90 text-xs text-white px-2 py-1 rounded-full">
                        ★ {novel.rating?.toFixed(1) || "N/A"}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-white hover:text-orange-300 line-clamp-1">{novel.title}</h4>
                      <div className="mt-1 text-xs text-gray-400 flex flex-wrap gap-1">
                        {novel.genres && novel.genres.length > 0 ? 
                          novel.genres.slice(0, 2).map((genre, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-full bg-gray-700/50">
                              {typeof genre === 'object' && genre !== null ? 
                                (genre as any).name || 'Unknown' : 
                                typeof genre === 'string' ? 
                                  genre : 
                                  'Unknown'}
                            </span>
                          )) 
                          : "No genres"
                        }
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading component for Suspense fallback
function UserProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A2234] to-[#0F1419] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading profile...</p>
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<UserProfileLoading />}>
      <UserProfileContent />
    </Suspense>
  )
}

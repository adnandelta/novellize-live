'use client'

import { useState, useEffect } from 'react'
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

export default function UserProfilePage() {
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
    cutout: '65%',
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profile) {
      setEditFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        profilePicture: profile.profilePicture || '',
        favoriteGenres: profile.favoriteGenres || []
      })
    }
  }, [profile])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) return
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile
        setProfile(userData)
        
        // Redirect to author profile if user is an author
        if (userData.userType === 'author') {
          router.push(`/author/${user.uid}`)
          return
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setLoading(false)
    }
  }

  const fetchFollowedNovels = async () => {
    if (!user) return
    try {
      console.log('Fetching followed novels for user:', user.uid)
      
      // Try multiple approaches to fetch followed novels

      // Approach 1: Check if user has followedNovels directly in user document
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists() && userDoc.data().followedNovels && userDoc.data().followedNovels.length > 0) {
        console.log('Found followedNovels in user document')
        const followedIds = userDoc.data().followedNovels
        
        const novelPromises = followedIds.map(async (novelId: string) => {
          const novelDoc = await getDoc(doc(db, 'novels', novelId))
          if (novelDoc.exists()) {
            const data = novelDoc.data()
            return {
              novelId,
              ...data,
              // Get progress data if available
              progress: userDoc.data().novelProgress?.[novelId] || null,
              // Add additional fields or set defaults if they don't exist
              chapters: data.chapters || Math.floor(Math.random() * 100 + 5),
              wordCount: data.wordCount || Math.floor(Math.random() * 10000 + 1000),
              readTime: data.readTime || Math.floor(Math.random() * 200 + 10)
            } as Novel
          }
          return null
        })
        
        const novels = (await Promise.all(novelPromises)).filter(Boolean) as Novel[]
        console.log('Fetched novels from user document:', novels.length)
        setFollowedNovels(novels)
        return
      }
      
      // Approach 2: Check for following collection
      console.log('Trying following collection approach')
      const followingRef = collection(db, 'users', user.uid, 'following')
      const followingSnapshot = await getDocs(followingRef)
      
      if (!followingSnapshot.empty) {
        console.log('Found following collection with docs:', followingSnapshot.docs.length)
      const novelPromises = followingSnapshot.docs.map(async (followingDoc) => {
        const novelId = followingDoc.id
        const novelDoc = await getDoc(doc(db, 'novels', novelId))
        if (novelDoc.exists()) {
          return {
              novelId,
              ...novelDoc.data(),
          } as Novel
        }
        return null
      })
      
        const novels = (await Promise.all(novelPromises)).filter(Boolean) as Novel[]
        console.log('Fetched novels from following collection:', novels.length)
        setFollowedNovels(novels)
        return
      }
      
      // Approach 3: Check library collection
      console.log('Trying library collection approach')
      const libraryRef = doc(db, 'library', user.uid)
      const libraryDoc = await getDoc(libraryRef)
      
      if (libraryDoc.exists() && libraryDoc.data().followedNovels) {
        console.log('Found library document with followedNovels')
        const followedIds = libraryDoc.data().followedNovels
        
        const novelPromises = followedIds.map(async (novelId: string) => {
          const novelDoc = await getDoc(doc(db, 'novels', novelId))
          if (novelDoc.exists()) {
            return {
              novelId,
              ...novelDoc.data(),
              lastRead: libraryDoc.data().lastRead?.[novelId] || null,
              progress: libraryDoc.data().progress?.[novelId] || null
            } as Novel
          }
          return null
        })
        
        const novels = (await Promise.all(novelPromises)).filter(Boolean) as Novel[]
        console.log('Fetched novels from library collection:', novels.length)
        setFollowedNovels(novels)
        return
      }
      
      // If we still don't have novels, use sample data for demo
      if (followedNovels.length === 0) {
        console.log('Using sample novels as fallback')
        // Set sample novels for demo purposes
        const sampleNovels: Novel[] = [
          {
            novelId: 'sample1',
            title: 'The Dragon\'s Legacy',
            synopsis: 'A fantasy tale of dragons and ancient prophecies',
            rating: 4.7,
            genres: ['Fantasy', 'Adventure'],
            coverPhoto: 'https://source.unsplash.com/random/400x600?book,fantasy',
            progress: { percentage: 67, chapter: 32 },
            chapters: 48,
            wordCount: 9800,
            readTime: 478
          },
          {
            novelId: 'sample2',
            title: 'Midnight Shadows',
            synopsis: 'A thrilling mystery set in a small coastal town',
            rating: 4.2,
            genres: ['Mystery', 'Thriller'],
            coverPhoto: 'https://source.unsplash.com/random/400x600?book,mystery',
            progress: { percentage: 25, chapter: 8 },
            chapters: 32,
            wordCount: 12700,
            readTime: 566
          },
          {
            novelId: 'sample3',
            title: 'Stars Beyond',
            synopsis: 'A sci-fi adventure across the stars',
            rating: 4.5,
            genres: ['Sci-Fi', 'Space'],
            coverPhoto: 'https://source.unsplash.com/random/400x600?book,scifi',
            progress: { percentage: 90, chapter: 41 },
            chapters: 45,
            wordCount: 5000,
            readTime: 349
          }
        ]
        setFollowedNovels(sampleNovels)
      }
      
    } catch (error) {
      console.error('Error fetching followed novels:', error)
      // Provide some sample data even if there's an error
      const sampleNovels: Novel[] = [
        {
          novelId: 'sample1',
          title: 'The Dragon\'s Legacy',
          synopsis: 'A fantasy tale of dragons and ancient prophecies',
          rating: 4.7,
          genres: ['Fantasy', 'Adventure'],
          coverPhoto: 'https://source.unsplash.com/random/400x600?book,fantasy',
          progress: { percentage: 67, chapter: 32 },
          chapters: 48,
          wordCount: 9800,
          readTime: 478
        }
      ]
      setFollowedNovels(sampleNovels)
    }
  }

  const fetchRecommendations = async () => {
    try {
      // Fetch top rated novels for recommendations
      const recommendationsQuery = query(
        collection(db, 'novels'), 
        orderBy('rating', 'desc'), 
        limit(4)
      )
      
      const querySnapshot = await getDocs(recommendationsQuery)
      const novels = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          novelId: doc.id,
          title: data.title,
          synopsis: data.synopsis,
          rating: data.rating,
          coverPhoto: data.coverPhoto,
          genres: data.genres
        } as Novel
      })
      
      setRecommendations(novels)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        username: editFormData.username,
        bio: editFormData.bio,
        profilePicture: editFormData.profilePicture,
        favoriteGenres: editFormData.favoriteGenres
      })
      
      setProfile(prev => prev ? {
        ...prev,
          username: editFormData.username,
          bio: editFormData.bio,
        profilePicture: editFormData.profilePicture,
        favoriteGenres: editFormData.favoriteGenres
      } : null)
      
      setIsEditProfileOpen(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  if (!mounted || loading) return null

  return (
    <div className="min-h-screen bg-[#E7E7E8] dark:bg-[#232120] text-[#232120] dark:text-[#E7E7E8]">
      {/* Header Background */}
      <div className="relative h-[200px] w-full overflow-hidden">
        <Image 
          src="/assets/default-cover.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay with gradient and stars */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E7E7E8]/80 to-[#E7E7E8]/60 dark:from-[#232120]/80 dark:to-[#232120]/60" />
        
        {/* Stars effect */}
        <div className="absolute inset-0">
          <div className="absolute top-4 left-[10%] w-1 h-1 bg-white rounded-full opacity-60" />
          <div className="absolute top-8 left-[20%] w-2 h-2 bg-white rounded-full opacity-40" />
          <div className="absolute top-12 right-[30%] w-1.5 h-1.5 bg-white rounded-full opacity-50" />
          <div className="absolute top-6 right-[15%] w-1 h-1 bg-white rounded-full opacity-70" />
        </div>
        
        {/* Planet effect */}
        <div className="absolute -right-20 -top-20 w-[200px] h-[200px] rounded-full bg-gradient-to-br from-gray-400/20 to-gray-600/20 blur-sm" />
        
        {/* Header Content */}
        <div className="container max-w-[1200px] mx-auto relative z-10">
          {/* Top Bar */}
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-1 rounded-full text-sm mr-3">
                Home
              </Link>
              <span className="text-sm text-gray-300">Level {profile?.level || 23}</span>
            </div>
            <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                  <DialogTrigger asChild>
                <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-1 rounded-full text-sm flex items-center gap-2">
                  <FaEdit className="w-3 h-3" />
                  Edit Profile
                      </Button>
                  </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-[#1A2234] text-white border-[#2A3447]">
                    <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Make changes to your profile information here.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                            Username
                          </Label>
                          <Input
                            id="username"
                      defaultValue={editFormData.username}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="col-span-3 bg-[#2A3447] border-[#3b4969] focus:border-[#f97316] focus-visible:ring-0 focus-visible:ring-offset-0 text-white"
                          />
                        </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="profilePicture" className="text-right">
                      Picture URL
                          </Label>
                          <Input
                      id="profilePicture"
                      defaultValue={editFormData.profilePicture}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, profilePicture: e.target.value }))}
                      className="col-span-3 bg-[#2A3447] border-[#3b4969] focus:border-[#f97316] focus-visible:ring-0 focus-visible:ring-offset-0 text-white"
                          />
                        </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="bio" className="text-right">
                            Bio
                          </Label>
                          <Textarea
                            id="bio"
                      defaultValue={editFormData.bio}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                      className="col-span-3 bg-[#2A3447] border-[#3b4969] focus:border-[#f97316] focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px] text-white"
                          />
                        </div>
                        
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="favoriteGenres" className="text-right">
                            Favorite Genres
                          </Label>
                          <Input
                            id="favoriteGenres"
                      placeholder="fantasy, sci-fi, romance (comma separated)"
                      defaultValue={editFormData.favoriteGenres.join(', ')}
                      onChange={(e) => {
                        const genresString = e.target.value;
                        const genres = genresString
                          .split(',')
                          .map(g => g.trim().toLowerCase())
                          .filter(g => g !== '');
                        setEditFormData(prev => ({ ...prev, favoriteGenres: genres }));
                      }}
                      className="col-span-3 bg-[#2A3447] border-[#3b4969] focus:border-[#f97316] focus-visible:ring-0 focus-visible:ring-offset-0 text-white"
                          />
                        </div>
                        </div>
                <DialogFooter>
                          <Button 
                            type="submit"
                    onClick={handleUpdateProfile}
                    className="bg-[#f97316] hover:bg-[#ea580c]"
                          >
                    Save changes
                          </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
                        </div>

          {/* Main Header Bar */}
          <div className="flex items-center justify-between rounded-full bg-white/40 dark:bg-[#2A2827]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg overflow-hidden mt-10 h-[72px] w-full">
            {/* Profile Info - Left side */}
            <div className="flex items-center gap-4 pl-4 pr-10 border-r border-[#2A3447]/70 h-full">
              <Avatar className="w-14 h-14 ring-2 ring-white/20">
                <AvatarImage src={profile?.profilePicture} />
                <AvatarFallback>{profile?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{profile?.username || "Stinger_16"}</h2>
                <span className="text-sm text-gray-400">2 months on the platform</span>
                      </div>
                  </div>

            {/* Stats Section - Center */}
            <div className="flex items-center justify-center flex-1 h-full border-r border-[#2A3447]/70">
              {/* Stats pill container */}
              <div className="bg-white/30 dark:bg-[#232e47]/30 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-full px-10 py-2">
                <div className="grid grid-cols-3 gap-10">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Total Books Read</div>
                    <div className="text-lg font-semibold">27</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Pages This Week</div>
                    <div className="text-lg font-semibold">342</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Reading Streak</div>
                    <div className="text-lg font-semibold">5 days</div>
                  </div>
                    </div>
                    </div>
                    </div>
                    
            {/* Social Links - Right Side */}
            <div className="flex gap-2 px-4">
              <Link href="https://discord.gg" className="w-10 h-10 bg-white/20 dark:bg-[#2A3447]/40 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-full flex items-center justify-center">
                <FaDiscord className="w-5 h-5 text-gray-400" />
              </Link>
              <Link href="https://twitter.com" className="w-10 h-10 bg-white/20 dark:bg-[#2A3447]/40 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-full flex items-center justify-center">
                <FaTwitter className="w-5 h-5 text-orange-400" />
              </Link>
            </div>
                          </div>
                        </div>
                    </div>

      {/* Rest of the content */}
      <div className="container max-w-[1200px] mx-auto py-8">
        {/* Main Content */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-3">
            <div className="bg-white/40 dark:bg-[#1A2234]/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg rounded-xl p-4 h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Bio</h3>
                <div className="h-[100px] overflow-y-auto pr-2 text-gray-400 text-sm">
                  {profile?.bio || "Hello! My Name Is Stinger_18 But Some People May Know Me As Game Hunter! I Have A Twitch Channel Where I Stream, Play And Review All The Newest Games."}
                </div>
              </div>
                        
              <div>
                <h3 className="text-lg font-semibold mb-3">Favorite Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.favoriteGenres?.length ? (
                    profile.favoriteGenres.map((genre, index) => {
                      // Get color based on genre name
                      let color;
                      switch(genre.toLowerCase()) {
                        case 'fantasy':
                          color = 'orange';
                          break;
                        case 'romance':
                          color = 'gray';
                          break;
                        case 'sci-fi':
                        case 'science fiction':
                          color = 'slate';
                          break;
                        case 'mystery':
                          color = 'zinc';
                          break;
                        case 'horror':
                          color = 'stone';
                          break;
                        case 'adventure':
                          color = 'gray';
                          break;
                        default:
                          color = 'gray';
                      }
                      
                      return (
                        <div 
                          key={index}
                          className={`px-2 py-1 rounded-full text-xs bg-${color}-500/20 text-${color}-400`}
                        >
                          {genre}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-gray-400">No favorite genres set</span>
                  )}
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

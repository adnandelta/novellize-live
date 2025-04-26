'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, increment, Timestamp, arrayRemove, arrayUnion, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StarRating } from '@/components/ui/starrating'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ThumbsUp, BookMarked, Gift, Eye, Info, MessageCircle, Search, Moon, Sun, LogOut, User, ChevronsLeftRight, MessageSquare, Menu, X, Calendar, Users, FileText, Hash } from 'lucide-react'
import CommentSystem from '@/components/ui/commentsystem'
import { motion } from 'framer-motion'
import { toast, Toaster } from 'react-hot-toast'
import { useAuth } from '@/app/authcontext'
import { setDoc, deleteDoc } from 'firebase/firestore'
import { genreColors } from '@/app/genreColors'
import Link from 'next/link'
import { RecommendedList } from '@/components/RecomendedList'
import ReactMarkdown from 'react-markdown'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebaseConfig'

interface Novel {
  novelId: string;
  title: string;
  synopsis: string;
  coverPhoto: string;
  extraArt?: string[];
  brand?: {
    name: string;
    logo?: string;
  };
  seriesType: 'ORIGINAL' | 'TRANSLATED' | 'FAN_FIC';
  language: {
    original: string;
    translated?: string[];
  };
  publishers: {
    original: string;
    english?: string;
  };
  releaseFrequency: string;
  alternativeNames?: string;
  chapterType: 'TEXT' | 'MANGA' | 'VIDEO';
  totalChapters: number;
  seriesStatus: 'ONGOING' | 'COMPLETED' | 'ON HOLD' | 'CANCELLED' | 'UPCOMING';
  availability: {
    type: 'FREE' | 'FREEMIUM' | 'PAID';
    price?: number;
  };
  seriesInfo: {
    volumeNumber?: number;
    seriesNumber?: number;
    firstReleaseDate: Timestamp;
  };
  credits: {
    authors: Array<string | {
      id?: string;
      name: string;
      isAccount: boolean;
    }>;
    artists?: {
      translators?: string[];
      editors?: string[];
      proofreaders?: string[];
      [key: string]: string[] | undefined;
    };
  };
  genres: { name: string }[];
  tags?: string[];
  likes: number;
  views: number;
  rating: number;
  uploader: string;
}

interface Chapter {
  id: string
  number: number
  title: string
  link: string
  releaseDate: Timestamp
}

const formatDate = (timestamp: Timestamp) => {
  const date = timestamp.toDate()
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getGenreColor = (genreName: string, theme: string | undefined) => {
  const normalizedGenre = genreName.toLowerCase();
  const key = Object.keys(genreColors).find(k => k.toLowerCase() === normalizedGenre);
  if (!key) return theme === 'dark' 
    ? 'bg-gray-800/50 text-white font-semibold tracking-wide uppercase text-sm px-4 py-2 backdrop-blur-sm' 
    : 'bg-gray-100/80 text-gray-900 font-semibold tracking-wide uppercase text-sm px-4 py-2 backdrop-blur-sm';
  return theme === 'dark' 
    ? `${genreColors[key as keyof typeof genreColors].dark} font-semibold tracking-wide uppercase text-sm px-4 py-2 backdrop-blur-sm` 
    : `${genreColors[key as keyof typeof genreColors].light} font-semibold tracking-wide uppercase text-sm px-4 py-2 backdrop-blur-sm`;
};

// Common card styles
const cardClasses = "bg-transparent border-none shadow-none"
const cardHeaderClasses = "text-2xl font-bold mb-6 text-gray-900 dark:text-gray-50 flex items-center gap-3"
const itemClasses = "flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-none"
const labelClasses = "text-gray-500 dark:text-gray-400 font-medium"
const valueClasses = "text-gray-900 dark:text-gray-100 font-medium"

export default function NovelPageClient({ params }: { params: { novelId: string } }) {
  const [novel, setNovel] = useState<Novel | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const [uploaderUsername, setUploaderUsername] = useState<string>('')
  const [viewIncremented, setViewIncremented] = useState(false)
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [recommendedNovels, setRecommendedNovels] = useState<Novel[]>([])
  const [recommendedLoading, setRecommendedLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{ profilePicture: string, username: string } | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [randomNovels, setRandomNovels] = useState<Novel[]>([])
  const [randomNovelsLoading, setRandomNovelsLoading] = useState(true)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [hasRated, setHasRated] = useState(false)
  const [totalRatings, setTotalRatings] = useState(0)
  const [isRatingProcessing, setIsRatingProcessing] = useState(false)
  const [authorInfo, setAuthorInfo] = useState<{
    name: string;
    id?: string;
    isAccount: boolean;
    profilePicture?: string;
    userType?: string;
  } | null>(null)

  const fetchAuthorInfo = async () => {
    if (!novel) return
    
    try {
      // Check if the first author is an object with isAccount flag
      const firstAuthor = novel.credits.authors[0]
      
      if (typeof firstAuthor === 'object' && firstAuthor.isAccount) {
        // If author has an account, fetch their profile
        if (firstAuthor.id) {
          const authorDoc = await getDoc(doc(db, 'users', firstAuthor.id))
          if (authorDoc.exists()) {
            const authorData = authorDoc.data()
            setAuthorInfo({
              name: authorData.username || firstAuthor.name,
              id: firstAuthor.id,
              isAccount: true,
              profilePicture: authorData.profilePicture || '',
              userType: authorData.userType || 'reader'
            })
            return
          }
        }
        
        // If author account not found, use the name but mark as non-account
        setAuthorInfo({
          name: firstAuthor.name,
          isAccount: false
        })
      } 
      // If author is a string, try to find a user with that username
      else if (typeof firstAuthor === 'string') {
        // First, try to find a user with this username
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '==', firstAuthor),
          limit(1)
        )
        
        const userSnapshot = await getDocs(usersQuery)
        
        if (!userSnapshot.empty) {
          // Found a user with this username
          const userData = userSnapshot.docs[0].data()
          const userId = userSnapshot.docs[0].id
          
          setAuthorInfo({
            name: userData.username || firstAuthor,
            id: userId,
            isAccount: true,
            profilePicture: userData.profilePicture || '',
            userType: userData.userType || 'reader'
          })
          return
        }
        
        // If no user found, use the name as a non-account author
        setAuthorInfo({
          name: firstAuthor,
          isAccount: false
        })
      }
      // If author is an object without isAccount flag
      else if (firstAuthor && typeof firstAuthor === 'object') {
        setAuthorInfo({
          name: firstAuthor.name || 'Unknown Author',
          isAccount: false
        })
      }
      // Fallback for any other case
      else {
        setAuthorInfo({
          name: 'Unknown Author',
          isAccount: false
        })
      }
    } catch (error) {
      console.error('Error fetching author info:', error)
      // Fallback to uploader info
      try {
        // Fetch uploader's user type
        const uploaderDoc = await getDoc(doc(db, 'users', novel.uploader))
        if (uploaderDoc.exists()) {
          const uploaderData = uploaderDoc.data()
          setAuthorInfo({
            name: uploaderUsername,
            id: novel.uploader,
            isAccount: true,
            profilePicture: uploaderData.profilePicture || '',
            userType: uploaderData.userType || 'reader'
          })
        } else {
          setAuthorInfo({
            name: uploaderUsername,
            id: novel.uploader,
            isAccount: true
          })
        }
      } catch (uploaderError) {
        console.error('Error fetching uploader info:', uploaderError)
        setAuthorInfo({
          name: uploaderUsername,
          id: novel.uploader,
          isAccount: true
        })
      }
    }
  }

  const handleAuthorClick = () => {
    if (!novel) return
    
    // Show loading toast
    toast.loading('Loading author profile...', {
      id: 'author-loading',
      duration: 3000
    })
    
    // If we have an author ID, always try to navigate to their profile first
    if (authorInfo?.id) {
      // Pass the ID to the profile page to check the user type
      router.push(`/author/profile?userId=${authorInfo.id}&name=${encodeURIComponent(authorInfo.name || 'Unknown Author')}`)
    }
    // If no ID but we have a name, navigate to the dummy profile page
    else if (authorInfo?.name) {
      router.push(`/author/profile?name=${encodeURIComponent(authorInfo.name)}&isAccount=false`)
    }
    // Fallback to uploader profile if no author info
    else {
      router.push(`/author/${novel.uploader}`)
    }
  }

  const ThemeToggle = () => {
    if (!mounted) return null

    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-10 h-10 rounded-full border-2 border-[#F1592A] border-opacity-50 bg-[#E7E7E8] dark:bg-[#232120] hover:bg-[#F1592A] dark:hover:bg-[#F1592A] group"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4 text-[#E7E7E8]" />
        ) : (
          <Moon className="h-4 w-4 text-[#232120] group-hover:text-white" />
        )}
      </Button>
    )
  }

  const updateTags = async () => {
    if (!user || !novel) return;
    try {
      const novelRef = doc(db, 'novels', novel.novelId);
      await updateDoc(novelRef, {
        tags: ['action', 'fantasy', 'magic', 'system']
      });
      toast.success('Tags updated successfully');
      // Refresh the novel data
      fetchNovel();
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    }
  };

  const fetchNovel = async () => {
    if (!params.novelId) return
    setLoading(true)
    try {
      const novelDoc = await getDoc(doc(db, 'novels', params.novelId))
      if (novelDoc.exists()) {
        const novelData = { novelId: novelDoc.id, ...novelDoc.data() } as Novel
        console.log('Novel Data:', novelData)
        console.log('Tags:', novelData.tags)
        setNovel(novelData)
        setLikes(novelData.likes || 0)
        
        // Fetch total ratings count
        const ratingsQuery = query(collection(db, 'novels', params.novelId, 'ratings'))
        const ratingsSnapshot = await getDocs(ratingsQuery)
        setTotalRatings(ratingsSnapshot.size)
        
        const uploaderDoc = await getDoc(doc(db, 'users', novelData.uploader))
        if (uploaderDoc.exists()) {
          setUploaderUsername(uploaderDoc.data().username || 'Unknown User')
        }

        if (!viewIncremented) {
          const currentViews = Math.round(novelData.views || 0)
          await updateDoc(doc(db, 'novels', params.novelId), {
            views: currentViews + 1
          })
          setViewIncremented(true)
        }

        // Fetch recommended novels of same genre
        setRecommendedLoading(true);
        try {
          const primaryGenre = novelData.genres[0]?.name; // Get first genre
          let recommendedQuery;
          
          if (primaryGenre) {
            // Simple query with just where clause
            recommendedQuery = query(
              collection(db, 'novels'),
              where('genres', 'array-contains', primaryGenre),
              limit(8)
            );
          } else {
            // Fallback to latest novels
            recommendedQuery = query(
              collection(db, 'novels'),
              limit(8)
            );
          }
          
          const recommendedSnapshot = await getDocs(recommendedQuery);
          const recommendedData = recommendedSnapshot.docs
            .map(doc => ({ novelId: doc.id, ...doc.data() } as Novel))
            .filter(n => n.novelId !== novelData.novelId); // Exclude current novel

          setRecommendedNovels(recommendedData);
        } catch (error) {
          console.error('Error fetching recommended novels:', error);
          toast.error('Failed to fetch recommendations');
        } finally {
          setRecommendedLoading(false);
        }
      } else {
        toast.error('Novel not found')
      }
    } catch (error) {
      console.error('Error fetching novel:', error)
      toast.error('Failed to fetch novel details')
    }
    setLoading(false)
  }

  const fetchChapters = async () => {
    setChaptersLoading(true)
    try {
      const chaptersQuery = query(
        collection(db, 'novels', params.novelId, 'chapters'),
        orderBy('chapter', 'asc')
      )
      const querySnapshot = await getDocs(chaptersQuery)
      const chaptersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        number: doc.data().chapter,
        title: doc.data().title,
        link: doc.data().link,
        releaseDate: doc.data().releaseDate
      } as Chapter))
      setChapters(chaptersData)
    } catch (error) {
      console.error('Error fetching chapters:', error)
      toast.error('Failed to fetch chapters')
    } finally {
      setChaptersLoading(false)
    }
  }

  const fetchRandomNovels = async () => {
    setRandomNovelsLoading(true)
    try {
      // First, get the total count of novels
      const countQuery = query(collection(db, 'novels'))
      const snapshot = await getDocs(countQuery)
      const totalNovels = snapshot.size

      // Get a larger batch of novels to ensure we have enough after filtering
      const q = query(
        collection(db, 'novels'),
        orderBy('views', 'desc'), // Order by views to get popular novels
        limit(30) // Get more novels than needed to ensure variety
      )
      const querySnapshot = await getDocs(q)
      const novels = querySnapshot.docs
        .map(doc => ({ novelId: doc.id, ...doc.data() } as Novel))
        .filter(novel => novel.novelId !== params.novelId) // Filter out current novel

      // Shuffle the array to get random novels
      const shuffledNovels = novels
        .sort(() => Math.random() - 0.5)
        .slice(0, 10) // Take only 10 novels after shuffling

      setRandomNovels(shuffledNovels)
    } catch (error) {
      console.error('Error fetching random novels:', error)
      toast.error('Failed to fetch random novels')
    } finally {
      setRandomNovelsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    if (params.novelId) {
      fetchNovel()
      fetchChapters()
      fetchRandomNovels()
    }
    if (user) {
      fetchUserProfile()
    }
  }, [params.novelId, user])

  useEffect(() => {
    if (user && novel) {
      checkIfFollowing()
      checkIfLiked()
      checkIfRated()
    }
  }, [user, novel])

  useEffect(() => {
    if (novel) {
      fetchAuthorInfo()
    }
  }, [novel, uploaderUsername])

  const checkIfFollowing = async () => {
    if (!user || !novel) return
    try {
      const followingRef = doc(db, 'users', user.uid, 'following', novel.novelId)
      const followingDoc = await getDoc(followingRef)
      setIsFollowing(followingDoc.exists())
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const checkIfLiked = async () => {
    if (!user || !novel) return
    try {
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setIsLiked(userData.likedNovels?.includes(novel.novelId) || false)
      }
    } catch (error) {
      console.error('Error checking like status:', error)
    }
  }

  const checkIfRated = async () => {
    if (!user || !novel) return
    try {
      const ratingRef = doc(db, 'novels', novel.novelId, 'ratings', user.uid)
      const ratingDoc = await getDoc(ratingRef)
      if (ratingDoc.exists()) {
        const ratingData = ratingDoc.data()
        setUserRating(ratingData.rating)
        setHasRated(true)
      } else {
        setHasRated(false)
        setUserRating(null)
      }
    } catch (error) {
      console.error('Error checking rating status:', error)
    }
  }

  const handleFollowNovel = async () => {
    if (!user) {
      toast.error('Please log in to follow novels')
      return
    }

    if (!novel) return

    const followingRef = doc(db, 'users', user.uid, 'following', novel.novelId)

    try {
      if (isFollowing) {
        await deleteDoc(followingRef)
        setIsFollowing(false)
        toast.success('Novel unfollowed')
      } else {
        await setDoc(followingRef, { following: true })
        setIsFollowing(true)
        toast.success('Novel followed')
      }
    } catch (error) {
      console.error('Error updating followed novels:', error)
      toast.error('Failed to update followed novels')
    }
  }

  const handleLikeNovel = async () => {
    if (!user) {
      toast.error('Please log in to like novels')
      return
    }
  
    try {
      if (!novel) throw new Error('Novel not found');
      const novelRef = doc(db, 'novels', novel.novelId)
      const userRef = doc(db, 'users', user.uid)
  
      if (isLiked) {
        await updateDoc(novelRef, { likes: increment(-1) })
        await updateDoc(userRef, { likedNovels: arrayRemove(novel.novelId) })
        setLikes(prevLikes => prevLikes - 1)
        setIsLiked(false)
        toast.success('Like removed')
      } else {
        await updateDoc(novelRef, { likes: increment(1) })
        await updateDoc(userRef, { likedNovels: arrayUnion(novel.novelId) })
        setLikes(prevLikes => prevLikes + 1)
        setIsLiked(true)
        toast.success('Novel liked')
      }
    } catch (error) {
      console.error('Error updating like:', error)
      toast.error('Failed to update like')
    }
  }

  const handleRateNovel = async (rating: number) => {
    if (!user) {
      toast.error('Please log in to rate novels')
      return
    }

    if (!novel || isRatingProcessing) return

    try {
      // Set processing state to prevent multiple submissions
      setIsRatingProcessing(true)
      
      // Ensure rating is between 0.5-5 with 0.5 increments
      const validRating = Math.min(Math.max(Math.round(rating * 2) / 2, 0.5), 5)
      
      // Show visual feedback immediately
      setUserRating(validRating)
      
      const novelRef = doc(db, 'novels', novel.novelId)
      const ratingRef = doc(db, 'novels', novel.novelId, 'ratings', user.uid)
      const ratingDoc = await getDoc(ratingRef)
      
      // Get all existing ratings to calculate new average
      const ratingsQuery = query(collection(db, 'novels', novel.novelId, 'ratings'))
      const ratingsSnapshot = await getDocs(ratingsQuery)
      
      let totalRatingPoints = 0
      let ratingCount = 0
      
      // Calculate sum of all ratings excluding the current user's rating
      ratingsSnapshot.docs.forEach(doc => {
        if (doc.id !== user.uid) {
          totalRatingPoints += doc.data().rating
          ratingCount++
        }
      })
      
      // Add the new rating
      totalRatingPoints += validRating
      ratingCount++
      
      // Calculate new average
      const newAverageRating = totalRatingPoints / ratingCount
      
      // Update or create the user's rating
      if (ratingDoc.exists()) {
        await updateDoc(ratingRef, { 
          rating: validRating,
          updatedAt: Timestamp.now()
        })
        
        // Add a small delay before showing the toast
        await new Promise(resolve => setTimeout(resolve, 500))
        toast.success('Your rating has been updated')
      } else {
        await setDoc(ratingRef, {
          rating: validRating,
          userId: user.uid,
          username: userProfile?.username || user.email,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        
        // Add a small delay before showing the toast
        await new Promise(resolve => setTimeout(resolve, 500))
        toast.success('Thank you for rating this novel!')
      }
      
      // Update the novel's average rating
      await updateDoc(novelRef, { rating: newAverageRating })
      
      // Update local state
      setUserRating(validRating)
      setHasRated(true)
      setTotalRatings(ratingCount)
      
      // Update the novel object in state
      setNovel({
        ...novel,
        rating: newAverageRating
      })
      
      // Add a small additional delay before allowing new ratings
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error('Error updating rating:', error)
      toast.error('Failed to update rating')
      // Reset the user rating if there was an error
      await checkIfRated()
    } finally {
      // Reset processing state
      setIsRatingProcessing(false)
    }
  }

  const handleFollowChange = (novelId: string, isFollowing: boolean) => {
    // This can be implemented later if needed
    console.log('Follow status changed:', novelId, isFollowing)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserProfile({
          profilePicture: userData.profilePicture || '',
          username: userData.username || ''
        })
        setUserType(userData.userType || null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  if (!mounted) return null
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>
  if (!novel) return <div className="flex justify-center items-center h-screen">Novel not found</div>

  return (
    <div className="min-h-screen bg-white dark:bg-[#232120]">
      <Toaster />
      <header className="border-b dark:border-[#3E3F3E] bg-[#E7E7E8] dark:bg-[#232120] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex-shrink-0">
                <Image
                  src="/assets/favicon.png"
                  alt="Novellize"
                  width={40}
                  height={40}
                  className="hover:opacity-90 transition-opacity"
                />
              </Link>

              <nav className="hidden lg:flex items-center space-x-4">
                <Link 
                  href="/browse" 
                  className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-1.5"
                >
                  Browse All
                </Link>
                <Link 
                  href="/forum" 
                  className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-1.5"
                >
                  Forum
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex relative w-[300px]">
                <Input
                  type="text"
                  placeholder="Search novels..."
                  className="pl-10 pr-4 py-2 w-full bg-white dark:bg-[#2A2827] border-[#F1592A] border-opacity-50 rounded-full focus-visible:ring-[#F1592A]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <ThemeToggle />

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar>
                      <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                      <AvatarFallback>{userProfile?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userProfile?.username}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/user_profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {userType === 'admin' && (
                      <>
                        <DropdownMenuItem onClick={() => router.push('/admin')}>
                          <ChevronsLeftRight className="mr-2 h-4 w-4" />
                          <span>Admin Console</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" onClick={() => router.push('/auth')} className="text-[#F1592A]">
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#F1592A]">Home</Link>
          <span>/</span>
          <Link href="/fantasy" className="hover:text-[#F1592A]">Fantasy</Link>
          <span>/</span>
          <span className="text-[#F1592A]">{novel.title}</span>
        </div>

        {/* Novel Info Section - First Row */}
        <div className="flex flex-col md:flex-row gap-10 mb-10">
          {/* Left Column - Cover Image */}
          <div className="w-full md:w-1/3 lg:w-1/4">
            <div className="sticky top-6">
              <Image
                src={novel.coverPhoto}
                alt={novel.title}
                width={300}
                height={400}
                className="rounded-3xl shadow-lg w-full object-cover"
              />
            </div>
          </div>

          {/* Right Column - Novel Details */}
          <div className="flex-1 flex flex-col">
            {/* Top Content */}
            <div className="flex-1">
              {/* Title and Original Label */}
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-[#232120] dark:text-white">
                  {novel.title}
                </h1>
                <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                  {novel.seriesType.replace('_', ' ')}
                </span>
              </div>
              
              {/* Author Info */}
              {authorInfo && (
                <div 
                  className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleAuthorClick}
                >
                  <Avatar className="h-6 w-6">
                    {authorInfo.profilePicture ? (
                      <AvatarImage src={authorInfo.profilePicture} alt={authorInfo.name} />
                    ) : (
                      <AvatarFallback>{authorInfo.name.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-gray-600 dark:text-gray-300 font-medium">{authorInfo.name}</span>
                  {authorInfo.isAccount && (
                    <Badge variant="outline" className="px-1 py-0 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Verified
                    </Badge>
                  )}
                </div>
              )}

              {/* Uploader Info */}
              <div 
                className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push(`/author/${novel.uploader}`)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback>{uploaderUsername.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-gray-600 dark:text-gray-300 font-medium">Uploaded by {uploaderUsername}</span>
                <Badge variant="outline" className="px-1 py-0 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Uploader
                </Badge>
              </div>

              {/* Genres and Tags Section */}
              <div className="space-y-4 mb-6">
                {/* Genres */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {novel.genres.map((genre, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="text-xs font-bold px-3 py-1 bg-[#F1592A]/10 text-[#F1592A] hover:bg-[#F1592A]/20 transition-colors cursor-pointer"
                        onClick={() => router.push(`/browse?selectedGenres=${encodeURIComponent(genre.name)}`)}
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {novel.tags && novel.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-3">
                      {novel.tags.map((tag, index) => (
                        <Link
                          key={index}
                          href={`/browse?tagSearchInclude=${encodeURIComponent(tag)}`}
                          className="text-xs font-bold px-3 py-1 bg-[#1A1A1A] text-[#4B6BFB] hover:bg-[#232323] transition-colors cursor-pointer rounded-md flex items-center"
                        >
                          <Hash className="h-4 w-4 mr-1 text-[#4B6BFB]" />
                          {tag.toUpperCase()}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Content - Rating, Stats and Buttons */}
            <div className="mt-auto">
              {/* Rating Section */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <div className={`relative group ${isRatingProcessing ? 'animate-subtle-scale' : ''}`}>
                      <StarRating 
                        rating={novel.rating} 
                        userRating={userRating || undefined}
                        onRate={isRatingProcessing ? undefined : handleRateNovel}
                        size={24}
                      />
                      {isRatingProcessing && (
                        <div className="absolute inset-0 overflow-hidden rounded-full">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" 
                               style={{ 
                                 backgroundSize: '200% 100%',
                                 animation: 'shimmer 1.5s infinite'
                               }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-20" />
                        </div>
                      )}
                      {user && !isRatingProcessing && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          Click for half or full stars
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {novel.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-sm ${isRatingProcessing ? 'text-[#F1592A] animate-pulse' : 'text-gray-500'} transition-colors duration-300`}>
                      {isRatingProcessing 
                        ? 'Processing...' 
                        : hasRated 
                          ? `Your rating: ${userRating?.toFixed(1)}/5` 
                          : user 
                            ? 'Rate this novel' 
                            : 'Login to rate'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Icons Row */}
              <div className="flex gap-8 mb-6">
                <div className="flex flex-col items-center">
                  <BookOpen className="w-6 h-6 text-blue-500 mb-1" />
                  <span className="text-sm font-medium">{novel.totalChapters}</span>
                  <span className="text-xs text-gray-500">Chapters</span>
                </div>
                <div className="flex flex-col items-center">
                  <Eye className="w-6 h-6 text-green-500 mb-1" />
                  <span className="text-sm font-medium">{novel.views}</span>
                  <span className="text-xs text-gray-500">Views</span>
                </div>
                <div className="flex flex-col items-center">
                  <ThumbsUp 
                    className={`w-6 h-6 mb-1 ${isLiked ? 'text-pink-500 fill-current' : 'text-gray-500'}`}
                    onClick={handleLikeNovel}
                    style={{ cursor: 'pointer' }}
                  />
                  <span className="text-sm font-medium">{likes}</span>
                  <span className="text-xs text-gray-500">Likes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-[#F1592A] hover:bg-[#F1592A]/90 text-white rounded-full"
                  onClick={() => router.push(`/novel/${novel.novelId}/chapters`)}
                >
                  CONTINUE READING
                </Button>
                <Button 
                  variant="outline" 
                  className={`flex-1 rounded-full ${
                    isFollowing 
                      ? "bg-[#F1592A] text-white hover:bg-[#232120]" 
                      : "border-[#F1592A] text-[#F1592A] hover:bg-[#F1592A]/10"
                  }`}
                  onClick={handleFollowNovel}
                >
                  <BookMarked className="mr-2 h-4 w-4" />
                  {isFollowing ? 'IN LIBRARY' : 'ADD TO LIBRARY'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
          <div className="flex gap-12">
            <button
              onClick={() => setActiveTab('about')}
              className={`relative pb-4 ${
                activeTab === 'about'
                  ? 'text-[#F1592A]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="text-2xl font-bold">About</span>
              {activeTab === 'about' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#F1592A]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('chapters')}
              className={`relative pb-4 ${
                activeTab === 'chapters'
                  ? 'text-[#F1592A]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="text-2xl font-bold">Table of Contents</span>
              {activeTab === 'chapters' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#F1592A]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`relative pb-4 ${
                activeTab === 'comments'
                  ? 'text-[#F1592A]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="text-2xl font-bold">Comments</span>
              {activeTab === 'comments' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#F1592A]" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'about' && (
          <div className="space-y-12 pt-6">
            {/* Synopsis Section */}
            <Card className={cardClasses}>
              <CardContent className="p-0">
                <h2 className={cardHeaderClasses}>
                  <Info className="w-6 h-6 text-[#F1592A]" />
                  Synopsis
                </h2>
                <ReactMarkdown className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed prose dark:prose-invert max-w-none">
                  {novel.synopsis}
                </ReactMarkdown>
              </CardContent>
            </Card>

            {/* Series Information and Release Details */}
            <div className="w-full">
              <div className="flex flex-col items-center gap-12">
                {/* First Row */}
                <div className="flex flex-wrap gap-x-20 gap-y-12 justify-center">
                  {/* Series Type */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <BookOpen className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">Series Type</span>
                    <span className="text-base font-semibold text-white">{novel.seriesType}</span>
                  </div>

                  {/* Release Frequency */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <Calendar className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">Release Frequency</span>
                    <span className="text-base font-semibold text-white">{novel.releaseFrequency}</span>
                  </div>

                  {/* Chapter Type */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <BookOpen className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">Chapter Type</span>
                    <span className="text-base font-semibold text-white">{novel.chapterType}</span>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <Info className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">Status</span>
                    <span className="text-base font-semibold text-[#F1592A]">
                      {novel.seriesStatus}
                    </span>
                  </div>
                </div>

                {/* Second Row */}
                <div className="flex flex-wrap gap-x-20 gap-y-12 justify-center">
                  {/* Availability */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <Gift className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">Availability</span>
                    <span className={`text-base font-semibold ${
                      novel.availability.type === 'FREE' ? 'text-green-500' : 'text-[#F1592A]'
                    }`}>
                      {novel.availability.type}
                      {novel.availability.price && ` - $${novel.availability.price}`}
                    </span>
                  </div>

                  {/* First Release */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <Calendar className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">First Release</span>
                    <span className="text-base font-semibold text-white">
                      {formatDate(novel.seriesInfo.firstReleaseDate)}
                    </span>
                  </div>

                  {/* Original Language */}
                  <div className="flex flex-col items-center text-center min-w-[160px]">
                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                      <MessageSquare className="w-8 h-8 text-[#F1592A]" />
                    </div>
                    <span className="text-sm text-gray-500 mb-1">Original Language</span>
                    <span className="text-base font-semibold text-white">{novel.language.original}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits Section */}
            <Card className={cardClasses}>
              <CardContent className="p-0">
                <h2 className={cardHeaderClasses}>
                  <Users className="w-6 h-6 text-[#F1592A]" />
                  Credits
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Main Credits</h3>
                    <div className="space-y-1">
                      <div className={itemClasses}>
                        <span className={labelClasses}>Authors</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {novel.credits.authors.map((author, index) => (
                            <div 
                              key={index} 
                              className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                              onClick={handleAuthorClick}
                            >
                              {index === 0 && authorInfo?.profilePicture && (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={authorInfo.profilePicture} alt={authorInfo.name} />
                                  <AvatarFallback>{authorInfo.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              )}
                              {typeof author === 'string' ? author : author.name}
                              {index === 0 && authorInfo?.isAccount && (
                                <Badge variant="outline" className="ml-1 px-1 py-0 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {novel.brand?.name && (
                        <div className={itemClasses}>
                          <span className={labelClasses}>Brand</span>
                          <span className={valueClasses}>{novel.brand.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {novel.credits.artists && Object.keys(novel.credits.artists).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Additional Credits</h3>
                      <div className="space-y-1">
                        {Object.entries(novel.credits.artists).map(([role, people]) => 
                          people && people.length > 0 ? (
                            <div key={role} className={itemClasses}>
                              <span className={labelClasses}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </span>
                              <span className={valueClasses}>{people.join(', ')}</span>
                            </div>
                          ) : null
                        )}
                      </div>  
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alternative Names */}
            {novel.alternativeNames && (
              <Card className={cardClasses}>
                <CardContent className="p-0">
                  <h2 className={cardHeaderClasses}>
                    <BookMarked className="w-6 h-6 text-[#F1592A]" />
                    Alternative Names
                  </h2>
                  <p className="text-gray-900 dark:text-gray-100 text-lg">{novel.alternativeNames}</p>
                </CardContent>
              </Card>
            )}

            {/* Extra Artwork Gallery */}
            {novel.extraArt && novel.extraArt.length > 0 && (
              <Card className={cardClasses}>
                <CardContent className="p-0">
                  <h2 className={cardHeaderClasses}>
                    {/* <Image className="w-6 h-6 text-[#F1592A]" /> */}
                    Gallery
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {novel.extraArt.map((art, index) => (
                      <Image
                        key={index}
                        src={art}
                        alt={`Artwork ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover w-full h-48 hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Novels Section */}
            <div className="mt-12">
              <RecommendedList 
                novels={randomNovels} 
                loading={randomNovelsLoading}
                onFollowChange={handleFollowNovel}
              />
              {/* <div className="flex justify-center mt-6">
                <Link href="/browse">
                  <Button 
                    variant="outline" 
                    className="border-[#F1592A] text-[#F1592A] hover:bg-[#F1592A] hover:text-white dark:border-[#F1592A] dark:text-[#F1592A] dark:hover:bg-[#F1592A] dark:hover:text-white rounded-full"
                  >
                    View All Recommendations
                  </Button>
                </Link>
              </div> */}
            </div>
          </div>
        )}

        {activeTab === 'chapters' && (
          <div className="h-[calc(100vh-300px)]">
            <div className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {chaptersLoading ? (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">Loading chapters...</p>
                  ) : chapters.length === 0 ? (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No chapters available yet.</p>
                  ) : (
                    chapters.map((chapter) => (
                      <div key={chapter.id} 
                        className="flex justify-between items-center py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium">Chapter {chapter.number}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{chapter.title}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(chapter.releaseDate)}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          className="text-[#F1592A] hover:bg-[#F1592A]/10 rounded-full"
                          onClick={() => window.open(chapter.link, '_blank', 'noopener,noreferrer')}
                        >
                          Read
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="pt-6">
            <CommentSystem novelId={novel.novelId} />
          </div>
        )}
      </main>
    </div>
  )
}

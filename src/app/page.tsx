'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Moon, 
  Sun, 
  LogOut, 
  User, 
  ChevronsLeftRight, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Flame, 
  BookOpen, 
  Crown, 
  Sparkles,
  Menu,
  X,
  Library
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './authcontext'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
import { getAnalytics, logEvent } from 'firebase/analytics'
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NovelCard } from '@/components/NovelCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from 'next-themes'
import LoadingSpinner from '@/components/LoadingSpinner' // Add this import
import { genreColors } from './genreColors'
import WeeklyBookSection from '@/components/WeeklySection'
import { NovelRankings } from '@/components/NovelRanking'
import { LatestReleasesCarousel } from '@/components/CarouselList'
import { TopReleasesSection } from '@/components/TopReleasesSection'
import { YouMayAlsoLikeSection } from '@/components/YouMayAlsoLikeSection'
import InitialLoader from '@/components/InitialLoader'
import { AuthorRequestSection } from '@/components/AuthorRequestSection'
import { FAQSection } from '@/components/FAQSection'
import HeroCarousel from '@/components/HeroCarousel'
import { Toaster } from 'sonner'
import { 
  trackPageView, 
  trackSectionView, 
  trackNovelInteraction, 
  trackUserAction, 
  trackThemeChange, 
  trackNavigation 
} from '@/lib/analytics'


interface Novel {
  novelId: string
  title: string
  coverPhoto: string
  genres: { name: string }[]
  rating: number
  synopsis: string
  publishers: {
    original: string
    english?: string
  }
  likes: number
  metadata?: {
    createdAt: any;
    updatedAt: any;
  }
  views?: number;
  totalChapters?: number;
  lastUpdated?: string;
  author: string;
}

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: any
  image?: string
}

interface RecommendedNovel {
  id: string;
  title: string;
  coverImage: string;
  category: string;
  author: {
    name: string;
  };
  tags: string[];
  rating: number;
  chaptersCount: number;
  synopsis: string;
}

const CACHE_KEY = 'popularNovels'
const CACHE_EXPIRATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const LATEST_CACHE_KEY = 'latestNovels'

const fetchPopularNovels = async () => {
  const cachedData = localStorage.getItem(CACHE_KEY)
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData)
    if (Date.now() - timestamp < CACHE_EXPIRATION) {
      return data.slice(0, 20) // Increased from 10 to 20 for more selection options
    }
  }

  // If cache is invalid or expired, fetch from Firestore
  const q = query(collection(db, 'novels'), orderBy('rating', 'desc'), limit(20)) // Increased from 10 to 20
  const querySnapshot = await getDocs(q)
  const novels = querySnapshot.docs.map(doc => ({ 
    novelId: doc.id, 
    ...doc.data(),
    genres: doc.data().genres || [],
    author: doc.data().publishers?.original || 'Unknown'
  } as Novel))

  // Cache the fetched data
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data: novels, timestamp: Date.now() }))

  return novels
}

const fetchLatestNovels = async () => {
  // First try to get admin-selected new arrivals
  try {
    const topReleasesRef = doc(db, 'featuredContent', 'topReleases')
    const topReleasesDoc = await getDoc(topReleasesRef)
    
    if (topReleasesDoc.exists()) {
      const data = topReleasesDoc.data()
      if (data.newArrivals && data.newArrivals.length > 0) {
        console.log('Using admin-selected new arrivals')
        
        // Fetch full novel details for admin-selected novels
        const novels: Novel[] = []
        for (const id of data.newArrivals) {
          try {
            const novelDoc = await getDoc(doc(db, 'novels', id))
            if (novelDoc.exists()) {
              novels.push({
                novelId: novelDoc.id,
                ...novelDoc.data(),
                genres: novelDoc.data().genres || [],
                author: novelDoc.data().publishers?.original || 'Unknown'
              } as Novel)
            }
          } catch (error) {
            console.error(`Error fetching novel ${id}:`, error)
          }
        }
        
        if (novels.length > 0) {
          return novels
        }
      }
    }
  } catch (error) {
    console.error('Error fetching admin-selected new arrivals:', error)
  }

  // Fallback to original logic
  const cachedData = localStorage.getItem(LATEST_CACHE_KEY)
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData)
    if (Date.now() - timestamp < CACHE_EXPIRATION) {
      return data.slice(0, 20)
    }
  }

  // If cache is invalid or expired, fetch from Firestore
  const q = query(
    collection(db, 'novels'), 
    orderBy('metadata.createdAt', 'desc'), 
    limit(20)
  )
  const querySnapshot = await getDocs(q)
  const novels = querySnapshot.docs.map(doc => ({ 
    novelId: doc.id, 
    ...doc.data(),
    genres: doc.data().genres || [],
    author: doc.data().publishers?.original || 'Unknown'
  } as Novel))

  // Cache the fetched data
  localStorage.setItem(LATEST_CACHE_KEY, JSON.stringify({ 
    data: novels, 
    timestamp: Date.now() 
  }))

  return novels
}

const fetchEditorsPicks = async () => {
  // First try to get admin-selected editors' choice
  try {
    const topReleasesRef = doc(db, 'featuredContent', 'topReleases')
    const topReleasesDoc = await getDoc(topReleasesRef)
    
    if (topReleasesDoc.exists()) {
      const data = topReleasesDoc.data()
      if (data.editorsChoice && data.editorsChoice.length > 0) {
        console.log('Using admin-selected editors\' choice')
        
        // Fetch full novel details for admin-selected novels
        const novels: Novel[] = []
        for (const id of data.editorsChoice) {
          try {
            const novelDoc = await getDoc(doc(db, 'novels', id))
            if (novelDoc.exists()) {
              novels.push({
                novelId: novelDoc.id,
                ...novelDoc.data(),
                genres: novelDoc.data().genres || [],
                publishers: novelDoc.data().publishers || { original: 'Unknown' }
              } as Novel)
            }
          } catch (error) {
            console.error(`Error fetching novel ${id}:`, error)
          }
        }
        
        if (novels.length > 0) {
          return novels
        }
      }
    }
  } catch (error) {
    console.error('Error fetching admin-selected editors\' choice:', error)
  }

  // Fallback to original logic
  const q = query(
    collection(db, 'novels'),
    orderBy('metadata.createdAt', 'desc'),
    limit(6)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    novelId: doc.id,
    ...doc.data(),
    genres: doc.data().genres || [],
    publishers: doc.data().publishers || { original: 'Unknown' }
  } as Novel))
}

const fetchRecommendedNovels = async () => {
  const q = query(
    collection(db, 'novels'),
    orderBy('rating', 'desc'),
    limit(8)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      coverImage: data.coverPhoto,
      category: data.genres?.[0]?.name || 'Fantasy',
      author: {
        name: data.publishers?.original || 'Unknown'
      },
      tags: data.tags || [],
      rating: data.rating || 0,
      chaptersCount: data.chapters?.length || 0,
      synopsis: data.synopsis || ''
    };
  });
};

const fetchRankingNovels = async () => {
  try {
    // First try to get admin-selected ranking novels
    const rankingRef = doc(db, 'featuredContent', 'ranking')
    const rankingDoc = await getDoc(rankingRef)
    
    let adminSelected = {
      newReleases: [] as Novel[],
      trending: [] as Novel[],
      popular: [] as Novel[]
    }
    
    if (rankingDoc.exists()) {
      const data = rankingDoc.data()
      console.log('Admin ranking selections found:', data)
      
      // Fetch admin-selected new releases
      if (data.newReleases && data.newReleases.length > 0) {
        console.log('Using admin-selected new releases')
        for (const id of data.newReleases) {
          try {
            const novelDoc = await getDoc(doc(db, 'novels', id))
            if (novelDoc.exists()) {
              adminSelected.newReleases.push({
                novelId: novelDoc.id,
                ...novelDoc.data(),
                genres: novelDoc.data().genres || [],
                author: novelDoc.data().publishers?.original || 'Unknown'
              } as Novel)
            }
          } catch (error) {
            console.error(`Error fetching admin-selected new release novel ${id}:`, error)
          }
        }
      }
      
      // Fetch admin-selected trending
      if (data.trending && data.trending.length > 0) {
        console.log('Using admin-selected trending')
        for (const id of data.trending) {
          try {
            const novelDoc = await getDoc(doc(db, 'novels', id))
            if (novelDoc.exists()) {
              adminSelected.trending.push({
                novelId: novelDoc.id,
                ...novelDoc.data(),
                genres: novelDoc.data().genres || [],
                author: novelDoc.data().publishers?.original || 'Unknown'
              } as Novel)
            }
          } catch (error) {
            console.error(`Error fetching admin-selected trending novel ${id}:`, error)
          }
        }
      }
      
      // Fetch admin-selected popular
      if (data.popular && data.popular.length > 0) {
        console.log('Using admin-selected popular')
        for (const id of data.popular) {
          try {
            const novelDoc = await getDoc(doc(db, 'novels', id))
            if (novelDoc.exists()) {
              adminSelected.popular.push({
                novelId: novelDoc.id,
                ...novelDoc.data(),
                genres: novelDoc.data().genres || [],
                author: novelDoc.data().publishers?.original || 'Unknown'
              } as Novel)
            }
          } catch (error) {
            console.error(`Error fetching admin-selected popular novel ${id}:`, error)
          }
        }
      }
    }
    
    // If we have all admin selections, return them
    if (adminSelected.newReleases.length > 0 && 
        adminSelected.trending.length > 0 && 
        adminSelected.popular.length > 0) {
      console.log('Using all admin-selected ranking novels')
      return adminSelected
    }
    
    console.log('Falling back to automatic ranking generation')
    
    // Fallback to automatic fetching for missing categories
    const [newReleases, trending, popular] = await Promise.all([
      // New Releases - by creation date (if not admin selected)
      adminSelected.newReleases.length > 0 ? 
        Promise.resolve({ docs: [] }) : 
        getDocs(query(
          collection(db, 'novels'),
          orderBy('metadata.createdAt', 'desc'),
          limit(5)
        )),
      // Trending - by views (if not admin selected)
      adminSelected.trending.length > 0 ? 
        Promise.resolve({ docs: [] }) : 
        getDocs(query(
          collection(db, 'novels'),
          orderBy('views', 'desc'),
          limit(5)
        )),
      // Popular - by rating (if not admin selected)
      adminSelected.popular.length > 0 ? 
        Promise.resolve({ docs: [] }) : 
        getDocs(query(
          collection(db, 'novels'),
          orderBy('rating', 'desc'),
          limit(5)
        ))
    ]);

    const mapDocToNovel = (doc: any) => ({
      novelId: doc.id,
      ...doc.data(),
      genres: doc.data().genres || [],
      author: doc.data().publishers?.original || 'Unknown'
    } as Novel);

    return {
      newReleases: adminSelected.newReleases.length > 0 ? 
        adminSelected.newReleases : newReleases.docs.map(mapDocToNovel),
      trending: adminSelected.trending.length > 0 ? 
        adminSelected.trending : trending.docs.map(mapDocToNovel),
      popular: adminSelected.popular.length > 0 ? 
        adminSelected.popular : popular.docs.map(mapDocToNovel)
    };
  } catch (error) {
    console.error('Error fetching ranking novels:', error);
    return {
      newReleases: [],
      trending: [],
      popular: []
    };
  }
};

export default function ModernLightNovelsHomepage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const [popularNovels, setPopularNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true) // New state for tracking all data loading
  const { user } = useAuth()
  const router = useRouter()
  const [followedNovels, setFollowedNovels] = useState<string[]>([])
  const [userType, setUserType] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ profilePicture: string, username: string } | null>(null)
  const [latestNovels, setLatestNovels] = useState<Novel[]>([])
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [autoSlideInterval, setAutoSlideInterval] = useState<NodeJS.Timeout | null>(null);
  const [editorsPicks, setEditorsPicks] = useState<Novel[]>([])
  const [recommendedNovels, setRecommendedNovels] = useState<Array<any>>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  
  // Add ranking novels state
  const [rankingNovels, setRankingNovels] = useState<{
    newReleases: Novel[];
    trending: Novel[];
    popular: Novel[];
  }>({
    newReleases: [],
    trending: [],
    popular: []
  });

  useEffect(() => {
    // Track page view when component mounts
    trackPageView('Home');
  }, []);

  // Track section views
  useEffect(() => {
    if (activeSection) {
      trackSectionView(activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['trending', 'latest', 'popular'];
      const scrollPosition = window.scrollY + 100; // offset for header

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });

      // Track navigation event
      trackNavigation(id);
    }
  };

  useEffect(() => {
    setMounted(true)
    
    const loadNovels = async () => {
      setLoading(true)
      setDataLoading(true)
      try {
        const [popular, latest, editors, recommended, announcementsData, ranking] = await Promise.all([
          fetchPopularNovels(),
          fetchLatestNovels(),
          fetchEditorsPicks(),
          fetchRecommendedNovels(),
          fetchAnnouncements(),
          fetchRankingNovels()
        ])
        console.log('Latest Novels:', latest)
        console.log('Editors Picks:', editors)
        console.log('Ranking Novels:', ranking)
        setPopularNovels(popular)
        setLatestNovels(latest)
        setEditorsPicks(editors)
        setRecommendedNovels(recommended)
        setAnnouncements(announcementsData)
        setRankingNovels(ranking)
      } catch (error) {
        console.error('Error fetching novels:', error)
      }
      setLoading(false)
      
      // Keep data loading true for a minimum time to ensure smooth transition
      setTimeout(() => {
        setDataLoading(false)
        setShowLoader(false)
      }, 1000) // Show for at least 1 second after data loads
    }

    loadNovels()
    if (user) {
      fetchFollowedNovels()
      fetchUserType()
      fetchUserProfile()
    }
  }, [user])

  useEffect(() => {
    const filteredNovels = popularNovels.filter(novel => novel.coverPhoto && novel.title).slice(0, 5);
    if (filteredNovels.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide(current => 
        current < filteredNovels.length - 1 ? current + 1 : 0
      );
    }, 5000); // Change slide every 5 seconds

    setAutoSlideInterval(interval);

    return () => {
      if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
      }
    };
  }, [popularNovels]);

  const toggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    trackThemeChange(newTheme);
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
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchFollowedNovels = async () => {
    if (!user) return
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setFollowedNovels(userData.followedNovels || [])
      }
    } catch (error) {
      console.error('Error fetching followed novels:', error)
    }
  }

  const fetchUserType = async () => {
    if (!user) return
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserType(userData.userType || null)
      }
    } catch (error) {
      console.error('Error fetching user type:', error)
    }
  }

  const handleFollowChange = (novelId: string, isFollowing: boolean) => {
    setFollowedNovels(prev => 
      isFollowing ? [...prev, novelId] : prev.filter(id => id !== novelId)
    )
  }

  const handleLogout = async () => {
    try {
      trackUserAction('logout');
      await signOut(auth)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  }

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
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

  const fetchAnnouncements = async () => {
    const q = query(
      collection(db, 'forumPosts'),
      where('section', '==', 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Announcement))
  }

  const handleFollowNovel = async (novelId: string) => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const currentFollowed = userDoc.data()?.followedNovels || [];
    
    if (currentFollowed.includes(novelId)) {
      // Unfollow
      await updateDoc(userRef, {
        followedNovels: arrayRemove(novelId)
      });
      trackNovelInteraction('unfollow', novelId);
    } else {
      // Follow
      await updateDoc(userRef, {
        followedNovels: arrayUnion(novelId)
      });
      trackNovelInteraction('follow', novelId);
    }
    
    // Update local state
    await fetchFollowedNovels();
  };

  const NavButton = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => {
    const isActive = activeSection === id;
    return (
      <button 
        onClick={() => scrollToSection(id)} 
        className={`flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-full w-full sm:w-auto transition-colors duration-200
          ${isActive 
            ? 'text-[#F1592A] bg-[#F1592A]/10' 
            : 'text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] hover:bg-[#F1592A]/5'
          }`}
      >
        <Icon className={`w-5 h-5 sm:w-4 sm:h-4 transition-transform duration-200 ${
          isActive ? 'scale-110' : ''
        } ${
          id === 'trending' && isActive ? 'text-orange-500' : ''
        } ${
          id === 'latest' && isActive ? 'text-blue-500' : ''
        } ${
          id === 'popular' && isActive ? 'text-yellow-500' : ''
        }`} />
        <span className={`${isActive ? 'font-medium' : ''} text-base sm:text-sm`}>{label}</span>
      </button>
    );
  };

  // Track novel clicks
  const trackNovelClick = (novelId: string, title: string) => {
    trackNovelInteraction('click', novelId, title);
  };

  return (
    <motion.div 
      className={`flex flex-col min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-[#E7E7E8] dark:bg-[#232120]`}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <AnimatePresence>
        {(showLoader || dataLoading) && <InitialLoader />}
      </AnimatePresence>
      
      {!dataLoading && (
        <>
          <header className="border-b dark:border-[#3E3F3E] bg-[#E7E7E8] dark:bg-[#232120] sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                {/* Logo and Navigation */}
                <div className="flex items-center gap-8">
                  <Link href="/" onClick={scrollToTop} className="flex-shrink-0">
                    <Image
                      src="/assets/favicon.png"
                      alt="Novellize"
                      width={40}
                      height={40}
                      className="hover:opacity-90 transition-opacity"
                    />
                  </Link>

                  {/* Desktop Navigation */}
                  <nav className="hidden lg:flex items-center space-x-2">
                    <NavButton id="trending" icon={Flame} label="Trending" />
                    <NavButton id="latest" icon={Sparkles} label="Latest" />
                    <NavButton id="popular" icon={Crown} label="Popular" />
                    <Link 
                      href="/browse" 
                      className="relative group"
                    >
                      <Button
                        variant="outline"
                        className="rounded-full border-2 border-[#3B82F6] border-opacity-50 bg-[#E7E7E8] dark:bg-[#232120] group px-4 gap-2
                           transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#93C5FD] opacity-100 animate-gradient-x transition-opacity duration-500"></div>
                        <BookOpen className="h-4 w-4 text-white transform rotate-0 animate-rotate transition-transform duration-500" />
                        <span className="text-white drop-shadow-md">Browse All</span>
                        <div className="absolute inset-0 border-2 border-transparent border-[#3B82F6] rounded-full animate-pulse"></div>
                      </Button>
                    </Link>
                  </nav>
                </div>

                {/* Search and Actions */}
                <div className="flex items-center gap-4">
                  {/* Desktop Search */}
                  <div className="hidden lg:flex relative w-[300px]">
                    <Input
                      type="text"
                      placeholder="Search novels..."
                      className="pl-10 pr-4 py-2 w-full bg-white dark:bg-[#2A2827] border-[#F1592A] border-opacity-50 rounded-full focus-visible:ring-[#F1592A]"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const searchTerm = (e.target as HTMLInputElement).value;
                          // Perform search or redirect to search page
                          router.push(`/browse?search=${encodeURIComponent(searchTerm)}`);
                          // Track search
                          trackUserAction('search', { search_term: searchTerm });
                        }
                      }}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  <ThemeToggle />

                  {/* Desktop Forum and Library Buttons */}
                  <div className="hidden md:flex gap-2">
                    <Link href="/forum">
                      <Button
                        variant="outline"
                        className="rounded-full border-2 border-[#F1592A] border-opacity-50 bg-[#E7E7E8] dark:bg-[#232120] group px-4 gap-2
                           transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A] via-[#FF6B6B] to-[#FF8C94] opacity-100 animate-gradient-x transition-opacity duration-500"></div>
                        <MessageSquare className="h-4 w-4 text-white transform rotate-0 animate-rotate transition-transform duration-500" />
                        <span className="text-white drop-shadow-md">Forum</span>
                        <div className="absolute inset-0 border-2 border-transparent border-[#F1592A] rounded-full animate-pulse"></div>
                      </Button>
                    </Link>

                    <Link href="/user_profile">
                      <Button
                        variant="outline"
                        className="rounded-full border-2 border-[#F1592A] border-opacity-50 bg-[#E7E7E8] dark:bg-[#232120] group px-4 gap-2
                           hover:bg-[#F1592A] hover:text-white transition-all duration-300"
                      >
                        <Library className="h-4 w-4" />
                        <span>Library</span>
                      </Button>
                    </Link>
                  </div>

                  {/* User Menu */}
                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Avatar>
                          <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                          <AvatarFallback>{userProfile?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 p-0 bg-[#1E1E24] border-[#2A2A30] text-white shadow-xl" align="end">
                        {/* User Header Section */}
                        <div className="p-4 bg-[#1E1E24]">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14 border-2 border-[#F1592A]">
                              <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                              <AvatarFallback className="bg-[#2A2A30] text-[#F1592A]">{userProfile?.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold">{userProfile?.username || "Username"}</p>
                                {userType === 'admin' && (
                                  <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded text-white">A</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{user.email}</p>
                              
                              {/* Points Display - Removed coin icon, kept only heart */}
                              <div className="flex items-center mt-1">
                                <div className="flex items-center gap-1">
                                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                    <span className="text-xs">♥</span>
                                  </div>
                                  <span className="text-sm">1</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Get More Button - Removed */}
                          
                        </div>
                        
                        {/* Membership Banner - changed to Welcome Message */}
                        <div className="mx-3 my-3 bg-[#2A2A30] rounded-lg overflow-hidden">
                          <div className="p-3 relative">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-sm font-medium">Welcome to Novellize!</h3>
                                <p className="text-xs text-gray-400">Your home for web novels</p>
                              </div>
                              <Button 
                                className="bg-[#F1592A] hover:bg-[#E44D1F] text-white text-xs rounded-md px-3 h-7"
                                onClick={() => router.push('/browse')}
                              >
                                EXPLORE
                              </Button>
                            </div>
                            
                            {/* Background Icon */}
                            <div className="absolute right-2 bottom-0 opacity-20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="px-1 py-2">
                          <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white" onClick={() => router.push('/user_profile')}>
                            <User className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white" onClick={() => router.push('/browse')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8" />
                              <path d="M3 16.2V21m0-4.8V21h4.8" />
                              <path d="M21 7.8V3m0 4.8V3h-4.8" />
                              <path d="M3 7.8V3m0 4.8V3h4.8" />
                            </svg>
                            <span>Browse All</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
                              <polyline points="15,9 18,9 18,11" />
                              <path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2v0" />
                              <line x1="6" y1="10" x2="7" y2="10" />
                            </svg>
                            <span>Inbox</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-[#2A2A30]" />
                          
                          {userType === 'admin' && (
                            <>
                              <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white" onClick={() => router.push('/admin')}>
                                <ChevronsLeftRight className="mr-2 h-4 w-4" />
                                <span>Admin Console</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#2A2A30]" />
                            </>
                          )}
                          
                          {userType === 'author' && (
                            <>
                              <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white" onClick={() => router.push('/admin')}>
                                <ChevronsLeftRight className="mr-2 h-4 w-4" />
                                <span>Author Console</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#2A2A30]" />
                            </>
                          )}
                          
                          <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                          </DropdownMenuItem>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button variant="ghost" onClick={() => router.push('/auth')} className="text-[#F1592A]">
                      Login
                    </Button>
                  )}

                  {/* Mobile Menu Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ? (
                      <X className="h-6 w-6 text-[#232120] dark:text-[#E7E7E8]" />
                    ) : (
                      <Menu className="h-6 w-6 text-[#232120] dark:text-[#E7E7E8]" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-grow">
            <Toaster position="top-center" />
            
            <section className="relative py-6 overflow-hidden">
              {/* Hero Section with Background */}
              <div className="absolute inset-0 z-0">
                <Image
                  src="/assets/hero-section.jpg"
                  alt="Background"
                  fill
                  className="object-cover blur-lg brightness-75 [mask-image:linear-gradient(to_bottom,rgba(241,89,42,0.3),rgba(0,0,0,0.5))]"
                  priority
                  style={{
                    backgroundColor: 'rgba(241, 89, 42, 0.3)',
                    mixBlendMode: 'multiply'
                  }}
                />
              </div>

              {/* Hero Content */}
              <div className="container mx-auto px-6 sm:px-8 relative z-2">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                  {/* Left column: Logo and Brand */}
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-start space-y-4">
                    <div className="flex items-center gap-4">
                      <Image
                        src="/assets/favicon.png"
                        alt="Company Logo"
                        width={120}
                        height={120}
                        className="md:w-[140px] md:h-[140px] p-2"
                        priority
                      />
                      <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#F1592A] rounded-md bg-opacity-60 bg-gray-200 dark:bg-opacity-60 dark:bg-[#232120] pb-2 pt-1 px-3">
                        Novellize
                      </h1>
                    </div>
                  </div>

                  {/* Right column: Company Description */}
                  <div className="w-full md:w-1/2 dark:text-[#E7E7E8] text-[#232120] space-y-3 md:space-y-4">
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold dark:text-[#E7E7E8] text-[#232120] text-center md:text-left">
                      Discover Your Next Adventure
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg dark:text-[#E7E7E8] text-[#232120] text-center md:text-left">
                      Welcome to Novellize, your ultimate destination for discovering and exploring a vast collection of web novels from diverse genres and authors worldwide. 
                    </p>
                    <p className="text-sm sm:text-base md:text-lg dark:text-[#E7E7E8] text-[#232120] text-center md:text-left">
                      As a dedicated repository, we aim to connect readers and writers by providing a platform that celebrates creativity, storytelling, and imagination.
                    </p>

                    {/* CTA Buttons Container - Responsive Layout */}
                    <div className="flex flex-col w-full gap-4 pt-4">
                      {/* Desktop Buttons */}
                      <div className="hidden md:flex items-center gap-4">
                        {/* Forum Button */}
                        <Link 
                          href="/forum"
                          className="group flex items-center gap-2 px-5 py-2.5 bg-[#F1592A] 
                            rounded-full text-white text-sm font-medium
                            hover:bg-[#e44d1f] transition-all duration-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          Forum
                        </Link>

                        {/* Author Access Button */}
                        <button 
                          onClick={() => {
                            const authorSection = document.getElementById('author-request-section');
                            if (authorSection) {
                              authorSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="group flex items-center gap-2 px-5 py-2.5 
                            bg-transparent border border-[#232120] dark:border-[#E7E7E8]
                            rounded-full text-[#232120] dark:text-[#E7E7E8] text-sm font-medium
                            hover:bg-[#232120] hover:text-white dark:hover:bg-[#E7E7E8] dark:hover:text-[#232120] 
                            transition-all duration-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Author Access
                        </button>

                        {/* Browse Button with Expansion */}
                        <Link 
                          href="/browse"
                          className="group relative flex items-center justify-center w-10 h-10 
                            bg-[#232120] dark:bg-[#E7E7E8] rounded-full
                            hover:w-32 transition-all duration-300 overflow-hidden">
                          <span className="absolute left-3 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white dark:text-[#232120]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </span>
                          <span className="absolute left-10 text-sm font-medium text-white dark:text-[#232120] 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                            Browse All
                          </span>
                        </Link>
                      </div>

                      {/* Mobile Buttons */}
                      <div className="flex flex-col md:hidden gap-3">
                        <Link 
                          href="/forum"
                          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F1592A] 
                            rounded-full text-white text-sm font-medium
                            hover:bg-[#e44d1f] transition-all duration-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          Forum
                        </Link>
                        <button 
                          onClick={() => {
                            const authorSection = document.getElementById('author-request-section');
                            if (authorSection) {
                              authorSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 
                            bg-transparent border border-[#232120] dark:border-[#E7E7E8]
                            rounded-full text-[#232120] dark:text-[#E7E7E8] text-sm font-medium
                            hover:bg-[#232120] hover:text-white dark:hover:bg-[#E7E7E8] dark:hover:text-[#232120] 
                            transition-all duration-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Author Access
                        </button>
                        <Link 
                          href="/browse"
                          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 
                            bg-[#232120] dark:bg-[#E7E7E8] 
                            rounded-full text-white dark:text-[#232120] text-sm font-medium
                            hover:opacity-90 transition-all duration-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Browse All
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Hero Carousel Section */}
            <HeroCarousel loading={dataLoading} />

            {/* Trending Section */}
            <section id="trending" className="">
              <NovelRankings
                newReleases={rankingNovels.newReleases}
                trending={rankingNovels.trending}
                popular={rankingNovels.popular}
                loading={dataLoading}
              />
            </section>

            {/* Weekly Books Section */}
            <section className="">
              <WeeklyBookSection 
                popularNovels={popularNovels} 
                announcements={announcements} 
              />
            </section>

            {/* Latest Releases Section */}
            <section id="latest" className="">
              <TopReleasesSection
                latestNovels={latestNovels}
                editorsPicks={editorsPicks}
                loading={loading}
              />
            </section>

            {/* Popular Section */}
            <section id="popular" className="py-1 bg-[#232120] text-center">
              <h1 className="text-4xl font-extrabold gradient-text cool-underline floating inline-block">
                Our Popular
              </h1>
              <div className="space-y-8">
                <LatestReleasesCarousel
                  title="Novel Popular"
                  novels={latestNovels}
                  loading={loading}
                  onFollowChange={handleFollowChange}
                />
                {/* <LatestReleasesCarousel
                  title="Manga Popular"
                  novels={latestNovels}
                  loading={loading}
                  onFollowChange={handleFollowChange}
                /> */}
              </div>
            </section>

            {/* You May Also Like Section */}
            <section className="">
              <YouMayAlsoLikeSection 
                novels={recommendedNovels as RecommendedNovel[]}
                onFollowNovel={handleFollowNovel}
                userFollowedNovels={followedNovels}
              />
            </section>

            {/* Author Request Section */}
            <section id="author-request-section">   <AuthorRequestSection /></section>
         

            {/* FAQ Section */}
            <FAQSection />

            {/* Explore Genres Section */}
            <section className="py-1 bg-white dark:bg-[#232120] relative overflow-hidden">
              {/* Circuit-like background patterns */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute w-full h-full">
                  <motion.div
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                      background: `
                        linear-gradient(90deg, transparent 95%, rgba(241, 89, 42, 0.1) 95%),
                        linear-gradient(transparent 95%, rgba(241, 89, 42, 0.1) 95%)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                    animate={{
                      backgroundPosition: ['0px 0px', '20px 20px'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>
              </div>

              <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-12">
                  <motion.h2 
                    className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F1592A] via-[#FF8C94] to-[#F1592A] mb-6"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    Explore Genres
                  </motion.h2>
                  <p className="text-xl md:text-2xl text-[#232120] dark:text-[#E7E7E8] max-w-2xl mx-auto">
                    Dive into our diverse collection of stories across multiple genres
                  </p>
                </div>

                <motion.div 
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
                  variants={staggerChildren}
                >
                  {Object.entries(genreColors).map(([genre, colors], index) => (
                    <motion.div
                      key={genre}
                      variants={fadeIn}
                      className="group relative"
                      whileHover={{ scale: 1.02 }}
                      animate={{
                        y: [0, index % 2 ? 4 : -4, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.1,
                      }}
                    >
                      <Link 
                        href={`/browse?selectedGenres=${encodeURIComponent(genre)}`}
                        className="block relative"
                      >
                        {/* Neomorphic base */}
                        <div className={`
                          relative rounded-3xl
                          bg-white dark:bg-[#2A2827]
                          shadow-[4px_4px_10px_#d1d1d1,-4px_-4px_10px_#ffffff] 
                          dark:shadow-[4px_4px_10px_#1a1918,-4px_-4px_10px_#3a3836]
                          transition-all duration-300
                          group-hover:shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]
                          dark:group-hover:shadow-[8px_8px_16px_#1a1918,-8px_-8px_16px_#3a3836]
                          overflow-hidden
                        `}>
                          {/* Glowing border effect */}
                          <motion.div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100"
                            animate={{
                              background: [
                                'radial-gradient(circle at 0% 0%, rgba(241, 89, 42, 0.5) 0%, transparent 50%)',
                                'radial-gradient(circle at 100% 100%, rgba(241, 89, 42, 0.5) 0%, transparent 50%)',
                                'radial-gradient(circle at 0% 0%, rgba(241, 89, 42, 0.5) 0%, transparent 50%)',
                              ]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                          />

                          {/* Content */}
                          <div className="relative p-4">
                            <div className="flex items-center justify-between">
                              <motion.div 
                                className="flex items-center space-x-2"
                                animate={{
                                  x: [0, 2, 0],
                                }}
                                transition={{
                                  duration: 0.3,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  ease: "easeInOut"
                                }}
                              >
                                {/* Cyber dot */}
                                <motion.div
                                  className="w-2 h-2 rounded-full bg-[#F1592A]"
                                  animate={{
                                    opacity: [1, 0.5, 1],
                                    scale: [1, 1.2, 1]
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    ease: "easeInOut"
                                  }}
                                />
                                <span className={`
                                  text-sm font-bold
                                  bg-clip-text text-transparent
                                  bg-gradient-to-r
                                  ${index % 4 === 0 ? 'from-[#F1592A] to-[#FF8C94]' : ''}
                                  ${index % 4 === 1 ? 'from-[#FF8C94] to-[#F1592A]' : ''}
                                  ${index % 4 === 2 ? 'from-[#F1592A] to-[#FF6B6B]' : ''}
                                  ${index % 4 === 3 ? 'from-[#FF6B6B] to-[#F1592A]' : ''}
                                `}>
                                  {genre}
                                </span>
                              </motion.div>

                              {/* Robotic arrow */}
                              <motion.div
                                className="text-[#F1592A] opacity-0 group-hover:opacity-100"
                                animate={{
                                  x: [-5, 0],
                                  rotate: [0, 90, 180, 270, 360],
                                }}
                                transition={{
                                  x: { duration: 0.2 },
                                  rotate: { 
                                    duration: 1,
                                    ease: "linear"
                                  }
                                }}
                              >
                                →
                              </motion.div>
                            </div>

                            {/* Tech lines */}
                            <motion.div
                              className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F1592A] to-transparent"
                              animate={{
                                scaleX: [0, 1, 0],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: index * 0.1
                              }}
                            />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </section>
          </main>

          <footer className="border-t py-1 bg-white dark:bg-[#232120] dark:border-[#3E3F3E]">
            <div className="container mx-auto px-4">
              {/* Marketing Disclaimer */}
              <motion.div 
                className="text-center py-4 border-b border-gray-200 dark:border-[#3E3F3E] mb-4"
                variants={fadeIn}
              >
                <p className="text-sm text-[#464646] dark:text-[#C3C3C3] max-w-4xl mx-auto">
                  <strong>Please Note:</strong> All content displayed on this website is for promotional and marketing purposes only. 
                  Authors and content creators interested in accessing our publishing portal to manage, edit, or upload their works 
                  should reach out to us directly. We provide comprehensive tools and administrative capabilities for verified authors 
                  to control their content and engage with their readership.
                </p>
              </motion.div>

              <div className="md:flex md:items-center md:justify-between">
                <motion.div 
                  className="text-center md:text-left mb-4 md:mb-0"
                  variants={fadeIn}
                >
                  <p className="text-sm text-[#464646] dark:text-[#C3C3C3]">
                    © 2024 Novellize. All rights reserved.
                  </p>
                </motion.div>
                <motion.nav 
                  className="flex justify-center md:justify-end space-x-4 md:space-x-6"
                  variants={staggerChildren}
                >
                  {["About Us", "Terms", "Privacy", "Contact"].map((item) => (
                    <motion.div key={item} variants={fadeIn}>
                      <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-sm text-[#464646] hover:text-[#232120] dark:text-[#C3C3C3] dark:hover:text-[#E7E7E8] transition-colors duration-200">
                        {item}
                      </Link>
                    </motion.div>
                  ))}
                </motion.nav>
              </div>
            </div>
          </footer>
        </>
      )}
    </motion.div>
  )
}

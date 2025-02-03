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
  X
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './authcontext'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
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
      return data.slice(0, 10)
    }
  }

  // If cache is invalid or expired, fetch from Firestore
  const q = query(collection(db, 'novels'), orderBy('rating', 'desc'), limit(10))
  const querySnapshot = await getDocs(q)
  const novels = querySnapshot.docs.map(doc => ({ 
    novelId: doc.id, 
    ...doc.data(),
    genres: doc.data().genres || [],
    author: doc.data().publishers?.original || 'Unknown'
  } as Novel)).slice(0, 10)

  // Cache the fetched data
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data: novels, timestamp: Date.now() }))

  return novels
}

const fetchLatestNovels = async () => {
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
  } as Novel)).slice(0, 10)

  // Cache the fetched data
  localStorage.setItem(LATEST_CACHE_KEY, JSON.stringify({ 
    data: novels, 
    timestamp: Date.now() 
  }))

  return novels
}

const fetchEditorsPicks = async () => {
  // For now, just get the latest 6 novels
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

export default function ModernLightNovelsHomepage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const [popularNovels, setPopularNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
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
    }
  };

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setShowLoader(false)
    }, 2000) // Show loader for 2 seconds

    const loadNovels = async () => {
      setLoading(true)
      try {
        const [popular, latest, editors, recommended] = await Promise.all([
          fetchPopularNovels(),
          fetchLatestNovels(),
          fetchEditorsPicks(),
          fetchRecommendedNovels()
        ])
        console.log('Latest Novels:', latest)
        console.log('Editors Picks:', editors)
        setPopularNovels(popular)
        setLatestNovels(latest)
        setEditorsPicks(editors)
        setRecommendedNovels(recommended)
      } catch (error) {
        console.error('Error fetching novels:', error)
      }
      setLoading(false)
    }

    loadNovels()
    if (user) {
      fetchFollowedNovels()
      fetchUserType()
      fetchUserProfile()
    }

    return () => clearTimeout(timer)
  }, [user])

  useEffect(() => {
    const loadAnnouncements = async () => {
      const data = await fetchAnnouncements()
      setAnnouncements(data)
    }
    loadAnnouncements()
  }, [])

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
    setTheme(theme === 'dark' ? 'light' : 'dark')
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
    } else {
      // Follow
      await updateDoc(userRef, {
        followedNovels: arrayUnion(novelId)
      });
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

  return (
    <motion.div 
      className={`flex flex-col min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-[#E7E7E8] dark:bg-[#232120]`}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <AnimatePresence>
        {showLoader && <InitialLoader />}
      </AnimatePresence>
      
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
                  className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse All</span>
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
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <ThemeToggle />

              {/* Desktop Forum Button */}
              <Link href="/forum" className="hidden md:block">
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

              {/* User Menu */}
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
                    {userType === 'author' && (
                      <>
                        <DropdownMenuItem onClick={() => router.push('/admin')}>
                          <ChevronsLeftRight className="mr-2 h-4 w-4" />
                          <span>Author Console</span>
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

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 py-6">
              <div className="flex flex-col space-y-5 px-4">
                {/* Mobile Search */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search novels..."
                    className="pl-10 pr-4 py-2.5 w-full bg-white dark:bg-[#2A2827] border-[#F1592A] border-opacity-50 rounded-full focus-visible:ring-[#F1592A]"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {/* Mobile Navigation */}
                <div className="flex flex-col space-y-4">
                  <NavButton id="trending" icon={Flame} label="Trending" />
                  <NavButton id="latest" icon={Sparkles} label="Latest" />
                  <NavButton id="popular" icon={Crown} label="Popular" />
                  <Link 
                    href="/browse" 
                    className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-2.5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Browse All</span>
                  </Link>
                  <Link 
                    href="/forum" 
                    className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-2.5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Forum</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <section className="relative py-12 md:py-16 lg:py-24 overflow-hidden">
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
          <div className="container mx-auto px-4 sm:px-6 relative z-2">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
              {/* Left column: Logo and Brand */}
              <div className="w-full md:w-1/2 flex flex-col items-center md:items-start space-y-6">
                <Image
                  src="/assets/favicon.png"
                  alt="Company Logo"
                  width={200}
                  height={200}
                  className="md:w-[300px] md:h-[300px] p-2"
                  priority
                />
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#F1592A] text-center md:text-left rounded-md bg-opacity-60 bg-gray-200 dark:bg-opacity-60 dark:bg-[#232120] pb-2 pt-1 px-3">
                  Novellize
                </h1>
              </div>

              {/* Right column: Company Description */}
              <div className="w-full md:w-1/2 dark:text-[#E7E7E8] text-[#232120] space-y-4 md:space-y-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold dark:text-[#E7E7E8] text-[#232120] text-center md:text-left">
                  Discover Your Next Adventure
                </h2>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl dark:text-[#E7E7E8] text-[#232120] text-center md:text-left">
                  Welcome to Novellize, your ultimate destination for discovering and exploring a vast collection of web novels from diverse genres and authors worldwide. 
                </p>
                <p className="text-sm sm:text-base md:text-lg dark:text-[#E7E7E8] text-[#232120] text-center md:text-left">
                  As a dedicated repository, we aim to connect readers and writers by providing a platform that celebrates creativity, storytelling, and imagination.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <section id="trending" className="">
          <NovelRankings
            newReleases={latestNovels}
            trending={popularNovels}
            popular={popularNovels}
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
        <section id="popular" className="py-8 bg-[#232120] text-center">
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
            <LatestReleasesCarousel
              title="Manga Popular"
              novels={latestNovels}
              loading={loading}
              onFollowChange={handleFollowChange}
            />
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

        {/* Explore Genres Section */}
        <section className="py-12 md:py-16 bg-white dark:bg-[#232120] relative overflow-hidden">
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

      <footer className="border-t py-6 md:py-8 bg-white dark:bg-[#232120] dark:border-[#3E3F3E]">
        <div className="container mx-auto px-4 md:flex md:items-center md:justify-between">
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
      </footer>
    </motion.div>
  )
}

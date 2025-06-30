'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Moon, Sun, LogOut, User, Home, BookOpen, ExternalLink, Calendar, Filter, Grid, List, Tag, Clock, Eye, Heart, Share2, Menu, X, Library, Download, Star, Bookmark, ChevronRight, ChevronLeft, TrendingUp, Award, Users, Zap, Target, Lightbulb, Rocket, MessageSquare } from "lucide-react"
import Link from "next/link"
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../authcontext'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
import { collection, query, orderBy, getDocs, where, Timestamp, updateDoc, doc, arrayUnion, arrayRemove, limit } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'react-hot-toast'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Resource {
  id: string
  title: string
  description: string
  content: string
  type: 'blog' | 'link' | 'guide' | 'tool' | 'template'
  category: string
  tags: string[]
  author: string
  authorId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  externalUrl?: string
  downloadUrl?: string
  featured: boolean
  views: number
  likes: string[]
  bookmarks: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadTime: number
  image?: string
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative w-12 h-12 rounded-2xl border border-white/20 dark:border-slate-700/50 
        bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm
        hover:bg-white/70 dark:hover:bg-slate-800/70 
        hover:border-[#F1592A]/30 hover:shadow-lg hover:shadow-[#F1592A]/10
        transition-all duration-300 group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/10 to-[#D14820]/10 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-amber-500 drop-shadow-sm" />
        ) : (
          <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        )}
      </div>
    </Button>
  )
}

// Resource Carousel Component
const ResourceCarousel = ({ title, resources, icon: Icon }: {
  title: string
  resources: Resource[]
  icon: any
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerView = 3

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev + itemsPerView >= resources.length ? 0 : prev + itemsPerView
    )
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev - itemsPerView < 0 ? Math.max(0, resources.length - itemsPerView) : prev - itemsPerView
    )
  }

  const visibleResources = resources.slice(currentIndex, currentIndex + itemsPerView)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#F1592A]/20 to-[#D14820]/20 rounded-xl">
            <Icon className="h-6 w-6 text-[#F1592A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#232120] dark:text-[#E7E7E8]">{title}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="h-10 w-10 rounded-full border-[#F1592A]/30 hover:bg-[#F1592A]/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            disabled={currentIndex + itemsPerView >= resources.length}
            className="h-10 w-10 rounded-full border-[#F1592A]/30 hover:bg-[#F1592A]/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleResources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onLike={() => {}}
            onBookmark={() => {}}
            isLiked={false}
            isBookmarked={false}
            viewMode="grid"
          />
        ))}
      </div>
    </div>
  )
}

// Stats Section Component
const StatsSection = () => {
  const stats = [
    { icon: BookOpen, label: "Total Resources", value: "150+", color: "from-blue-500 to-blue-600" },
    { icon: Users, label: "Active Authors", value: "2.5K", color: "from-green-500 to-green-600" },
    { icon: Eye, label: "Monthly Views", value: "45K", color: "from-purple-500 to-purple-600" },
    { icon: Award, label: "Expert Guides", value: "25", color: "from-orange-500 to-orange-600" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="text-center"
        >
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} mb-4`}>
            <stat.icon className="h-8 w-8 text-white" />
          </div>
          <div className="text-2xl font-bold text-[#232120] dark:text-[#E7E7E8] mb-1">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Categories Grid Component
const CategoriesGrid = () => {
  const categories = [
    { name: "Writing Techniques", icon: Lightbulb, count: 25, color: "from-yellow-500 to-orange-500" },
    { name: "Character Development", icon: Users, count: 18, color: "from-purple-500 to-pink-500" },
    { name: "Plot Structure", icon: Target, count: 15, color: "from-blue-500 to-cyan-500" },
    { name: "World Building", icon: Zap, count: 12, color: "from-green-500 to-teal-500" },
    { name: "Publishing", icon: Rocket, count: 20, color: "from-red-500 to-pink-500" },
    { name: "Marketing", icon: TrendingUp, count: 16, color: "from-indigo-500 to-purple-500" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category, index) => (
        <motion.div
          key={category.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="group cursor-pointer"
        >
          <Card className="h-full bg-[#E7E7E8]/50 dark:bg-[#232120]/50 border-white/20 dark:border-slate-700/50 
            hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-6 text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-[#232120] dark:text-[#E7E7E8] mb-1 text-sm">
                {category.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {category.count} resources
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

const AnimatedPattern = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]">
      <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="30" cy="30" r="2" fill="currentColor" opacity="0.3" />
          </pattern>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    </div>
    
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div className="absolute w-32 h-32 top-20 left-[10%] bg-gradient-to-br from-[#F1592A]/8 to-[#D14820]/8 
        rounded-2xl rotate-12 animate-float" />
      <div className="absolute w-24 h-24 top-40 right-[15%] bg-gradient-to-br from-[#D14820]/6 to-[#F1592A]/6 
        rounded-full animate-float-delayed" />
      <div className="absolute w-40 h-40 bottom-32 left-[20%] bg-gradient-to-br from-[#F1592A]/4 to-transparent 
        rounded-3xl rotate-45 animate-float-slow" />
      <div className="absolute w-16 h-16 bottom-20 right-[25%] bg-gradient-to-br from-[#D14820]/10 to-[#F1592A]/10 
        rounded-lg rotate-45 animate-pulse" />
    </div>
    
    <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/[0.02] via-transparent to-[#D14820]/[0.02]" />
  </div>
);

const ResourceCard = ({ resource, onLike, onBookmark, isLiked, isBookmarked, viewMode }: {
  resource: Resource
  onLike: (resourceId: string) => void
  onBookmark: (resourceId: string) => void
  isLiked: boolean
  isBookmarked: boolean
  viewMode?: 'grid' | 'list'
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog': return <BookOpen className="h-4 w-4" />
      case 'link': return <ExternalLink className="h-4 w-4" />
      case 'guide': return <Library className="h-4 w-4" />
      case 'tool': return <Star className="h-4 w-4" />
      case 'template': return <Download className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      <Card className="h-full bg-white/5 dark:bg-slate-900/50 border-white/10 dark:border-slate-800/50 
        backdrop-blur-sm hover:bg-white/10 dark:hover:bg-slate-900/70 
        hover:border-[#F1592A]/30 transition-all duration-300 overflow-hidden">
        
        {resource.featured && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white border-0">
              Featured
            </Badge>
          </div>
        )}

        {resource.image && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={resource.image}
              alt={resource.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[#F1592A]">
              {getTypeIcon(resource.type)}
              <span className="text-sm font-medium capitalize">{resource.type}</span>
            </div>
            <Badge className={`text-xs ${getDifficultyColor(resource.difficulty)}`}>
              {resource.difficulty}
            </Badge>
          </div>
          
          <CardTitle className="text-lg font-bold text-white group-hover:text-[#F1592A] 
            transition-colors duration-300 line-clamp-2">
            {resource.title}
          </CardTitle>
          
          <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
            {resource.description}
          </p>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 mb-4">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-[#F1592A]/10 text-[#F1592A] 
                border-[#F1592A]/30 hover:bg-[#F1592A]/20">
                {tag}
              </Badge>
            ))}
            {resource.tags.length > 3 && (
              <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/30">
                +{resource.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{resource.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{resource.estimatedReadTime} min</span>
              </div>
            </div>
            <span className="text-xs">
              {resource.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onLike(resource.id)}
                className={`h-8 px-3 ${isLiked ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'}`}
              >
                <Heart className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                {resource.likes.length}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onBookmark(resource.id)}
                className={`h-8 px-3 ${isBookmarked ? 'text-[#F1592A] hover:text-[#D14820]' : 'text-gray-400 hover:text-white'}`}
              >
                <Bookmark className={`h-3 w-3 mr-1 ${isBookmarked ? 'fill-current' : ''}`} />
                {resource.bookmarks.length}
              </Button>
            </div>

            <Button
              size="sm"
              className="bg-gradient-to-r from-[#F1592A] to-[#D14820] hover:from-[#D14820] to-[#F1592A] 
                text-white border-0 h-8 px-4"
              asChild
            >
              <Link href={resource.externalUrl || `/forum/resources/${resource.id}`}>
                {resource.type === 'link' ? 'Visit' : 'Read'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const FeaturedResourceBanner = ({ resource }: { resource: Resource }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F1592A]/20 to-[#D14820]/20 
      border border-[#F1592A]/30 backdrop-blur-sm mb-8"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/10 to-[#D14820]/10" />
    
    <div className="relative p-8">
      <div className="flex items-center gap-3 mb-4">
        <Star className="h-6 w-6 text-[#F1592A]" />
        <span className="text-[#F1592A] font-semibold">Featured Resource</span>
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
        {resource.title}
      </h2>
      
      <p className="text-gray-300 text-lg mb-6 max-w-2xl leading-relaxed">
        {resource.description}
      </p>
      
      <div className="flex items-center gap-4 mb-6">
        <Badge className="bg-[#F1592A]/20 text-[#F1592A] border-[#F1592A]/30">
          {resource.type}
        </Badge>
        <Badge className="bg-white/10 text-white border-white/20">
          {resource.category}
        </Badge>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Clock className="h-4 w-4" />
          <span>{resource.estimatedReadTime} min read</span>
        </div>
      </div>
      
      <Button
        size="lg"
        className="bg-gradient-to-r from-[#F1592A] to-[#D14820] hover:from-[#D14820] to-[#F1592A] 
          text-white border-0 h-12 px-8 text-lg font-semibold"
        asChild
      >
        <Link href={resource.externalUrl || `/forum/resources/${resource.id}`}>
          Explore Now
        </Link>
      </Button>
    </div>
  </motion.div>
)

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const { user } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    fetchResources()
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  useEffect(() => {
    filterAndSortResources()
  }, [resources, searchTerm, selectedCategory, selectedType, selectedDifficulty, sortBy])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const resourcesRef = collection(db, 'resources')
      const q = query(resourcesRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const resourcesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resource[]
      
      setResources(resourcesData)
    } catch (error) {
      console.error('Error fetching resources:', error)
      toast.error('Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)))
      if (!userDoc.empty) {
        setUserProfile({ id: userDoc.docs[0].id, ...userDoc.docs[0].data() })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const filterAndSortResources = () => {
    let filtered = resources.filter(resource => {
      const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
      const matchesType = selectedType === 'all' || resource.type === selectedType
      const matchesDifficulty = selectedDifficulty === 'all' || resource.difficulty === selectedDifficulty
      
      return matchesSearch && matchesCategory && matchesType && matchesDifficulty
    })

    // Sort resources
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        case 'oldest':
          return a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
        case 'popular':
          return b.views - a.views
        case 'likes':
          return b.likes.length - a.likes.length
        case 'alphabetical':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    setFilteredResources(filtered)
  }

  const handleLike = async (resourceId: string) => {
    if (!user || !userProfile) {
      toast.error('Please sign in to like resources')
      return
    }

    try {
      const resourceRef = doc(db, 'resources', resourceId)
      const resource = resources.find(r => r.id === resourceId)
      
      if (resource?.likes.includes(userProfile.id)) {
        await updateDoc(resourceRef, {
          likes: arrayRemove(userProfile.id)
        })
      } else {
        await updateDoc(resourceRef, {
          likes: arrayUnion(userProfile.id)
        })
      }
      
      await fetchResources()
    } catch (error) {
      console.error('Error updating like:', error)
      toast.error('Failed to update like')
    }
  }

  const handleBookmark = async (resourceId: string) => {
    if (!user || !userProfile) {
      toast.error('Please sign in to bookmark resources')
      return
    }

    try {
      const resourceRef = doc(db, 'resources', resourceId)
      const resource = resources.find(r => r.id === resourceId)
      
      if (resource?.bookmarks.includes(userProfile.id)) {
        await updateDoc(resourceRef, {
          bookmarks: arrayRemove(userProfile.id)
        })
        toast.success('Removed from bookmarks')
      } else {
        await updateDoc(resourceRef, {
          bookmarks: arrayUnion(userProfile.id)
        })
        toast.success('Added to bookmarks')
      }
      
      await fetchResources()
    } catch (error) {
      console.error('Error updating bookmark:', error)
      toast.error('Failed to update bookmark')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const categories = Array.from(new Set(resources.map(r => r.category))).filter(Boolean)
  const featuredResource = resources.find(r => r.featured)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F1592A] mx-auto mb-4"></div>
          <p className="text-white">Loading resources...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
          animation-delay: 4s;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        <AnimatedPattern />
        
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-black/20 border-b border-white/10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#F1592A] to-[#D14820] rounded-xl 
                  flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">NovelHub</span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/forum" className="text-gray-300 hover:text-white transition-colors">
                  Forum
                </Link>
                <Link href="/forum/resources" className="text-[#F1592A] font-medium">
                  Resources
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile?.profilePicture} />
                        <AvatarFallback className="bg-[#F1592A] text-white">
                          {userProfile?.displayName?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end">
                    <DropdownMenuLabel className="text-white">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem asChild>
                      <Link href="/user_profile" className="text-gray-300 hover:text-white cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild className="bg-gradient-to-r from-[#F1592A] to-[#D14820]">
                  <Link href="/auth">Sign In</Link>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/5 to-[#D14820]/5" />
              
              <div className="relative px-6 py-12 md:px-12">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Left side - Title and description */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-8 bg-gradient-to-b from-[#F1592A] to-[#D14820] rounded-full" />
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white">
                          Writing Resources
                        </h1>
                        <p className="text-sm text-gray-300 mt-1">
                          Discover guides, tools, and resources to improve your writing
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side - Search bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <div className="relative group min-w-[320px]">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/20 to-[#D14820]/20 
                        rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex">
                        <Input
                          type="text"
                          placeholder="Search resources..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-12 pr-4 py-3 w-full bg-white/10 dark:bg-slate-800/50 
                            backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl
                            focus:ring-2 focus:ring-[#F1592A]/50 focus:border-[#F1592A]/50 
                            placeholder:text-gray-400 dark:placeholder:text-gray-500 text-white
                            transition-all duration-300 shadow-sm hover:shadow-md"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 
                          group-hover:text-[#F1592A] transition-colors duration-300" />
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="outline"
                      className="px-6 py-3 h-12 rounded-2xl bg-white/10 border-white/20 text-white 
                        hover:bg-white/20 hover:border-[#F1592A]/30 transition-all duration-300"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Stats Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <StatsSection />
          </motion.section>

          {/* Categories Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Explore Categories
              </h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Browse our comprehensive collection of writing resources organized by category
              </p>
            </div>
            <CategoriesGrid />
          </motion.section>

          {/* Featured Resources Carousel */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-16"
          >
            <ResourceCarousel
              title="Featured Resources"
              resources={resources.filter(r => r.featured)}
              icon={Star}
            />
          </motion.section>

          {/* Latest Resources Carousel */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <ResourceCarousel
              title="Latest Resources"
              resources={resources.slice(0, 6)}
              icon={Clock}
            />
          </motion.section>

          {/* Popular Resources Carousel */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-16"
          >
            <ResourceCarousel
              title="Most Popular"
              resources={resources.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 6)}
              icon={TrendingUp}
            />
          </motion.section>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <Card className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Category Filter */}
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                        >
                          <option value="all">All Categories</option>
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      {/* Type Filter */}
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Type
                        </label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                        >
                          <option value="all">All Types</option>
                          <option value="blog">Blog Posts</option>
                          <option value="link">External Links</option>
                          <option value="guide">Guides</option>
                          <option value="tool">Tools</option>
                          <option value="template">Templates</option>
                        </select>
                      </div>

                      {/* Difficulty Filter */}
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Difficulty
                        </label>
                        <select
                          value={selectedDifficulty}
                          onChange={(e) => setSelectedDifficulty(e.target.value)}
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                        >
                          <option value="all">All Levels</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>

                      {/* Sort Filter */}
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="mostLiked">Most Liked</option>
                          <option value="mostViewed">Most Viewed</option>
                          <option value="title">Title A-Z</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* All Resources Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white">
                  All Resources ({filteredResources.length})
                </h2>
                <div className="flex gap-2">
                  {Array.from(new Set(filteredResources.map(r => r.category))).slice(0, 3).map(category => (
                    <Badge key={category} variant="secondary" className="text-xs bg-[#F1592A]/20 text-[#F1592A]">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-[#F1592A] hover:bg-[#E14A21]' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-[#F1592A] hover:bg-[#E14A21]' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Resources Grid/List */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F1592A]"></div>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  No resources found
                </h3>
                <p className="text-gray-400">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onLike={handleLike}
                    onBookmark={handleBookmark}
                    isLiked={userProfile ? resource.likes.includes(userProfile.id) : false}
                    isBookmarked={userProfile ? resource.bookmarks.includes(userProfile.id) : false}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </motion.section>
        </main>
      </div>
    </>
  )
}
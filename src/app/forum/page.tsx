'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Moon, Sun, LogOut, User, Plus, Home, Image as ImageIcon, MessageSquare, ChevronRight, ChevronsLeftRight, Flame, BookOpen, Crown, Sparkles, Menu, X, Library, Trash2 } from "lucide-react"
import Link from "next/link"
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../authcontext'
import { signOut } from 'firebase/auth'
import { auth, db, storage } from '@/lib/firebaseConfig'
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp,Timestamp, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
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
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
DialogTrigger,
} from "@/components/ui/dialog"
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Reply {
id: string
content: string
author: string
authorId: string
createdAt: Timestamp
replies: Reply[]
image?: string
}

interface ForumPost {
id: string
title: string
content: string
author: string
authorId: string
createdAt: Date
section: string
replies: Reply[]
image?: string
repliesCount: number
}

const ThemeToggle = () => {
const { theme, setTheme } = useTheme()

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

const AnimatedPattern = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <svg className="absolute w-full h-full opacity-[0.03] dark:opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#smallGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    
    {/* Animated circles */}
    <div className="absolute top-0 left-0 w-full h-full">
      <div className="absolute w-[500px] h-[500px] -left-48 -top-48 bg-[#F1592A]/10 rounded-full 
        blur-[100px] animate-blob animation-delay-2000" />
      <div className="absolute w-[500px] h-[500px] -right-48 -bottom-48 bg-[#D14820]/10 rounded-full 
        blur-[100px] animate-blob animation-delay-4000" />
      <div className="absolute w-[500px] h-[500px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
        bg-[#F1592A]/5 rounded-full blur-[100px] animate-blob animation-delay-6000" />
    </div>
  </div>
);

const styles = `
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  
  .animation-delay-6000 {
    animation-delay: 6s;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default function ForumsPage() {
const [mounted, setMounted] = useState(false)
const [posts, setPosts] = useState<ForumPost[]>([])
const [loading, setLoading] = useState(true)
const { user } = useAuth()
const router = useRouter()
const [userProfile, setUserProfile] = useState<{ profilePicture: string, username: string } | null>(null)
const [newPostTitle, setNewPostTitle] = useState('')
const [newPostContent, setNewPostContent] = useState('')
const [newPostSection, setNewPostSection] = useState('general')
const [newPostImage, setNewPostImage] = useState<File | null>(null)
const [isDialogOpen, setIsDialogOpen] = useState(false)
const [direction, setDirection] = useState(0)
const [activeTab, setActiveTab] = useState("announcements")
const fileInputRef = useRef<HTMLInputElement>(null)
const [scrollToPostId, setScrollToPostId] = useState<string | null>(null)
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
const [userType, setUserType] = useState<string>('')
const [isSubmitting, setIsSubmitting] = useState(false)

const fetchPosts = async () => {
  setLoading(true)
  try {
    const q = query(collection(db, 'forumPosts'), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    const fetchedPosts = await Promise.all(querySnapshot.docs.map(async (doc) => {
      const postData = doc.data()
      const repliesRef = collection(doc.ref, 'replies')
      const repliesSnapshot = await getDocs(repliesRef)
      const repliesCount = repliesSnapshot.size
      return { 
        id: doc.id, 
        ...postData,
        createdAt: postData.createdAt.toDate(),
        repliesCount: repliesCount
      } as ForumPost
    }))
    setPosts(fetchedPosts)
  } catch (error) {
    console.error('Error fetching forum posts:', error)
    toast.error('Failed to load forum posts')
  }
  setLoading(false)
}

const fetchUserProfile = async () => {
  if (!user) return
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)))
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data()
      setUserProfile({
        profilePicture: userData.profilePicture || '/assets/default-avatar.png',
        username: userData.username || 'Anonymous'
      })
      setUserType(userData.userType || '')
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
  }
}

const handleLogout = async () => {
  try {
    await signOut(auth)
    router.push('/')
  } catch (error) {
    console.error('Error signing out:', error)
    toast.error('Failed to sign out')
  }
}

const handleCreatePost = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!user) {
    toast.error('You must be logged in to create a post')
    return
  }
  if (!newPostTitle.trim() || !newPostContent.trim()) {
    toast.error('Please fill in all fields')
    return
  }

  if (isSubmitting) return
  
  setIsSubmitting(true)
  try {
    let imageUrl = ''
    if (newPostImage) {
      const imageRef = ref(storage, `post-images/${Date.now()}-${newPostImage.name}`)
      await uploadBytes(imageRef, newPostImage)
      imageUrl = await getDownloadURL(imageRef)
    }

    await addDoc(collection(db, 'forumPosts'), {
      title: newPostTitle,
      content: newPostContent,
      author: userProfile?.username || 'Anonymous',
      authorId: user.uid,
      createdAt: serverTimestamp(),
      section: newPostSection,
      replies: [],
      image: imageUrl || null
    })
    toast.success('Post created successfully')
    setNewPostTitle('')
    setNewPostContent('')
    setNewPostSection('general')
    setNewPostImage(null)
    setIsDialogOpen(false)
    window.location.reload()
  } catch (error) {
    console.error('Error creating post:', error)
    toast.error('Failed to create post')
  } finally {
    setIsSubmitting(false)
  }
}

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    setNewPostImage(file)
  }
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
}

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    };
  }
};

const handleTabChange = (newTab: string) => {
  const tabOrder = ["announcements", "general", "updates", "community"];
  const currentIndex = tabOrder.indexOf(activeTab);
  const newIndex = tabOrder.indexOf(newTab);
  setDirection(newIndex > currentIndex ? 1 : -1);
  setActiveTab(newTab);
}

const handleDeletePost = async (postId: string) => {
  if (!user) return
  try {
    await deleteDoc(doc(db, 'forumPosts', postId))
    setPosts(posts.filter(post => post.id !== postId))
    toast.success('Post deleted successfully')
  } catch (error) {
    console.error('Error deleting post:', error)
    toast.error('Failed to delete post')
  }
}

const renderPosts = (section: string) => {
  const sectionPosts = posts.filter(post => post.section === section)
  return (
    <div className="space-y-6 p-2 sm:p-4">
      {sectionPosts.map((post) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div className="group relative overflow-hidden rounded-xl backdrop-blur-xl 
            bg-gradient-to-r from-white/5 to-white/10 dark:from-black/5 dark:to-black/10
            hover:from-white/10 hover:to-white/15 dark:hover:from-black/10 dark:hover:to-black/15
            transition-all duration-300 ease-in-out">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/5 to-transparent opacity-0 
              group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="flex sm:flex-col items-center space-y-0 sm:space-y-2 gap-4 sm:gap-0">
                  <Avatar className="h-14 w-14 ring-2 ring-[#F1592A]/20 rounded-full">
                    <AvatarImage src={userProfile?.profilePicture || '/assets/default-avatar.png'} />
                    <AvatarFallback>{post.author[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                    <span className="text-sm font-medium text-[#232120] dark:text-[#E7E7E8]">{post.author}</span>
                    <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                      {new Date(post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                      {new Date(post.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/forum/post/${post.id}?tab=${section}&page=1`}>
                        <h3 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent 
                          bg-gradient-to-r from-[#F1592A] to-[#D14820] group-hover:to-[#F1592A]
                          transition-all duration-300 mb-2">
                          {post.title}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge variant="outline" 
                          className="bg-[#F1592A]/5 text-[#F1592A] border-[#F1592A]/20 
                          group-hover:bg-[#F1592A]/10 transition-colors duration-300">
                          {post.section}
                        </Badge>
                        <div className="flex items-center space-x-2 text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.repliesCount} {post.repliesCount === 1 ? 'reply' : 'replies'}</span>
                        </div>
                        {(userType === 'admin' || user?.uid === post.authorId) && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeletePost(post.id)}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 
                              hover:bg-red-500/20 transition-colors duration-300 flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-8">
                    <div className="flex-1">
                      <Link href={`/forum/post/${post.id}?tab=${section}&page=1`}>
                        <p className="text-[#232120] dark:text-[#E7E7E8] text-base leading-relaxed line-clamp-4">
                          {post.content}
                        </p>
                      </Link>
                      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
                              {Math.ceil(post.content.length / 200)} min read
                            </span>
                          </div>
                        </div>
                        <Link href={`/forum/post/${post.id}?tab=${section}&page=1`}>
                          <div className="text-[#8E8F8E] dark:text-[#C3C3C3] text-sm group-hover:text-[#F1592A] 
                            transition-colors duration-200 flex items-center font-medium">
                            Continue reading
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </div>
                        </Link>
                      </div>
                    </div>

                    {post.image && (
                      <div className="relative h-40 w-full sm:w-56 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image 
                          src={post.image} 
                          alt="Post image" 
                          fill
                          className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

useEffect(() => {
  setMounted(true)
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  const scrollTo = params.get('scrollTo')
  if (tab) setActiveTab(tab)
  if (scrollTo) setScrollToPostId(scrollTo)
  fetchPosts()
  if (user) {
    fetchUserProfile()
  }
}, [user])

useEffect(() => {
  if (scrollToPostId) {
    const postElement = document.getElementById(`post-${scrollToPostId}`)
    if (postElement) {
      postElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollToPostId(null)
    }
  }
}, [posts, scrollToPostId])

if (!mounted) return null

return (
  <div className="relative isolate min-h-screen bg-gradient-to-b from-[#F8F8F8] to-white 
    dark:from-[#1A1918] dark:to-[#232120] text-[#232120] dark:text-[#E7E7E8]">
    <AnimatedPattern />
    
    <motion.div 
      className="flex flex-col min-h-screen"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <header className="border-b dark:border-[#3E3F3E] bg-[#E7E7E8] dark:bg-[#232120] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Navigation */}
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

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-2">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#232120] dark:text-[#E7E7E8] hover:bg-[#F1592A]/10 hover:text-[#F1592A] rounded-full"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </Button>
                </Link>
                <Link href="/forum">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#232120] dark:text-[#E7E7E8] hover:bg-[#F1592A]/10 hover:text-[#F1592A] rounded-full bg-[#F1592A]/10 text-[#F1592A]"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Forum
                  </Button>
                </Link>
                <Link href="/browse">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#232120] dark:text-[#E7E7E8] hover:bg-[#F1592A]/10 hover:text-[#F1592A] rounded-full"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse
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
                  placeholder="Search forum..."
                  className="pl-10 pr-4 py-2 w-full bg-white dark:bg-[#2A2827] border-[#F1592A] border-opacity-50 rounded-full focus-visible:ring-[#F1592A]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <ThemeToggle />

              {/* User Menu */}
            {user ? (
              <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar>
                      <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                      <AvatarFallback>{userProfile?.username?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-0 bg-[#1E1E24] border-[#2A2A30] text-white shadow-xl" align="end">
                    {/* User Header Section */}
                    <div className="p-4 bg-[#1E1E24]">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-[#F1592A]">
                          <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                          <AvatarFallback className="bg-[#2A2A30] text-[#F1592A]">{userProfile?.username?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-semibold">{userProfile?.username || "Username"}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Welcome Banner */}
                    <div className="mx-3 my-3 bg-[#2A2A30] rounded-lg overflow-hidden">
                      <div className="p-3 relative">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-medium">Welcome to Forum!</h3>
                            <p className="text-xs text-gray-400">Join the discussion</p>
                          </div>
                          <Button 
                            className="bg-[#F1592A] hover:bg-[#E44D1F] text-white text-xs rounded-md px-3 h-7"
                            onClick={() => router.push('/forum')}
                          >
                            EXPLORE
                  </Button>
                        </div>
                        
                        {/* Background Icon */}
                        <div className="absolute right-2 bottom-0 opacity-20">
                          <MessageSquare className="h-12 w-12" />
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
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Browse All</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white">
                        <Library className="mr-2 h-4 w-4" />
                        <span>Library</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="bg-[#2A2A30]" />
                      
                      <DropdownMenuItem className="rounded-md py-2 px-3 focus:bg-[#2A2A30] focus:text-white" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                  </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/auth')}
                  className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white hover:from-[#D14820] hover:to-[#F1592A]"
                >
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
                    placeholder="Search forum..."
                    className="pl-10 pr-4 py-2.5 w-full bg-white dark:bg-[#2A2827] border-[#F1592A] border-opacity-50 rounded-full focus-visible:ring-[#F1592A]"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {/* Mobile Navigation */}
                <div className="flex flex-col space-y-4">
                  <Link 
                    href="/"
                    className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-2.5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                  <Link 
                    href="/forum"
                    className="flex items-center gap-2 text-[#F1592A] transition-colors px-3 py-2.5 rounded-lg bg-[#F1592A]/10"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Forum</span>
                  </Link>
                  <Link 
                    href="/browse"
                    className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-2.5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Browse</span>
                  </Link>
                  <Link 
                    href="/user_profile"
                    className="flex items-center gap-2 text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors px-3 py-2.5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Library className="w-4 h-4" />
                    <span>Library</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow container max-w-full sm:max-w-[90vw] mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#232120] to-[#3E3F3E] dark:from-[#E7E7E8] dark:to-[#C3C3C3]">
              Forum Discussions
            </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                  hover:from-[#D14820] hover:to-[#F1592A] rounded-full px-6
                  shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" /> New Post
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-white/80 dark:bg-[#232120]/80 backdrop-blur-lg border-none max-w-[95vw] mx-auto">
              <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F1592A] to-[#D14820]">
                    Create a New Post
                  </DialogTitle>
              </DialogHeader>
                <form onSubmit={handleCreatePost} className="space-y-4 mt-4">
                  <div className="space-y-2">
                <Input
                  placeholder="Post Title"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                      className="w-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 
                        backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-transparent
                        text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3]"
                />
                  </div>
                  <div className="space-y-2">
                <Textarea
                  placeholder="Post Content"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                      className="w-full h-32 bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 
                        backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-transparent
                        text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3] font-mono"
                />
                  </div>
                <Select value={newPostSection} onValueChange={setNewPostSection}>
                    <SelectTrigger className="w-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 
                      backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-transparent
                      text-[#232120] dark:text-[#E7E7E8]">
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                    <SelectContent className="bg-white/80 dark:bg-[#232120]/80 backdrop-blur-lg border border-white/20 dark:border-white/10">
                      <SelectItem value="announcements" className="text-[#232120] dark:text-[#E7E7E8] focus:bg-[#F1592A]/10">Announcements</SelectItem>
                      <SelectItem value="general" className="text-[#232120] dark:text-[#E7E7E8] focus:bg-[#F1592A]/10">General</SelectItem>
                      <SelectItem value="updates" className="text-[#232120] dark:text-[#E7E7E8] focus:bg-[#F1592A]/10">Updates</SelectItem>
                      <SelectItem value="community" className="text-[#232120] dark:text-[#E7E7E8] focus:bg-[#F1592A]/10">Community Discussions</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                    <Button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline"
                      className="bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 
                        text-[#232120] dark:text-[#E7E7E8] hover:bg-[#F1592A]/10 hover:text-[#F1592A]"
                    >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {newPostImage ? 'Change Image' : 'Add Image'}
                  </Button>
                    {newPostImage && (
                      <span className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3] truncate max-w-[200px]">
                        {newPostImage.name}
                      </span>
                    )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                      hover:from-[#D14820] hover:to-[#F1592A] shadow-lg hover:shadow-xl 
                      transition-all duration-300 relative"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="opacity-0">Create Post</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      </>
                    ) : (
                      'Create Post'
                    )}
                  </Button>
                </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-[#F1592A]/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-4 border-[#F1592A] rounded-full animate-spin border-t-transparent" />
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Tab container with gradient overlay */}
              <div className="relative backdrop-blur-[2px] overflow-x-auto">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F8F8F8]/90 to-[#F8F8F8]/95 
                  dark:from-[#1A1918]/90 dark:to-[#1A1918]/95 rounded-t-xl" />
                
                <div className="flex items-center backdrop-blur-md rounded-t-xl min-w-max">
                  {["announcements", "general", "updates", "community"].map((tab, index) => (
                    <motion.button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`relative flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-300
                        ${index === 0 ? 'rounded-tl-xl' : ''} 
                        ${index === 3 ? 'rounded-tr-xl' : ''}
                        ${activeTab === tab ? 
                          'text-[#F1592A] dark:text-[#F1592A] font-semibold' : 
                          'text-[#6B7280] hover:text-[#F1592A] dark:text-[#9CA3AF] dark:hover:text-[#F1592A]'
                        }
                      `}
                    >
                      {activeTab === tab && (
                        <motion.div
                          layoutId="activeTabBackground"
                          className="absolute inset-0 bg-gradient-to-b from-white to-[#F8F8F8] 
                            dark:from-[#232120] dark:to-[#1A1918] rounded-t-xl
                            border-t-2 border-[#F1592A]"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 capitalize flex items-center justify-center space-x-2">
                        <span>{tab}</span>
                        {activeTab === tab && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full bg-[#F1592A]"
                          />
                        )}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Content area with seamless blend */}
              <motion.div
                className="relative backdrop-blur-[2px] bg-gradient-to-b from-[#F8F8F8]/95 to-white/95 
                  dark:from-[#1A1918]/95 dark:to-[#232120]/95 
                  rounded-b-xl rounded-tr-xl overflow-hidden"
                layout
                transition={{ type: "spring", bounce: 0, duration: 0.6 }}
              >
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={activeTab}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.3 }
                    }}
                    className="relative"
                  >
                    <ScrollArea className="h-[calc(100vh-16rem)] px-2 sm:px-6 py-4 sm:py-8">
                      <div className="relative">
                        {renderPosts(activeTab)}
                      </div>
                    </ScrollArea>
                </motion.div>
              </AnimatePresence>
              </motion.div>
            </div>
        )}
        </div>
      </main>

      <footer className="mt-auto py-8">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
            © 2024 Novellize Forums. All rights reserved.
          </p>
        </div>
      </footer>
    </motion.div>
  </div>
)
}
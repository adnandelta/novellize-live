'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Moon, Sun, LogOut, User, Plus, Home, Image as ImageIcon, MessageSquare, ChevronRight, ChevronsLeftRight, Flame, BookOpen, Crown, Sparkles, Menu, X, Library, Trash2, Edit } from "lucide-react"
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

const AnimatedPattern = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    {/* Geometric grid pattern */}
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
    
    {/* Floating geometric shapes with original colors */}
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div className="absolute w-32 h-32 top-20 left-[10%] bg-gradient-to-br from-[#F1592A]/8 to-[#D14820]/8 
        rounded-2xl rotate-12 animate-float" />
      <div className="absolute w-24 h-24 top-40 right-[15%] bg-gradient-to-br from-[#D14820]/6 to-[#F1592A]/6 
        rounded-full animate-float-delayed" />
      <div className="absolute w-40 h-40 bottom-32 left-[20%] bg-gradient-to-br from-[#F1592A]/4 to-transparent 
        rounded-3xl rotate-45 animate-float-slow" />
      <div className="absolute w-16 h-16 bottom-20 right-[25%] bg-gradient-to-br from-[#D14820]/10 to-[#F1592A]/10 
        rounded-lg rotate-45 animate-pulse" />
      
      {/* Additional hexagonal patterns */}
      <div className="absolute w-20 h-20 top-60 left-[60%] opacity-[0.03]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,5 85,25 85,75 50,95 15,75 15,25" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        </svg>
    </div>
      <div className="absolute w-16 h-16 bottom-40 right-[40%] opacity-[0.03] rotate-45">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,5 85,25 85,75 50,95 15,75 15,25" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </div>
    
    {/* Mesh gradient overlay with original colors */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/[0.02] via-transparent to-[#D14820]/[0.02]" />
  </div>
);

const styles = `
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
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(241, 89, 42, 0.1); }
    50% { box-shadow: 0 0 40px rgba(241, 89, 42, 0.2), 0 0 60px rgba(241, 89, 42, 0.1); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
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
  
  .animate-glow {
    animation: glow 3s ease-in-out infinite;
  }
  
  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  
  .glass-morphism {
    backdrop-filter: blur(16px) saturate(180%);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .glass-morphism-dark {
    backdrop-filter: blur(16px) saturate(180%);
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
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
const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
const [selectedTag, setSelectedTag] = useState<string | null>(null)
const [editingPost, setEditingPost] = useState<string | null>(null)
const [deleteConfirmPost, setDeleteConfirmPost] = useState<string | null>(null)
const [authorProfiles, setAuthorProfiles] = useState<{[key: string]: {profilePicture: string, username: string}}>({})

// Generate consistent avatar color based on name
const getAvatarColor = (name: string) => {
  const colors = [
    'from-red-500 to-red-600',
    'from-blue-500 to-blue-600', 
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-yellow-500 to-yellow-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600'
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

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
    await fetchAuthorProfiles(fetchedPosts)
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
  
  // Check if user is admin only for announcements section
  if (newPostSection === 'announcements' && userType !== 'admin') {
    toast.error('Only administrators can create announcements')
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
    setDeleteConfirmPost(null)
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
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-xl 
            bg-gradient-to-r from-white/10 to-white/5 dark:from-slate-900/10 dark:to-slate-800/5
            hover:from-white/20 hover:to-white/10 dark:hover:from-slate-900/20 dark:hover:to-slate-800/10
            border border-white/20 dark:border-slate-700/30 hover:border-[#F1592A]/40
            shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-[#F1592A]/10
            transition-all duration-300 ease-in-out">
            
            <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/3 to-transparent opacity-0 
              group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex sm:flex-col items-center space-y-0 sm:space-y-2 gap-4 sm:gap-0">
                  <Link href={`/author/${post.authorId}`} className="group/avatar">
                    <Avatar className="h-14 w-14 ring-2 ring-[#F1592A]/30 shadow-lg hover:ring-[#F1592A]/50 transition-all duration-200 group-hover/avatar:scale-105">
                      <AvatarImage src={authorProfiles[post.authorId]?.profilePicture || '/assets/default-avatar.png'} />
                      <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(post.author)} text-white font-bold text-lg`}>
                        {post.author[0]}
                      </AvatarFallback>
                  </Avatar>
                  </Link>
                  <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                    <Link href={`/author/${post.authorId}`} className="hover:text-[#F1592A] transition-colors duration-200">
                      <span className="text-sm font-semibold text-[#232120] dark:text-[#E7E7E8]">{post.author}</span>
                    </Link>
                    <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3] mt-1">
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
                          bg-gradient-to-r from-[#232120] to-[#3E3F3E] dark:from-[#E7E7E8] dark:to-[#C3C3C3]
                          group-hover:from-[#F1592A] group-hover:to-[#D14820]
                          transition-all duration-300 mb-3">
                          {post.title}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge variant="outline" 
                          className="bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 text-[#F1592A] 
                          border-[#F1592A]/30 group-hover:bg-gradient-to-r group-hover:from-[#F1592A]/20 
                          group-hover:to-[#D14820]/20 transition-all duration-300 font-medium">
                          {post.section}
                        </Badge>
                        <div className="flex items-center space-x-2 text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
                          <MessageSquare className="h-4 w-4 text-[#F1592A]" />
                          <span className="font-medium">{post.repliesCount} {post.repliesCount === 1 ? 'reply' : 'replies'}</span>
                        </div>
                        {(userType === 'admin' || user?.uid === post.authorId) && (
                          <div className="flex items-center gap-2">
                            {user?.uid === post.authorId && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                                onClick={() => setEditingPost(post.id)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 
                                  hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30
                                  transition-all duration-300 flex items-center gap-1.5"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setDeleteConfirmPost(post.id)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 
                                hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30
                                transition-all duration-300 flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </motion.button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/forum/post/${post.id}?tab=${section}&page=1`}>
                        <p className="text-[#232120] dark:text-[#E7E7E8] text-base leading-relaxed line-clamp-3">
                          {post.content}
                        </p>
                      </Link>
                      <div className="flex justify-end mt-3">
                        <Link href={`/forum/post/${post.id}?tab=${section}&page=1`}>
                          <div className="group/link flex items-center gap-2 px-3 py-1.5 rounded-lg
                            bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 
                            hover:from-[#F1592A]/20 hover:to-[#D14820]/20
                            border border-[#F1592A]/20 hover:border-[#F1592A]/40
                            text-[#F1592A] hover:text-[#D14820] font-medium text-sm
                            transition-all duration-300">
                            <span>Continue reading</span>
                            <ChevronRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform duration-200" />
                          </div>
                        </Link>
                      </div>
                    </div>

                    {post.image && (
                      <div className="relative h-32 w-full sm:w-48 flex-shrink-0 overflow-hidden rounded-lg 
                        shadow-md border border-white/10 dark:border-slate-700/30">
                        <Image 
                          src={post.image} 
                          alt="Post image" 
                          fill
                          className="object-contain transform group-hover:scale-105 transition-transform duration-500"
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

const fetchAuthorProfiles = async (posts: ForumPost[]) => {
  const profiles: {[key: string]: {profilePicture: string, username: string}} = {}
  const seenAuthorIds: {[key: string]: boolean} = {}
  
  for (const post of posts) {
    if (!seenAuthorIds[post.authorId]) {
      seenAuthorIds[post.authorId] = true
      try {
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', post.authorId)))
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data()
          profiles[post.authorId] = {
            profilePicture: userData.profilePicture || '',
            username: userData.username || 'Anonymous'
          }
        }
      } catch (error) {
        console.error('Error fetching author profile:', error)
      }
    }
  }
  
  setAuthorProfiles(profiles)
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

useEffect(() => {
  if (user) {
    fetchAuthorProfiles(posts)
  }
}, [user, posts])

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
      <header className="border-b dark:border-[#3E3F3E] bg-[#E7E7E8]/80 dark:bg-[#232120]/80 
        backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex-shrink-0 group">
                <div className="relative p-2 rounded-2xl bg-gradient-to-br from-[#F1592A] to-[#D14820] 
                  shadow-lg shadow-[#F1592A]/25 group-hover:shadow-xl group-hover:shadow-[#F1592A]/40 
                  transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/assets/favicon.png"
                  alt="Novellize"
                    width={32}
                    height={32}
                    className="relative z-10"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-1">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative px-4 py-2.5 text-[#232120] dark:text-[#E7E7E8] 
                      hover:text-[#F1592A] dark:hover:text-[#F1592A] rounded-xl font-medium
                      hover:bg-[#F1592A]/5 transition-all duration-200 group"
                  >
                    <Home className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Home
                  </Button>
                </Link>
                <Link href="/forum">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative px-4 py-2.5 rounded-xl font-medium
                      bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 text-[#F1592A] 
                      shadow-sm border border-[#F1592A]/20 hover:shadow-md hover:scale-105
                      transition-all duration-200 group"
                  >
                    <MessageSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Forum
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#F1592A]/5 to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </Button>
                </Link>
                <Link href="/browse">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative px-4 py-2.5 text-[#232120] dark:text-[#E7E7E8] 
                      hover:text-[#F1592A] dark:hover:text-[#F1592A] rounded-xl font-medium
                      hover:bg-[#F1592A]/5 transition-all duration-200 group"
                  >
                    <BookOpen className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Browse
                  </Button>
                </Link>
              </nav>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-4">
              {/* Desktop Search */}
              <div className="hidden lg:flex relative w-[320px] group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/20 to-[#D14820]/20 
                  rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Input
                  type="text"
                  placeholder="Search discussions..."
                  className="relative pl-12 pr-4 py-3 w-full bg-white/60 dark:bg-[#2A2827]/60 
                    backdrop-blur-sm border border-[#F1592A]/30 dark:border-[#F1592A]/30 rounded-2xl
                    focus:ring-2 focus:ring-[#F1592A]/50 focus:border-[#F1592A]/50 
                    placeholder:text-[#8E8F8E] dark:placeholder:text-[#C3C3C3]
                    transition-all duration-300 shadow-sm hover:shadow-md"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8F8E] 
                  group-hover:text-[#F1592A] transition-colors duration-300" />
              </div>

              <div className="flex items-center gap-3">
              <ThemeToggle />

                {/* Mobile Sidebar Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden w-10 h-10 rounded-xl hover:bg-[#F8F8F8] dark:hover:bg-[#2A2827] transition-colors duration-200"
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                >
                  <ChevronsLeftRight className="h-5 w-5 text-[#232120] dark:text-[#E7E7E8]" />
                </Button>

              {/* User Menu */}
            {user ? (
              <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/20 to-[#D14820]/20 
                          rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Avatar className="relative w-12 h-12 ring-2 ring-[#F1592A]/20 dark:ring-[#F1592A]/30 
                          hover:ring-[#F1592A]/50 transition-all duration-300 group-hover:scale-105">
                      <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                          <AvatarFallback className="bg-gradient-to-br from-[#F1592A] to-[#D14820] text-white font-semibold">
                            {userProfile?.username?.[0] || '?'}
                          </AvatarFallback>
                    </Avatar>
                      </div>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72 p-0 bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl 
                      border border-[#F1592A]/20 dark:border-[#F1592A]/20 shadow-2xl shadow-black/10 rounded-2xl" align="end">
                    {/* User Header Section */}
                      <div className="p-6 bg-gradient-to-r from-[#F1592A]/5 to-[#D14820]/5 rounded-t-2xl">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 ring-2 ring-[#F1592A]/30 shadow-lg">
                          <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                            <AvatarFallback className="bg-gradient-to-br from-[#F1592A] to-[#D14820] text-white text-lg font-bold">
                              {userProfile?.username?.[0] || '?'}
                            </AvatarFallback>
                        </Avatar>
                          <div className="flex-1">
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {userProfile?.username || "Username"}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {user.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">Online</span>
                            </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Welcome Banner */}
                      <div className="mx-4 my-4 bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 
                        rounded-xl overflow-hidden border border-[#F1592A]/20">
                        <div className="p-4 relative">
                        <div className="flex justify-between items-center">
                          <div>
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Welcome to Forum!
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Join the discussion
                              </p>
                          </div>
                          <Button 
                              className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white text-xs 
                                rounded-lg px-3 h-8 font-medium shadow-sm hover:shadow-md
                                hover:scale-105 transition-all duration-200"
                            onClick={() => router.push('/forum')}
                          >
                            EXPLORE
                  </Button>
                        </div>
                        
                        {/* Background Icon */}
                          <div className="absolute right-2 bottom-1 opacity-10">
                            <MessageSquare className="h-10 w-10" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                      <div className="px-2 py-2 space-y-1">
                        <DropdownMenuItem className="rounded-xl py-3 px-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 
                          transition-colors duration-200 cursor-pointer group" onClick={() => router.push('/user_profile')}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center 
                              group-hover:bg-blue-500/20 transition-colors duration-200">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">My Profile</span>
                          </div>
                  </DropdownMenuItem>
                      
                        <DropdownMenuItem className="rounded-xl py-3 px-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 
                          transition-colors duration-200 cursor-pointer group" onClick={() => router.push('/browse')}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center 
                              group-hover:bg-green-500/20 transition-colors duration-200">
                              <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Browse All</span>
                          </div>
                      </DropdownMenuItem>
                      
                        <DropdownMenuItem className="rounded-xl py-3 px-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 
                          transition-colors duration-200 cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center 
                              group-hover:bg-purple-500/20 transition-colors duration-200">
                              <Library className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Library</span>
                          </div>
                      </DropdownMenuItem>
                      
                        <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-700/50 my-2" />
                        
                        <DropdownMenuItem className="rounded-xl py-3 px-4 hover:bg-red-50 dark:hover:bg-red-900/20 
                          transition-colors duration-200 cursor-pointer group" onClick={handleLogout}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center 
                              group-hover:bg-red-500/20 transition-colors duration-200">
                              <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-medium text-red-700 dark:text-red-400">Sign Out</span>
                          </div>
                  </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/auth')}
                    className="relative px-6 py-2.5 rounded-2xl font-semibold
                      bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                      shadow-lg shadow-[#F1592A]/25 hover:shadow-xl hover:shadow-[#F1592A]/40
                      hover:scale-105 transition-all duration-300 overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#D14820] to-[#F1592A] 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">Login</span>
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                  className="lg:hidden w-10 h-10 rounded-xl hover:bg-[#F8F8F8] dark:hover:bg-[#2A2827] transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-[#232120] dark:text-[#E7E7E8]" />
                ) : (
                    <Menu className="h-5 w-5 text-[#232120] dark:text-[#E7E7E8]" />
                )}
              </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden border-t border-[#3E3F3E]/20 dark:border-[#3E3F3E] 
                bg-[#E7E7E8]/80 dark:bg-[#232120]/80 backdrop-blur-xl"
            >
              <div className="flex flex-col space-y-4 px-6 py-8">
                {/* Mobile Search */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 
                    rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Input
                    type="text"
                    placeholder="Search discussions..."
                    className="relative pl-12 pr-4 py-3 w-full bg-white/60 dark:bg-[#2A2827]/60 
                      backdrop-blur-sm border border-[#F1592A]/30 dark:border-[#F1592A]/30 rounded-2xl
                      focus:ring-2 focus:ring-[#F1592A]/50 focus:border-[#F1592A]/50 
                      placeholder:text-[#8E8F8E] dark:placeholder:text-[#C3C3C3]"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8F8E] 
                    group-hover:text-[#F1592A] transition-colors duration-300" />
                </div>

                {/* Mobile Navigation */}
                <div className="flex flex-col space-y-2">
                  <Link 
                    href="/"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                      text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] dark:hover:text-[#F1592A] 
                      hover:bg-[#F1592A]/5 transition-all duration-200 group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F8F8F8] dark:bg-[#2A2827] flex items-center justify-center
                      group-hover:bg-[#F1592A]/10 transition-colors duration-200">
                    <Home className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Home</span>
                  </Link>
                  
                  <Link 
                    href="/forum"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                      bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 text-[#F1592A] 
                      border border-[#F1592A]/20"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F1592A]/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Forum</span>
                  </Link>
                  
                  <Link 
                    href="/browse"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                      text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] dark:hover:text-[#F1592A] 
                      hover:bg-[#F1592A]/5 transition-all duration-200 group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F8F8F8] dark:bg-[#2A2827] flex items-center justify-center
                      group-hover:bg-[#F1592A]/10 transition-colors duration-200">
                    <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Browse</span>
                  </Link>
                  
                  <Link 
                    href="/user_profile"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                      text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] dark:hover:text-[#F1592A] 
                      hover:bg-[#F1592A]/5 transition-all duration-200 group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F8F8F8] dark:bg-[#2A2827] flex items-center justify-center
                      group-hover:bg-[#F1592A]/10 transition-colors duration-200">
                    <Library className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Library</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 container max-w-none mx-auto px-4 lg:px-6 lg:pr-[336px] py-12">
            <div className="max-w-none space-y-12">
              {/* Header Section */}
              <div className="relative">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#F1592A] to-[#D14820] rounded-full" />
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent 
                        bg-gradient-to-r from-[#232120] via-[#3E3F3E] to-[#232120] 
                        dark:from-[#E7E7E8] dark:via-[#C3C3C3] dark:to-[#E7E7E8]">
              Forum Discussions
                      </h1>
                      <p className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3] mt-1">
                        Connect, share, and discuss with the community
                      </p>
                    </div>
                  </div>
                  
            {user && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                        <Button className="relative group px-8 py-4 rounded-2xl font-semibold text-white
                          bg-gradient-to-r from-[#F1592A] to-[#D14820] 
                          shadow-lg shadow-[#F1592A]/25 hover:shadow-xl hover:shadow-[#F1592A]/40
                          hover:scale-105 transition-all duration-300 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-[#D14820] to-[#F1592A] 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative z-10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span>Start Discussion</span>
                          </div>
                  </Button>
                </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] max-w-[95vw] mx-auto p-0 
                        bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl border border-[#F1592A]/20 
                        shadow-2xl shadow-black/10 rounded-3xl overflow-hidden">
                        <div className="p-8">
                          <DialogHeader className="space-y-4 mb-8">
                            <DialogTitle className="text-3xl font-bold bg-clip-text text-transparent 
                              bg-gradient-to-r from-[#F1592A] to-[#D14820] text-center">
                              Start a New Discussion
                    </DialogTitle>
                            <p className="text-[#8E8F8E] dark:text-[#C3C3C3] text-center">
                              Share your thoughts and engage with the community
                            </p>
                  </DialogHeader>
                          
                          <form onSubmit={handleCreatePost} className="space-y-6">
                    <div className="space-y-2">
                              <label className="text-sm font-medium text-[#232120] dark:text-[#E7E7E8]">
                                Discussion Title
                              </label>
                      <Input
                                placeholder="What would you like to discuss?"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                                className="w-full h-12 px-4 bg-white/60 dark:bg-[#2A2827]/60 backdrop-blur-sm 
                                  border border-[#F1592A]/30 rounded-xl focus:ring-2 focus:ring-[#F1592A]/50 
                                  placeholder:text-[#8E8F8E] dark:placeholder:text-[#C3C3C3] transition-all duration-300"
                      />
                    </div>
                            
                    <div className="space-y-2">
                              <label className="text-sm font-medium text-[#232120] dark:text-[#E7E7E8]">
                                Content
                              </label>
                      <Textarea
                                placeholder="Share your thoughts, ask questions, or start a conversation..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                                className="w-full h-32 px-4 py-3 bg-white/60 dark:bg-[#2A2827]/60 backdrop-blur-sm 
                                  border border-[#F1592A]/30 rounded-xl focus:ring-2 focus:ring-[#F1592A]/50 
                                  placeholder:text-[#8E8F8E] dark:placeholder:text-[#C3C3C3] transition-all duration-300 resize-none"
                      />
                    </div>
                            
                    <Select value={newPostSection} onValueChange={setNewPostSection}>
                              <SelectTrigger className="w-full h-12 bg-white/60 dark:bg-[#2A2827]/60 backdrop-blur-sm 
                                border border-[#F1592A]/30 rounded-xl focus:ring-2 focus:ring-[#F1592A]/50">
                                <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                              <SelectContent className="bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl 
                                border border-[#F1592A]/20 rounded-xl">
                                <SelectItem value="announcements">📢 Announcements {userType !== 'admin' && '(Admin Only)'}</SelectItem>
                                <SelectItem value="general">💬 General Discussion</SelectItem>
                                <SelectItem value="updates">🔄 Updates & News</SelectItem>
                                <SelectItem value="community">👥 Community</SelectItem>
                      </SelectContent>
                    </Select>
                            
                      <Button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()} 
                        variant="outline"
                              className="w-full h-12 bg-white/60 dark:bg-[#2A2827]/60 backdrop-blur-sm 
                                border border-[#F1592A]/30 rounded-xl hover:bg-[#F1592A]/5 transition-all duration-300"
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {newPostImage ? 'Change Image' : 'Add Image'}
                      </Button>
                      {newPostImage && (
                              <div className="flex items-center gap-2 text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="truncate">{newPostImage.name}</span>
                    </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                            
                            <div className="flex gap-4 pt-4">
                              <Button 
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                className="flex-1 h-12 rounded-xl border border-[#8E8F8E] hover:bg-[#F8F8F8] dark:hover:bg-[#2A2827] transition-all duration-300"
                              >
                                Cancel
                              </Button>
                    <Button 
                      type="submit" 
                                className="flex-1 h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-[#F1592A] to-[#D14820] 
                                  shadow-lg shadow-[#F1592A]/25 hover:shadow-xl hover:shadow-[#F1592A]/40 hover:scale-[1.02] 
                                  transition-all duration-300 relative overflow-hidden group"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                                    <span className="opacity-0">Create Discussion</span>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        </>
                      ) : (
                                  <>
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#D14820] to-[#F1592A] 
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative z-10">Create Discussion</span>
                                  </>
                      )}
                    </Button>
                            </div>
                  </form>
                        </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
              </div>

              {/* Modern Tab Navigation */}
              <div className="relative mb-8">
                <div className="flex items-center justify-center">
                  <div className="relative p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm 
                    rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg">
                    <div className="flex items-center space-x-1">
                      {["announcements", "general", "updates", "community"].map((tab) => (
                    <motion.button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                          className={`relative px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300
                        ${activeTab === tab ? 
                              'text-white' : 
                              'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }
                      `}
                    >
                      {activeTab === tab && (
                        <motion.div
                              layoutId="activeTab"
                              className="absolute inset-0 bg-gradient-to-r from-[#F1592A] to-[#D14820] rounded-xl
                                shadow-lg shadow-[#F1592A]/25"
                          initial={false}
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <span className="relative z-10 capitalize flex items-center gap-2">
                            {tab === 'announcements' && '📢'}
                            {tab === 'general' && '💬'}
                            {tab === 'updates' && '🔄'}
                            {tab === 'community' && '👥'}
                            {tab}
                      </span>
                    </motion.button>
                  ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="relative">
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
                  <ScrollArea className="h-[calc(100vh-24rem)]">
                    <div className="space-y-6 pb-6">
                        {renderPosts(activeTab)}
                      </div>
                    </ScrollArea>
                </motion.div>
              </AnimatePresence>
            </div>
            </div>
          </div>

          {/* Sidebar - Fixed to extreme right */}
          <div className="hidden lg:block fixed top-20 right-0 w-80 h-[calc(100vh-5rem)] overflow-y-auto z-40 
            bg-[#F8F8F8]/95 dark:bg-[#1A1918]/95 backdrop-blur-xl border-l border-[#F1592A]/20">
            <div className="p-6 space-y-6">
              {/* Latest Replies */}
              <div className="relative overflow-hidden rounded-xl backdrop-blur-xl 
                bg-gradient-to-r from-white/80 to-white/60 dark:from-[#232120]/80 dark:to-[#232120]/60
                border border-[#F1592A]/20 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/5 to-transparent opacity-50" />
                
                <div className="relative z-10 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F1592A] to-[#D14820] 
                      flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#232120] dark:text-[#E7E7E8]">
                      Latest Replies
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {posts.slice(0, 5).map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F1592A]/5 transition-colors duration-200 cursor-pointer"
                        onClick={() => {
                          router.push(`/forum/post/${post.id}?tab=${post.section}&page=1`)
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F1592A]/20 to-[#D14820]/20 
                          flex items-center justify-center text-sm font-medium">
                          {post.author[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#232120] dark:text-[#E7E7E8]">
                            <span className="font-medium">{post.author}</span>{' '}
                            <span className="text-[#8E8F8E] dark:text-[#C3C3C3]">
                              {post.repliesCount > 0 ? 'replied to' : 'started'}
                            </span>{' '}
                            <span className="font-medium text-[#F1592A] truncate block">{post.title}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                              {new Date(post.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {post.repliesCount > 0 && (
                              <>
                                <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">•</span>
                                <span className="text-xs text-[#F1592A] font-medium">
                                  {post.repliesCount} {post.repliesCount === 1 ? 'reply' : 'replies'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
              </motion.div>
                    ))}
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              
              {/* Mobile Sidebar */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 w-80 h-full bg-[#F8F8F8]/95 dark:bg-[#1A1918]/95 
                  backdrop-blur-xl border-l border-[#F1592A]/20 z-50 lg:hidden overflow-y-auto"
              >
                <div className="p-6 space-y-6">
                  {/* Close Button */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[#232120] dark:text-[#E7E7E8]">Latest Replies</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="w-10 h-10 rounded-xl hover:bg-[#F1592A]/10 transition-colors duration-200"
                    >
                      <X className="h-5 w-5 text-[#232120] dark:text-[#E7E7E8]" />
                    </Button>
                  </div>

                  {/* Latest Replies */}
                  <div className="relative overflow-hidden rounded-xl backdrop-blur-xl 
                    bg-gradient-to-r from-white/80 to-white/60 dark:from-[#232120]/80 dark:to-[#232120]/60
                    border border-[#F1592A]/20 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/5 to-transparent opacity-50" />
                    
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F1592A] to-[#D14820] 
                          flex items-center justify-center shadow-lg">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-[#232120] dark:text-[#E7E7E8]">
                          Latest Replies
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        {posts.slice(0, 5).map((post, index) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F1592A]/5 transition-colors duration-200 cursor-pointer"
                            onClick={() => {
                              router.push(`/forum/post/${post.id}?tab=${post.section}&page=1`)
                              setIsMobileSidebarOpen(false)
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F1592A]/20 to-[#D14820]/20 
                              flex items-center justify-center text-sm font-medium">
                              {post.author[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#232120] dark:text-[#E7E7E8]">
                                <span className="font-medium">{post.author}</span>{' '}
                                <span className="text-[#8E8F8E] dark:text-[#C3C3C3]">
                                  {post.repliesCount > 0 ? 'replied to' : 'started'}
                                </span>{' '}
                                <span className="font-medium text-[#F1592A] truncate block">{post.title}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                                  {new Date(post.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {post.repliesCount > 0 && (
                                  <>
                                    <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">•</span>
                                    <span className="text-xs text-[#F1592A] font-medium">
                                      {post.repliesCount} {post.repliesCount === 1 ? 'reply' : 'replies'}
                                    </span>
                                  </>
        )}
        </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmPost} onOpenChange={() => setDeleteConfirmPost(null)}>
          <DialogContent className="sm:max-w-[425px] bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl 
            border border-[#F1592A]/20 shadow-2xl shadow-black/10 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#232120] dark:text-[#E7E7E8]">
                Confirm Delete
              </DialogTitle>
              <p className="text-[#8E8F8E] dark:text-[#C3C3C3] mt-2">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </DialogHeader>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmPost(null)}
                className="flex-1 border-[#8E8F8E] hover:bg-[#F8F8F8] dark:hover:bg-[#2A2827]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteConfirmPost && handleDeletePost(deleteConfirmPost)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <footer className="relative mt-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F1592A]/5 to-transparent" />
        <div className="relative border-t border-white/20 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="container max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F1592A] to-[#D14820] 
                  flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold bg-clip-text text-transparent 
                  bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400">
                  Novellize Forums
                </span>
              </div>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                Connect with fellow readers and writers. Share your passion for storytelling 
                and discover new literary adventures.
              </p>
              
              <div className="flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
                <span>© 2024 Novellize Forums</span>
                <span>•</span>
                <span>All rights reserved</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Made with <span className="text-red-500">♥</span> for readers
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  </div>
)
}
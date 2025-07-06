'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Moon, Sun, LogOut, User, Home, MessageSquare, ChevronDown, ChevronUp, ChevronLeft, ChevronsLeftRight, Flame, BookOpen, Crown, Sparkles, Menu, X, Library, Trash2 } from "lucide-react"
import { GiQuillInk } from "react-icons/gi"
import Link from "next/link"
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/authcontext'
import { signOut } from 'firebase/auth'
import { auth, db} from '@/lib/firebaseConfig'
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp,doc, getDoc, deleteDoc} from 'firebase/firestore'
import { Toaster, toast } from 'react-hot-toast'
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
} from "@/components/ui/dialog"
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { Badge } from "@/components/ui/badge"

interface Reply {
  id: string
  content: string
  author: string
  authorId: string
  createdAt: Date
  parentId: string | null
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
}

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

// Get role badge styling
const getRoleBadge = (userType: string) => {
  // Normalize the userType to handle any casing issues
  const normalizedType = userType?.toLowerCase().trim() || 'user'
  
  switch (normalizedType) {
    case 'admin':
      return {
        icon: Crown,
        text: 'Admin',
        className: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-md text-yellow-200 border border-yellow-400/50 shadow-lg shadow-yellow-400/20 ring-1 ring-yellow-400/20'
      }
    case 'author':
      return {
        icon: GiQuillInk,
        text: 'Author',
        className: 'bg-black/20 backdrop-blur-md text-emerald-300 border border-emerald-400/30 shadow-lg shadow-emerald-400/10'
      }
    case 'user':
    default:
      return {
        icon: User,
        text: 'Member',
        className: 'bg-black/20 backdrop-blur-md text-slate-300 border border-slate-400/30 shadow-lg shadow-slate-400/10'
      }
  }
}

// Determine profile route based on user type
const getProfileRoute = (authorId: string, userType: string) => {
  if (userType === 'author') {
    return `/author/${authorId}`
  }
  return `/user_profile?userId=${authorId}`
}

const ReplyComponent = ({ reply, allReplies, onReply, userProfiles, currentUser, currentUserType, onDeleteReply, depth = 0 }: { 
  reply: Reply, 
  allReplies: Reply[], 
  onReply: (parentReplyId: string, content: string) => void, 
  userProfiles: {[key: string]: {profilePicture: string, username: string, userType: string}},
  currentUser: any,
  currentUserType: string,
  onDeleteReply: (replyId: string) => void,
  depth?: number
}) => {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [showReplies, setShowReplies] = useState(false)
  const { user } = useAuth()

  const nestedReplies = allReplies.filter(r => r.parentId === reply.id)
  const userProfile = userProfiles[reply.authorId] || { profilePicture: '/assets/default-avatar.png', username: reply.author, userType: 'reader' }

  const handleReply = () => {
    if (!user) {
      toast.error('You must be logged in to reply')
      return
    }
    
    if (!replyContent.trim()) {
      toast.error('Cannot have blank reply')
      return
    }

    onReply(reply.id, replyContent)
    setReplyContent('')
    setIsReplying(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault()
      handleReply()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      setReplyContent(prev => prev + '\n')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="relative"
    >
      {/* Threading Line */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#F1592A]/30 to-[#D14820]/30" />
      )}
      
      <div className={`group relative ${depth > 0 ? 'ml-4 pl-3' : ''}`}>
        <div className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-[#F1592A]/[0.02] dark:hover:bg-[#F1592A]/[0.05] transition-colors duration-150">
          {/* Avatar Section */}
          <div className="flex-shrink-0">
            <Link href={getProfileRoute(reply.authorId, userProfile.userType)} className="group/avatar">
              <Avatar className="h-6 w-6 ring-0 transition-all duration-150 group-hover/avatar:scale-105">
                <AvatarImage src={userProfile.profilePicture} alt={userProfile.username} />
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(userProfile.username)} text-white font-semibold text-xs`}>
                  {userProfile.username[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <Link href={getProfileRoute(reply.authorId, userProfile.userType)} className="hover:text-[#F1592A] transition-colors duration-150">
                <span className="font-medium text-sm text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors duration-150 cursor-pointer">
                  {userProfile.username}
                </span>
              </Link>
              <div className="flex items-center gap-1 text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                <span>
                  {(() => {
                    const now = new Date()
                    const replyDate = new Date(reply.createdAt)
                    const diffInMinutes = Math.floor((now.getTime() - replyDate.getTime()) / (1000 * 60))
                    const diffInHours = Math.floor(diffInMinutes / 60)
                    const diffInDays = Math.floor(diffInHours / 24)
                    
                    if (diffInDays > 0) return `${diffInDays}d`
                    if (diffInHours > 0) return `${diffInHours}h`
                    if (diffInMinutes > 0) return `${diffInMinutes}m`
                    return 'now'
                  })()}
                </span>
              </div>
            </div>

            {/* Reply Content */}
            <div className="mb-2">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown 
                  className="text-[#232120] dark:text-[#E7E7E8] text-sm leading-relaxed"
                  remarkPlugins={[remarkBreaks]}
                >
                  {reply.content}
                </ReactMarkdown>
              </div>

              {reply.image && (
                <div className="mt-2">
                  <div className="relative h-24 w-full max-w-xs overflow-hidden rounded-md shadow-sm">
                    <Image 
                      src={reply.image} 
                      alt="Reply image" 
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-[#8E8F8E] dark:text-[#C3C3C3] hover:text-[#F1592A] transition-colors duration-150 font-medium"
              >
                Reply
              </button>
              
              {nestedReplies.length > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-[#8E8F8E] dark:text-[#C3C3C3] hover:text-[#F1592A] transition-colors duration-150 font-medium"
                >
                  {showReplies ? 'Hide' : 'Show'} {nestedReplies.length} {nestedReplies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}

              {/* Delete Button - Show for reply author or admin */}
              {(currentUserType === 'admin' || currentUser?.uid === reply.authorId) && (
                <button
                  onClick={() => onDeleteReply(reply.id)}
                  className="text-red-500 hover:text-red-600 transition-colors duration-150 font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reply Input */}
        {isReplying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-2 ml-8"
          >
            <div className="flex items-end gap-2 p-2 bg-[#F8F8F8]/50 dark:bg-[#1A1918]/50 rounded-lg border border-[#F1592A]/20">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your reply..."
                className="flex-1 min-h-[32px] max-h-[100px] bg-transparent border-0 
                  focus:ring-0 focus:outline-none resize-none text-sm py-1 px-2"
                rows={1}
                style={{ 
                  height: 'auto',
                  minHeight: '32px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                }}
              />
              <Button 
                onClick={handleReply} 
                size="sm"
                className="bg-[#F1592A] hover:bg-[#D14820] text-white text-xs px-3 py-1 h-7 rounded-md"
              >
                Reply
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Nested Replies */}
      <AnimatePresence>
        {showReplies && nestedReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1"
          >
            {nestedReplies.map((nestedReply) => (
              <ReplyComponent
                key={nestedReply.id}
                reply={nestedReply}
                allReplies={allReplies}
                onReply={onReply}
                userProfiles={userProfiles}
                currentUser={currentUser}
                currentUserType={currentUserType}
                onDeleteReply={onDeleteReply}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function PostPage({ params }: { params: { postId: string } }) {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [post, setPost] = useState<ForumPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userProfile, setUserProfile] = useState<{ profilePicture: string, username: string } | null>(null)
  const [sortBy, setSortBy] = useState('New')
  const [searchQuery, setSearchQuery] = useState('')
  const [allReplies, setAllReplies] = useState<Reply[]>([])
  const [userProfiles, setUserProfiles] = useState<{[key: string]: {profilePicture: string, username: string, userType: string}}>({})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [deleteConfirmReply, setDeleteConfirmReply] = useState<string | null>(null)
  const [userType, setUserType] = useState<string>('')

  

  const fetchPost = async () => {
    setLoading(true)
    try {
      const postDoc = await getDoc(doc(db, 'forumPosts', params.postId))
      if (postDoc.exists()) {
        const postData = postDoc.data()
        const repliesRef = collection(doc(db, 'forumPosts', params.postId), 'replies')
        const repliesSnapshot = await getDocs(query(repliesRef, orderBy('createdAt', 'desc')))
        
        const fetchedReplies = repliesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        })) as Reply[]
        
        setPost({
          id: postDoc.id,
          ...postData,
          createdAt: postData.createdAt.toDate(),
        } as ForumPost)
        setAllReplies(fetchedReplies)

        // Fetch user profiles for all reply authors
        const authorIds = new Set([postData.authorId, ...fetchedReplies.map(reply => reply.authorId)])
        const userProfilesPromises = Array.from(authorIds).map(async (authorId) => {
          const userDoc = await getDoc(doc(db, 'users', authorId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            return [authorId, {
              profilePicture: userData.profilePicture || '/assets/default-avatar.png',
              username: userData.username || 'Anonymous',
              userType: userData.userType || 'reader'
            }]
          }
          return [authorId, { profilePicture: '/assets/default-avatar.png', username: 'Anonymous', userType: 'reader' }]
        })
        const userProfilesArray = await Promise.all(userProfilesPromises)
        setUserProfiles(Object.fromEntries(userProfilesArray))
      } else {
        toast.error('Post not found')
        router.push('/forum')
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      toast.error('Failed to load post')
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

  const handleDeleteReply = async (replyId: string) => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'forumPosts', params.postId, 'replies', replyId))
      setAllReplies(prevReplies => prevReplies.filter(reply => reply.id !== replyId))
      toast.success('Reply deleted successfully')
      setDeleteConfirmReply(null)
    } catch (error) {
      console.error('Error deleting reply:', error)
      toast.error('Failed to delete reply')
    }
  }

  const handleReply = async (parentReplyId: string | null, content: string) => {
    if (!user) {
      toast.error('You must be logged in to reply')
      return
    }
    
    // Check if the reply content is empty or only contains whitespace
    if (!content.trim()) {
      toast.error('Cannot have blank reply')
      return
    }

    try {
      const newReply = {
        content: content.trim(), // Trim the content before saving
        author: userProfile?.username || 'Anonymous',
        authorId: user.uid,
        createdAt: serverTimestamp(),
        parentId: parentReplyId
      }
      
      const postRef = doc(db, 'forumPosts', params.postId)
      const repliesRef = collection(postRef, 'replies')
      const docRef = await addDoc(repliesRef, newReply)
      
      const addedReply = {
        id: docRef.id,
        ...newReply,
        createdAt: new Date()
      }
      
      setAllReplies(prevReplies => [addedReply, ...prevReplies])
      
      // Fetch the user's profile if it's not already in userProfiles
      if (!userProfiles[user.uid]) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserProfiles(prevProfiles => ({
            ...prevProfiles,
            [user.uid]: {
              profilePicture: userData.profilePicture || '/assets/default-avatar.png',
              username: userData.username || 'Anonymous',
              userType: userData.userType || 'reader'
            }
          }))
        }
      }
      
      toast.success('Reply added successfully')
      setReplyContent('')
    } catch (error) {
      console.error('Error adding reply:', error)
      toast.error('Failed to add reply')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault()
      handleReply(null, replyContent)
    } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      setReplyContent(prev => prev + '\n')
    }
  }

  const sortReplies = (replies: Reply[]): Reply[] => {
    switch (sortBy) {
      case 'New':
        return [...replies].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      case 'Old':
        return [...replies].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      default:
        return replies
    }
  }

  const filterReplies = (replies: Reply[]): Reply[] => {
    if (!searchQuery) return replies
    return replies.filter(reply => 
      reply.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  }

  const handleBackToForums = () => {
    const tab = post?.section || 'announcements'
    const page = searchParams.get('page') || '1'
    router.push(`/forum?tab=${tab}&page=${page}&scrollTo=${params.postId}`)
  }

  useEffect(() => {
    setMounted(true)
    fetchPost()
    if (user) {
      fetchUserProfile()
    }
  }, [user, params.postId])

  if (!mounted) return null

  return (
    <div className="relative isolate min-h-screen bg-gradient-to-b from-[#F8F8F8] to-white 
      dark:from-[#1A1918] dark:to-[#232120] text-[#232120] dark:text-[#E7E7E8]">
      <Toaster position="top-center" reverseOrder={false} />
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
                      <DropdownMenuContent className="w-64 p-0 bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl 
                        border border-[#F1592A]/20 dark:border-[#F1592A]/20 shadow-2xl shadow-black/10 rounded-2xl" align="end">
                        {/* User Header Section */}
                        <div className="p-4 bg-[#1E1E24]">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14 border-2 border-[#F1592A]">
                              <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                              <AvatarFallback className="bg-[#2A2A30] text-[#F1592A]">{userProfile?.username?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold">{userProfile?.username || "Username"}</p>
                                {userType === 'admin' && (
                                  <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded text-white">A</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{user.email}</p>
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
                        </div>
                        {/* Welcome Banner */}
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
                </div>

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

        <main className="flex-grow container max-w-full sm:max-w-[90vw] mx-auto px-4 py-12">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-[#F1592A]/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-4 border-[#F1592A] rounded-full animate-spin border-t-transparent" />
              </div>
            </div>
          ) : post ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl backdrop-blur-xl 
                bg-gradient-to-r from-white/80 to-white/60 dark:from-[#232120]/80 dark:to-[#232120]/60
                hover:from-white/90 hover:to-white/70 dark:hover:from-[#232120]/90 dark:hover:to-[#232120]/70
                border border-[#F1592A]/20 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-[#F1592A]/10
                transition-all duration-500 ease-in-out"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/3 to-transparent opacity-0 
                group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 p-6 sm:p-8 md:p-10">
                {/* Main Post Section */}
                <div className="flex flex-col md:flex-row gap-8 md:gap-10 mb-8">
                  {/* Author Section */}
                  <div className="w-full md:w-48 flex-shrink-0 mb-6 md:mb-0">
                    {/* Profile Card */}
                    <div className="relative overflow-hidden rounded-2xl backdrop-blur-sm 
                      bg-gradient-to-br from-slate-800/90 to-slate-900/90 dark:from-slate-800/90 dark:to-slate-900/90
                      border border-slate-700/50 shadow-2xl shadow-black/20 p-4 text-center">
                      
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/5 to-[#D14820]/5 opacity-50" />
                      
                      {/* Profile Content */}
                      <div className="relative z-10">
                        <Link href={getProfileRoute(post.authorId, userProfiles[post.authorId]?.userType || 'reader')} className="group/avatar">
                          <Avatar className="h-16 w-16 mx-auto mb-3 ring-4 ring-slate-600/50 shadow-xl hover:ring-[#F1592A]/50 transition-all duration-300 group-hover/avatar:scale-105">
                            <AvatarImage src={userProfiles[post.authorId]?.profilePicture || '/assets/default-avatar.png'} alt={post.author} />
                            <AvatarFallback className="bg-gradient-to-br from-[#F1592A] to-[#D14820] text-white text-lg font-bold">
                              {post.author[0]}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        
                        <Link href={getProfileRoute(post.authorId, userProfiles[post.authorId]?.userType || 'reader')} className="hover:text-[#F1592A] transition-colors duration-200">
                          <h3 className="font-bold text-base text-white mb-2 hover:text-[#F1592A] transition-colors duration-200 cursor-pointer">
                            {post.author}
                          </h3>
                        </Link>
                        
                        {/* User Role Badge */}
                        {(() => {
                          const authorProfile = userProfiles[post.authorId]
                          if (!authorProfile) return null
                          
                          const userRole = authorProfile.userType || 'user'
                          const roleBadge = getRoleBadge(userRole)
                          const RoleIcon = roleBadge.icon
                          
                          return (
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${roleBadge.className}`}>
                              <RoleIcon className="h-3 w-3" />
                              <span>{roleBadge.text}</span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                    
                    {/* Post Details - Simple Row Format */}
                    <div className="mt-4 space-y-2 text-xs text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#F1592A] rounded-full"></div>
                          <span className="text-[#F1592A] font-medium capitalize">{post.section}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-400 font-medium">{allReplies.length}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center gap-3 text-[#8E8F8E] dark:text-[#C3C3C3]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>
                            {new Date(post.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                      <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent 
                        bg-gradient-to-r from-[#F1592A] to-[#D14820] leading-tight">
                        {post.title}
                      </h1>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 
                          text-[#F1592A] hover:from-[#F1592A]/20 hover:to-[#D14820]/20 
                          border-[#F1592A]/30 hover:border-[#F1592A]/50 shadow-sm hover:shadow-md
                          transition-all duration-300 rounded-xl px-6 py-3 font-medium"
                        onClick={handleBackToForums}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Forums
                      </Button>
                    </div>

                    {/* Content with conditional layout based on image presence */}
                    <div className={`flex ${post.image ? 'flex-col lg:flex-row gap-8' : 'flex-col'}`}>
                      {/* Text Content */}
                      <div className={`prose dark:prose-invert max-w-none ${post.image ? 'lg:w-[60%]' : 'w-full'}`}>
                        <ReactMarkdown className="text-[#232120] dark:text-[#E7E7E8] text-lg leading-relaxed">
                          {post.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Image Section */}
                      {post.image && (
                        <div className="lg:w-[40%] flex-shrink-0">
                          <div className="relative overflow-hidden rounded-xl shadow-2xl h-64 lg:h-80">
                            <Image 
                              src={post.image} 
                              alt="Post image" 
                              width={600} 
                              height={400} 
                              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discussion Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#F1592A]/30 to-transparent"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F1592A] to-[#D14820] 
                      flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent 
                      bg-gradient-to-r from-[#232120] to-[#3E3F3E] dark:from-[#E7E7E8] dark:to-[#C3C3C3]">
                      Discussion ({allReplies.filter(r => !r.parentId).length})
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"
                          className="bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 
                            text-[#F1592A] border-[#F1592A]/30 hover:from-[#F1592A]/20 hover:to-[#D14820]/20
                            hover:border-[#F1592A]/50 transition-all duration-300 rounded-lg px-3 py-1 text-xs">
                          Sort: {sortBy} <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl 
                        border border-[#F1592A]/20 rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={() => setSortBy('New')} 
                          className="hover:bg-[#F1592A]/10 transition-colors duration-200">
                          New
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('Old')}
                          className="hover:bg-[#F1592A]/10 transition-colors duration-200">
                          Old
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#F1592A]/30 to-transparent"></div>
                </div>

                {/* Reply Input */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="relative overflow-hidden rounded-xl backdrop-blur-sm 
                      bg-gradient-to-r from-[#F8F8F8]/60 to-[#F8F8F8]/40 dark:from-[#1A1918]/60 dark:to-[#1A1918]/40
                      border border-[#F1592A]/20 shadow-sm mb-6"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/3 to-transparent opacity-50" />
                    
                    <div className="relative z-10 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8 ring-2 ring-[#F1592A]/30">
                          <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                          <AvatarFallback className="bg-gradient-to-br from-[#F1592A] to-[#D14820] text-white font-semibold text-xs">
                            {userProfile?.username?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-[#232120] dark:text-[#E7E7E8]">
                          Reply as {userProfile?.username}
                        </span>
                      </div>
                      <div className="flex items-end gap-3">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Write your reply... (Press Enter to submit)"
                          className="flex-1 min-h-[40px] max-h-[120px] bg-white/60 dark:bg-black/60 border border-[#F1592A]/30 
                            backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-[#F1592A]/50
                            text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3]
                            rounded-xl resize-none transition-all duration-300 py-2 px-3 text-sm
                            scrollbar-thin scrollbar-thumb-[#F1592A]/20 scrollbar-track-transparent"
                          rows={1}
                          style={{ 
                            height: 'auto',
                            minHeight: '40px'
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                          }}
                        />
                        <Button 
                          onClick={() => handleReply(null, replyContent)} 
                          size="sm"
                          className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                            hover:from-[#D14820] hover:to-[#F1592A] shadow-md hover:shadow-lg
                            transition-all duration-300 rounded-xl px-4 py-2 font-medium h-10 flex-shrink-0"
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Replies List */}
                <div className="space-y-2">
                  {filterReplies(sortReplies(allReplies.filter(r => !r.parentId))).map((reply, index) => (
                    <motion.div
                      key={reply.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ReplyComponent
                        reply={reply}
                        allReplies={allReplies}
                        onReply={handleReply}
                        userProfiles={userProfiles}
                        currentUser={user}
                        currentUserType={userType}
                        onDeleteReply={(replyId) => setDeleteConfirmReply(replyId)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-[#232120] dark:text-[#E7E7E8]">Post not found</div>
          )}
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
                    Made with <span className="text-red-500">♥</span> for fiction lovers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmReply} onOpenChange={() => setDeleteConfirmReply(null)}>
          <DialogContent className="sm:max-w-[425px] bg-[#E7E7E8]/95 dark:bg-[#232120]/95 backdrop-blur-xl 
            border border-[#F1592A]/20 shadow-2xl shadow-black/10 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#232120] dark:text-[#E7E7E8]">
                Confirm Delete
              </DialogTitle>
              <p className="text-[#8E8F8E] dark:text-[#C3C3C3] mt-2">
                Are you sure you want to delete this reply? This action cannot be undone.
              </p>
            </DialogHeader>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmReply(null)}
                className="flex-1 border-[#8E8F8E] hover:bg-[#F8F8F8] dark:hover:bg-[#2A2827]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteConfirmReply && handleDeleteReply(deleteConfirmReply)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Reply
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
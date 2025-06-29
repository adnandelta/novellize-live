'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Moon, Sun, LogOut, User, Home, MessageSquare, ChevronDown, ChevronUp, ChevronLeft, ChevronsLeftRight, Flame, BookOpen, Crown, Sparkles, Menu, X, Library, Trash2 } from "lucide-react"
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

// Determine profile route based on user type
const getProfileRoute = (authorId: string, userType: string) => {
  if (userType === 'author') {
    return `/author/${authorId}`
  }
  return `/user_profile?userId=${authorId}`
}

const ReplyComponent = ({ reply, allReplies, onReply, userProfiles, currentUser, currentUserType, onDeleteReply }: { 
  reply: Reply, 
  allReplies: Reply[], 
  onReply: (parentReplyId: string, content: string) => void, 
  userProfiles: {[key: string]: {profilePicture: string, username: string, userType: string}},
  currentUser: any,
  currentUserType: string,
  onDeleteReply: (replyId: string) => void
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="mt-4 sm:mt-6 first:mt-0"
    >
      <div className="group relative overflow-hidden rounded-3xl backdrop-blur-sm 
        bg-gradient-to-br from-white/60 via-white/40 to-white/20 
        dark:from-[#232120]/60 dark:via-[#232120]/40 dark:to-[#232120]/20
        hover:from-white/80 hover:via-white/60 hover:to-white/40
        dark:hover:from-[#232120]/80 dark:hover:via-[#232120]/60 dark:hover:to-[#232120]/40
        border-0 shadow-sm hover:shadow-lg hover:shadow-[#F1592A]/5
        transition-all duration-300 ease-in-out"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/2 via-transparent to-[#D14820]/2 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            {/* Avatar Section */}
            <div className="flex-shrink-0">
              <Link href={getProfileRoute(reply.authorId, userProfile.userType)} className="group/avatar">
                <Avatar className="h-11 w-11 ring-0 shadow-md hover:shadow-lg transition-all duration-200 group-hover/avatar:scale-105">
                  <AvatarImage src={userProfile.profilePicture} alt={userProfile.username} />
                  <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(userProfile.username)} text-white font-semibold text-sm`}>
                    {userProfile.username[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
            
            {/* Content Section */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-2">
                <div className="flex items-center gap-3">
                  <Link href={getProfileRoute(reply.authorId, userProfile.userType)} className="hover:text-[#F1592A] transition-colors duration-200">
                    <span className="font-semibold text-[#232120] dark:text-[#E7E7E8] hover:text-[#F1592A] transition-colors duration-200 cursor-pointer">
                      {userProfile.username}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                    <span>
                      {reply.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {reply.createdAt.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reply Content */}
              <div className="mb-3">
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown 
                    className="text-[#232120] dark:text-[#E7E7E8] text-base leading-relaxed"
                    remarkPlugins={[remarkBreaks]}
                  >
                    {reply.content}
                  </ReactMarkdown>
                </div>

                {reply.image && (
                  <div className="mt-3">
                    <div className="relative h-48 w-full max-w-md overflow-hidden rounded-2xl shadow-md">
                      <Image 
                        src={reply.image} 
                        alt="Reply image" 
                        fill
                        className="object-cover transform group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium
                    bg-[#F1592A]/8 text-[#F1592A] hover:bg-[#F1592A]/15 
                    border-0 transition-all duration-300"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Reply
                </motion.button>
                
                {nestedReplies.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowReplies(!showReplies)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium
                      bg-slate-500/8 text-slate-600 dark:text-slate-400 hover:bg-slate-500/15 
                      border-0 transition-all duration-300"
                  >
                    {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {nestedReplies.length} {nestedReplies.length === 1 ? 'reply' : 'replies'}
                  </motion.button>
                )}

                {/* Delete Button - Show for reply author or admin */}
                {(currentUserType === 'admin' || currentUser?.uid === reply.authorId) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onDeleteReply(reply.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium
                      bg-red-500/8 text-red-500 hover:bg-red-500/15 
                      border-0 transition-all duration-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </motion.button>
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
              transition={{ duration: 0.2 }}
              className="mt-4 sm:mt-6"
            >
              <div className="relative overflow-hidden rounded-3xl backdrop-blur-sm 
                bg-gradient-to-br from-[#F8F8F8]/60 via-[#F8F8F8]/40 to-[#F8F8F8]/20 
                dark:from-[#1A1918]/60 dark:via-[#1A1918]/40 dark:to-[#1A1918]/20
                border-0 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F1592A]/3 via-transparent to-[#D14820]/3 opacity-50" />
                
                <div className="relative z-10 p-4">
                  <div className="flex items-end gap-3">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Write your reply... (Press Enter to submit, Ctrl+Enter for new line)"
                      className="flex-1 min-h-[48px] max-h-[200px] bg-white/50 dark:bg-black/50 border-0 
                        backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/30 focus:border-0
                        text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3]
                        rounded-3xl resize-none transition-all duration-300 py-3 px-4
                        scrollbar-thin scrollbar-thumb-[#F1592A]/20 scrollbar-track-transparent"
                      rows={1}
                      style={{ 
                        height: 'auto',
                        minHeight: '48px'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                      }}
                    />
                    <Button 
                      onClick={handleReply} 
                      className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                        hover:from-[#D14820] hover:to-[#F1592A] shadow-md hover:shadow-lg
                        transition-all duration-300 rounded-3xl px-6 py-3 font-medium h-12 flex-shrink-0
                        border-0"
                    >
                      Submit Reply
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      <AnimatePresence>
        {showReplies && nestedReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-6 mt-4 space-y-4 pl-4 border-l border-[#F1592A]/15"
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
            <div className="space-y-8">
              {/* Main Post Card */}
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
                  <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                    {/* Author Section */}
                    <div className="w-full md:w-52 flex-shrink-0 flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-6 mb-6 md:mb-0 pb-6 md:pb-0 border-b md:border-b-0 border-[#F1592A]/10">
                      <Link href={getProfileRoute(post.authorId, userProfiles[post.authorId]?.userType || 'reader')} className="group/avatar">
                        <Avatar className="h-20 w-20 md:h-28 md:w-28 ring-4 ring-[#F1592A]/30 shadow-xl hover:ring-[#F1592A]/50 transition-all duration-300 group-hover/avatar:scale-105">
                          <AvatarImage src={userProfiles[post.authorId]?.profilePicture || '/assets/default-avatar.png'} alt={post.author} />
                          <AvatarFallback className="bg-gradient-to-br from-[#F1592A] to-[#D14820] text-white text-2xl font-bold">
                            {post.author[0]}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="text-left md:text-center">
                        <Link href={getProfileRoute(post.authorId, userProfiles[post.authorId]?.userType || 'reader')} className="hover:text-[#F1592A] transition-colors duration-200">
                          <h3 className="font-bold text-xl text-[#232120] dark:text-[#E7E7E8] mb-2 hover:text-[#F1592A] transition-colors duration-200 cursor-pointer">{post.author}</h3>
                        </Link>
                        <p className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3] mb-1">
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3] mb-3">
                          {new Date(post.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <Badge variant="outline" 
                          className="bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 text-[#F1592A] 
                          border-[#F1592A]/30 font-medium px-3 py-1">
                          {post.section}
                        </Badge>
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

                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown className="text-[#232120] dark:text-[#E7E7E8] text-lg leading-relaxed">
                          {post.content}
                        </ReactMarkdown>
                        {post.image && (
                          <div className="mt-8">
                            <div className="relative overflow-hidden rounded-xl shadow-2xl">
                              <Image 
                                src={post.image} 
                                alt="Post image" 
                                width={600} 
                                height={400} 
                                className="w-full max-w-[500px] h-auto mx-auto transform hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Replies Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl backdrop-blur-xl 
                  bg-gradient-to-r from-white/80 to-white/60 dark:from-[#232120]/80 dark:to-[#232120]/60
                  border border-[#F1592A]/20 shadow-2xl shadow-black/5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/2 to-transparent opacity-50" />
                
                <div className="relative z-10 p-6 sm:p-8">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F1592A] to-[#D14820] 
                        flex items-center justify-center shadow-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent 
                        bg-gradient-to-r from-[#232120] to-[#3E3F3E] dark:from-[#E7E7E8] dark:to-[#C3C3C3]">
                        Discussion ({allReplies.filter(r => !r.parentId).length})
                      </h2>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" 
                          className="w-full sm:w-auto bg-gradient-to-r from-[#F1592A]/10 to-[#D14820]/10 
                            text-[#F1592A] border-[#F1592A]/30 hover:from-[#F1592A]/20 hover:to-[#D14820]/20
                            hover:border-[#F1592A]/50 transition-all duration-300 rounded-xl px-4 py-2">
                          Sort by: {sortBy} <ChevronDown className="ml-2 h-4 w-4" />
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

                  {/* Reply Input */}
                  {user && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="relative overflow-hidden rounded-xl backdrop-blur-sm 
                        bg-gradient-to-r from-[#F8F8F8]/80 to-[#F8F8F8]/60 dark:from-[#1A1918]/80 dark:to-[#1A1918]/60
                        border border-[#F1592A]/20 shadow-lg mb-8"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/5 to-transparent opacity-50" />
                      
                      <div className="relative z-10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-10 w-10 ring-2 ring-[#F1592A]/30">
                            <AvatarImage src={userProfile?.profilePicture} alt={userProfile?.username} />
                            <AvatarFallback className="bg-gradient-to-br from-[#F1592A] to-[#D14820] text-white font-semibold">
                              {userProfile?.username?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-[#232120] dark:text-[#E7E7E8]">
                            Reply as {userProfile?.username}
                          </span>
                        </div>
                        <div className="flex items-end gap-3">
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write your reply... (Press Enter to submit, Ctrl+Enter for new line)"
                            className="flex-1 min-h-[48px] max-h-[200px] bg-white/60 dark:bg-black/60 border border-[#F1592A]/30 
                              backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-[#F1592A]/50
                              text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3]
                              rounded-2xl resize-none transition-all duration-300 py-3 px-4
                              scrollbar-thin scrollbar-thumb-[#F1592A]/20 scrollbar-track-transparent"
                            rows={1}
                            style={{ 
                              height: 'auto',
                              minHeight: '48px'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                            }}
                          />
                          <Button 
                            onClick={() => handleReply(null, replyContent)} 
                            className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                              hover:from-[#D14820] hover:to-[#F1592A] shadow-lg hover:shadow-xl
                              transition-all duration-300 rounded-2xl px-6 py-3 font-medium h-12 flex-shrink-0"
                          >
                            Submit Reply
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Replies List */}
                  <div className="space-y-6">
                    {filterReplies(sortReplies(allReplies.filter(r => !r.parentId))).map((reply, index) => (
                      <motion.div
                        key={reply.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
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
            </div>
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
                    Made with <span className="text-red-500">♥</span> for readers
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
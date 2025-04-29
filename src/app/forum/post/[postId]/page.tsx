'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Moon, Sun, LogOut, User, Home, MessageSquare, ChevronDown, ChevronUp, ChevronLeft, ChevronsLeftRight, Flame, BookOpen, Crown, Sparkles, Menu, X, Library } from "lucide-react"
import Link from "next/link"
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/authcontext'
import { signOut } from 'firebase/auth'
import { auth, db} from '@/lib/firebaseConfig'
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp,doc, getDoc} from 'firebase/firestore'
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

const ReplyComponent = ({ reply, allReplies, onReply, userProfiles }: { reply: Reply, allReplies: Reply[], onReply: (parentReplyId: string, content: string) => void, userProfiles: {[key: string]: {profilePicture: string, username: string}} }) => {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [showReplies, setShowReplies] = useState(false)
  const { user } = useAuth()

  const nestedReplies = allReplies.filter(r => r.parentId === reply.id)
  const userProfile = userProfiles[reply.authorId] || { profilePicture: '/assets/default-avatar.png', username: reply.author }

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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="mt-4 sm:mt-6 first:mt-0"
    >
      <div className="group relative overflow-hidden rounded-xl backdrop-blur-xl 
        bg-gradient-to-r from-white/5 to-white/10 dark:from-black/5 dark:to-black/10
        hover:from-white/10 hover:to-white/15 dark:hover:from-black/10 dark:hover:to-black/15
        transition-all duration-300 ease-in-out"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/5 to-transparent opacity-0 
          group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6">
            <div className="flex sm:flex-col items-center space-y-0 sm:space-y-2 gap-3 sm:gap-0">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-[#F1592A]/20 rounded-full">
                <AvatarImage src={userProfile.profilePicture} alt={userProfile.username} />
                <AvatarFallback>{userProfile.username[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                <span className="text-sm font-medium text-[#232120] dark:text-[#E7E7E8]">{userProfile.username}</span>
                <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                  {reply.createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className="text-xs text-[#8E8F8E] dark:text-[#C3C3C3]">
                  {reply.createdAt.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      className="text-[#232120] dark:text-[#E7E7E8] text-base leading-relaxed"
                      remarkPlugins={[remarkBreaks]}
                    >
                      {reply.content}
                    </ReactMarkdown>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6 mt-4 sm:mt-6">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[#8E8F8E] dark:text-[#C3C3C3] hover:text-[#F1592A] hover:bg-[#F1592A]/10
                              transition-colors duration-200 flex items-center" 
                            onClick={() => setIsReplying(!isReplying)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Reply
                          </Button>
                          {nestedReplies.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowReplies(!showReplies)}
                              className="text-[#8E8F8E] dark:text-[#C3C3C3] hover:text-[#F1592A] hover:bg-[#F1592A]/10
                                transition-colors duration-200 flex items-center"
                            >
                              {showReplies ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                              {showReplies ? 'Hide Replies' : `Show Replies (${nestedReplies.length})`}
                            </Button>
                          )}
                        </div>
                        <div className="text-[#8E8F8E] dark:text-[#C3C3C3] text-sm">
                          {Math.ceil(reply.content.length / 200)} min read
                        </div>
                      </div>
                    </div>

                    {reply.image && (
                      <div className="relative h-36 w-full sm:w-48 max-w-[300px] flex-shrink-0 overflow-hidden rounded-lg mx-auto sm:mx-0">
                        <Image 
                          src={reply.image} 
                          alt="Reply image" 
                          fill
                          className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isReplying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 sm:mt-6"
                >
                  <Card className="bg-[#F8F8F8]/50 dark:bg-[#1A1918]/50 border-none">
                    <CardContent className="p-3 sm:p-4">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write your reply... (Press Enter to submit, Ctrl+Enter for new line)"
                        className="w-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 
                          backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-transparent
                          text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3]"
                      />
                      <Button 
                        onClick={handleReply} 
                        className="mt-3 w-full sm:w-auto bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                          hover:from-[#D14820] hover:to-[#F1592A] transition-all duration-300"
                      >
                        Submit Reply
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReplies && nestedReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-3 sm:ml-12 mt-3 sm:mt-4 space-y-3 sm:space-y-4 pl-3 sm:pl-6 border-l-2 border-[#F1592A]/20"
          >
            {nestedReplies.map((nestedReply) => (
              <ReplyComponent
                key={nestedReply.id}
                reply={nestedReply}
                allReplies={allReplies}
                onReply={onReply}
                userProfiles={userProfiles}
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
  const [userProfiles, setUserProfiles] = useState<{[key: string]: {profilePicture: string, username: string}}>({})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  

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
              username: userData.username || 'Anonymous'
            }]
          }
          return [authorId, { profilePicture: '/assets/default-avatar.png', username: 'Anonymous' }]
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
              username: userData.username || 'Anonymous'
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

              <div className="flex items-center gap-4">
                <div className="hidden lg:flex relative w-[300px]">
                  <Input
                    type="text"
                    placeholder="Search forum..."
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
                        <AvatarFallback>{userProfile?.username?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-0 bg-[#1E1E24] border-[#2A2A30] text-white shadow-xl" align="end">
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
                          
                          <div className="absolute right-2 bottom-0 opacity-20">
                            <MessageSquare className="h-12 w-12" />
                          </div>
                        </div>
                      </div>
                      
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

            {isMobileMenuOpen && (
              <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 py-6">
                <div className="flex flex-col space-y-5 px-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search forum..."
                      className="pl-10 pr-4 py-2.5 w-full bg-white dark:bg-[#2A2827] border-[#F1592A] border-opacity-50 rounded-full focus-visible:ring-[#F1592A]"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-[#F1592A]/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-4 border-[#F1592A] rounded-full animate-spin border-t-transparent" />
              </div>
            </div>
          ) : post ? (
            <div className="space-y-6">
              <Card className="backdrop-blur-xl bg-white/80 dark:bg-[#232120]/80 border-none shadow-lg">
                <CardContent className="p-3 sm:p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    <div className="w-full md:w-48 flex-shrink-0 flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-4 mb-4 md:mb-0 pb-4 md:pb-0 border-b md:border-b-0 border-[#F1592A]/10">
                      <Avatar className="h-16 w-16 md:h-24 md:w-24 ring-4 ring-[#F1592A]/20">
                        <AvatarImage src={userProfiles[post.authorId]?.profilePicture || '/assets/default-avatar.png'} alt={post.author} />
                        <AvatarFallback>{post.author[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-left md:text-center">
                        <h3 className="font-semibold text-lg text-[#232120] dark:text-[#E7E7E8]">{post.author}</h3>
                        <p className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-[#8E8F8E] dark:text-[#C3C3C3]">
                          {new Date(post.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" 
                        className="md:mt-2 bg-[#F1592A]/5 text-[#F1592A] border-[#F1592A]/20">
                        {post.section}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent 
                          bg-gradient-to-r from-[#F1592A] to-[#D14820]">
                          {post.title}
                        </h1>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto bg-[#F1592A]/10 text-[#F1592A] hover:bg-[#F1592A]/20 border-none"
                          onClick={handleBackToForums}
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Back to Forums
                        </Button>
                      </div>

                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown className="text-[#232120] dark:text-[#E7E7E8] text-base sm:text-lg">
                          {post.content}
                        </ReactMarkdown>
                        {post.image && (
                          <div className="mt-6">
                            <Image 
                              src={post.image} 
                              alt="Post image" 
                              width={600} 
                              height={400} 
                              className="w-full max-w-[450px] h-auto rounded-lg shadow-lg mx-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="backdrop-blur-xl bg-white/80 dark:bg-[#232120]/80 rounded-lg p-3 sm:p-6 border-none shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent 
                    bg-gradient-to-r from-[#232120] to-[#3E3F3E] dark:from-[#E7E7E8] dark:to-[#C3C3C3]">
                    Replies
                  </h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto text-[#8E8F8E] border-[#F1592A]/20">
                        Sort by: {sortBy} <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white/80 dark:bg-[#232120]/80 backdrop-blur-lg border-none">
                      <DropdownMenuItem onClick={() => setSortBy('New')}>New</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('Old')}>Old</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {user && (
                  <Card className="bg-[#F8F8F8]/50 dark:bg-[#1A1918]/50 mb-6 border-none">
                    <CardContent className="p-3 sm:p-4">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write your reply... (Press Enter to submit, Ctrl+Enter for new line)"
                        className="w-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 
                          backdrop-blur-sm focus:ring-2 focus:ring-[#F1592A]/50 focus:border-transparent
                          text-[#232120] dark:text-[#E7E7E8] placeholder-[#8E8F8E] dark:placeholder-[#C3C3C3]"
                      />
                      <Button 
                        onClick={() => handleReply(null, replyContent)} 
                        className="mt-3 bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white 
                          hover:from-[#D14820] hover:to-[#F1592A]"
                      >
                        Submit Reply
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-6">
                  {filterReplies(sortReplies(allReplies.filter(r => !r.parentId))).map((reply) => (
                    <ReplyComponent
                      key={reply.id}
                      reply={reply}
                      allReplies={allReplies}
                      onReply={handleReply}
                      userProfiles={userProfiles}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-[#232120] dark:text-[#E7E7E8]">Post not found</div>
          )}
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
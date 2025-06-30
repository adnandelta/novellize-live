'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Moon, Sun, LogOut, User, Home, BookOpen, ExternalLink, Calendar, Clock, Eye, Heart, Share2, Download, Star, Bookmark, ThumbsUp, MessageSquare, Copy, Facebook, Twitter, Linkedin } from "lucide-react"
import Link from "next/link"
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useAuth } from '../../../authcontext'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter, useParams } from 'next/navigation'
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

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
  createdAt: any
  updatedAt: any
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

interface Comment {
  id: string
  content: string
  author: string
  authorId: string
  authorAvatar?: string
  createdAt: any
  likes: string[]
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

const ShareButton = ({ resource }: { resource: Resource }) => {
  const [showShareMenu, setShowShareMenu] = useState(false)
  
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = `Check out this resource: ${resource.title}`
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard!')
    setShowShareMenu(false)
  }
  
  const shareToSocial = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(shareTitle)
    
    let shareLink = ''
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
        break
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        break
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400')
    }
    setShowShareMenu(false)
  }

  return (
    <DropdownMenu open={showShareMenu} onOpenChange={setShowShareMenu}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-slate-800 border-slate-700">
        <DropdownMenuItem onClick={copyToClipboard} className="text-gray-300 hover:text-white">
          <Copy className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => shareToSocial('twitter')} className="text-gray-300 hover:text-white">
          <Twitter className="mr-2 h-4 w-4" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => shareToSocial('facebook')} className="text-gray-300 hover:text-white">
          <Facebook className="mr-2 h-4 w-4" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => shareToSocial('linkedin')} className="text-gray-300 hover:text-white">
          <Linkedin className="mr-2 h-4 w-4" />
          LinkedIn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const CommentSection = ({ resourceId, userProfile }: { resourceId: string, userProfile: any }) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchComments()
  }, [resourceId])

  const fetchComments = async () => {
    try {
      const commentsRef = collection(db, 'resourceComments')
      const q = query(
        commentsRef, 
        where('resourceId', '==', resourceId),
        // orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[]
      
      // Sort manually since we can't use orderBy with where clause on different fields
      commentsData.sort((a, b) => b.createdAt?.toDate?.()?.getTime() - a.createdAt?.toDate?.()?.getTime())
      
      setComments(commentsData)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || !userProfile) {
      toast.error('Please sign in to comment')
      return
    }

    setLoading(true)
    try {
      await addDoc(collection(db, 'resourceComments'), {
        resourceId,
        content: newComment.trim(),
        author: userProfile.displayName || user.email,
        authorId: userProfile.id,
        authorAvatar: userProfile.profilePicture || '',
        createdAt: serverTimestamp(),
        likes: []
      })
      
      setNewComment('')
      await fetchComments()
      toast.success('Comment added!')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user || !userProfile) {
      toast.error('Please sign in to like comments')
      return
    }

    try {
      const commentRef = doc(db, 'resourceComments', commentId)
      const comment = comments.find(c => c.id === commentId)
      
      if (comment?.likes.includes(userProfile.id)) {
        await updateDoc(commentRef, {
          likes: arrayRemove(userProfile.id)
        })
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(userProfile.id)
        })
      }
      
      await fetchComments()
    } catch (error) {
      console.error('Error updating comment like:', error)
      toast.error('Failed to update like')
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white">Comments ({comments.length})</h3>
      
      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <Textarea
            placeholder="Share your thoughts about this resource..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
          />
          <Button 
            type="submit" 
            disabled={loading || !newComment.trim()}
            className="bg-gradient-to-r from-[#F1592A] to-[#D14820] hover:from-[#D14820] to-[#F1592A]"
          >
            {loading ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      )}
      
      <div className="space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.authorAvatar} />
                  <AvatarFallback className="bg-[#F1592A] text-white text-sm">
                    {comment.author[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-white">{comment.author}</span>
                    <span className="text-xs text-gray-400">
                      {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mb-3 leading-relaxed">{comment.content}</p>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleLikeComment(comment.id)}
                    className={`h-8 px-3 ${
                      userProfile && comment.likes.includes(userProfile.id)
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className={`h-3 w-3 mr-1 ${
                      userProfile && comment.likes.includes(userProfile.id) ? 'fill-current' : ''
                    }`} />
                    {comment.likes.length}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResourceDetailPage() {
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [relatedResources, setRelatedResources] = useState<Resource[]>([])

  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const resourceId = params.resourceId as string

  useEffect(() => {
    if (resourceId) {
      fetchResource()
      incrementViews()
    }
    
    if (user) {
      fetchUserProfile()
    }
  }, [resourceId, user])

  useEffect(() => {
    if (resource) {
      fetchRelatedResources()
    }
  }, [resource])

  const fetchResource = async () => {
    try {
      setLoading(true)
      const resourceRef = doc(db, 'resources', resourceId)
      const resourceSnap = await getDoc(resourceRef)
      
      if (resourceSnap.exists()) {
        setResource({ id: resourceSnap.id, ...resourceSnap.data() } as Resource)
      } else {
        toast.error('Resource not found')
        router.push('/forum/resources')
      }
    } catch (error) {
      console.error('Error fetching resource:', error)
      toast.error('Failed to load resource')
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

  const fetchRelatedResources = async () => {
    if (!resource) return
    
    try {
      const resourcesRef = collection(db, 'resources')
      const q = query(resourcesRef)
      const snapshot = await getDocs(q)
      
      const allResources = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resource[]
      
      // Filter related resources by category or tags
      const related = allResources
        .filter(r => r.id !== resource.id)
        .filter(r => 
          r.category === resource.category || 
          r.tags.some(tag => resource.tags.includes(tag))
        )
        .slice(0, 3)
      
      setRelatedResources(related)
    } catch (error) {
      console.error('Error fetching related resources:', error)
    }
  }

  const incrementViews = async () => {
    try {
      const resourceRef = doc(db, 'resources', resourceId)
      await updateDoc(resourceRef, {
        views: increment(1)
      })
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const handleLike = async () => {
    if (!user || !userProfile || !resource) {
      toast.error('Please sign in to like resources')
      return
    }

    try {
      const resourceRef = doc(db, 'resources', resourceId)
      
      if (resource.likes.includes(userProfile.id)) {
        await updateDoc(resourceRef, {
          likes: arrayRemove(userProfile.id)
        })
      } else {
        await updateDoc(resourceRef, {
          likes: arrayUnion(userProfile.id)
        })
      }
      
      await fetchResource()
    } catch (error) {
      console.error('Error updating like:', error)
      toast.error('Failed to update like')
    }
  }

  const handleBookmark = async () => {
    if (!user || !userProfile || !resource) {
      toast.error('Please sign in to bookmark resources')
      return
    }

    try {
      const resourceRef = doc(db, 'resources', resourceId)
      
      if (resource.bookmarks.includes(userProfile.id)) {
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
      
      await fetchResource()
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog': return <BookOpen className="h-5 w-5" />
      case 'link': return <ExternalLink className="h-5 w-5" />
      case 'guide': return <Star className="h-5 w-5" />
      case 'tool': return <Star className="h-5 w-5" />
      case 'template': return <Download className="h-5 w-5" />
      default: return <BookOpen className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F1592A] mx-auto mb-4"></div>
          <p className="text-white">Loading resource...</p>
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Resource not found</h1>
          <Button asChild className="bg-gradient-to-r from-[#F1592A] to-[#D14820]">
            <Link href="/forum/resources">Back to Resources</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isLiked = userProfile ? resource.likes.includes(userProfile.id) : false
  const isBookmarked = userProfile ? resource.bookmarks.includes(userProfile.id) : false

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          asChild 
          className="mb-6 text-gray-400 hover:text-white"
        >
          <Link href="/forum/resources">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Resource Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {resource.image && (
                <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden">
                  <Image
                    src={resource.image}
                    alt={resource.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {resource.featured && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white border-0">
                        Featured
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[#F1592A]">
                  {getTypeIcon(resource.type)}
                  <span className="font-medium capitalize">{resource.type}</span>
                  <Badge className={`text-xs ${getDifficultyColor(resource.difficulty)}`}>
                    {resource.difficulty}
                  </Badge>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  {resource.title}
                </h1>

                <p className="text-xl text-gray-300 leading-relaxed">
                  {resource.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{resource.views} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{resource.estimatedReadTime} min read</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{resource.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}</span>
                  </div>
                  <span>By {resource.author}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="bg-[#F1592A]/10 text-[#F1592A] border-[#F1592A]/30">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={handleLike}
                    variant="outline"
                    size="sm"
                    className={`bg-white/5 border-white/20 ${isLiked ? 'text-red-400 hover:text-red-300' : 'text-white hover:bg-white/10'}`}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {resource.likes.length}
                  </Button>

                  <Button
                    onClick={handleBookmark}
                    variant="outline"
                    size="sm"
                    className={`bg-white/5 border-white/20 ${isBookmarked ? 'text-[#F1592A] hover:text-[#D14820]' : 'text-white hover:bg-white/10'}`}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                    {resource.bookmarks.length}
                  </Button>

                  <ShareButton resource={resource} />

                  {(resource.externalUrl || resource.downloadUrl) && (
                    <Button
                      asChild
                      className="bg-gradient-to-r from-[#F1592A] to-[#D14820] hover:from-[#D14820] to-[#F1592A]"
                    >
                      <Link href={resource.externalUrl || resource.downloadUrl || '#'} target="_blank">
                        {resource.type === 'template' ? (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Resource
                          </>
                        )}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            <Separator className="bg-white/10" />

            {/* Resource Content */}
            {resource.type !== 'link' && resource.content && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="prose prose-invert prose-lg max-w-none"
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-8">
                    <div 
                      className="text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: resource.content.replace(/\n/g, '<br>') }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <Separator className="bg-white/10" />

            {/* Comments Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CommentSection resourceId={resourceId} userProfile={userProfile} />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resource Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Resource Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-gray-400 text-sm">Category</span>
                  <p className="text-white font-medium">{resource.category}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Type</span>
                  <p className="text-white font-medium capitalize">{resource.type}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Difficulty</span>
                  <Badge className={getDifficultyColor(resource.difficulty)}>
                    {resource.difficulty}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Last Updated</span>
                  <p className="text-white font-medium">
                    {resource.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Related Resources */}
            {relatedResources.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Related Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedResources.map((related) => (
                    <Link 
                      key={related.id} 
                      href={`/forum/resources/${related.id}`}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <h4 className="text-white font-medium mb-1 line-clamp-2">{related.title}</h4>
                      <p className="text-gray-400 text-sm line-clamp-2">{related.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-[#F1592A]/10 text-[#F1592A] border-[#F1592A]/30">
                          {related.type}
                        </Badge>
                        <span className="text-xs text-gray-400">{related.estimatedReadTime} min</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
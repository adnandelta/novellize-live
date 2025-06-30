'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Moon, Sun, LogOut, User, Home, BookOpen, ExternalLink, Calendar, Clock, Eye, Heart, Share2, Download, Star, Bookmark, ThumbsUp, MessageSquare, Copy, Facebook, Twitter, Linkedin, Library, Tag } from "lucide-react"
import Link from "next/link"
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useAuth } from '../../../authcontext'
import { signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore'
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
        author: userProfile.displayName || userProfile.username || 'Anonymous',
        authorId: user.uid,
        authorAvatar: userProfile.avatar || user.photoURL,
        createdAt: serverTimestamp(),
        likes: []
      })

      setNewComment('')
      toast.success('Comment added successfully!')
      await fetchComments()
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to like comments')
      return
    }

    try {
      const commentRef = doc(db, 'resourceComments', commentId)
      const comment = comments.find(c => c.id === commentId)
      
      if (comment?.likes.includes(user.uid)) {
        await updateDoc(commentRef, {
          likes: arrayRemove(user.uid)
        })
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(user.uid)
        })
      }
      
      await fetchComments()
    } catch (error) {
      console.error('Error liking comment:', error)
      toast.error('Failed to like comment')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#232120] dark:text-[#E7E7E8]">
          Comments ({comments.length})
        </h3>
      </div>

      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this resource..."
            className="min-h-[100px] bg-white/5 border-white/20 text-white placeholder:text-gray-400"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || !newComment.trim()}
              className="bg-[#F1592A] hover:bg-[#D14820] text-white"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id} className="bg-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.authorAvatar} />
                  <AvatarFallback className="bg-[#F1592A] text-white text-sm">
                    {comment.author.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{comment.author}</span>
                    <span className="text-xs text-gray-400">
                      {comment.createdAt?.toDate?.()?.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikeComment(comment.id)}
                      className="text-gray-400 hover:text-[#F1592A] p-0 h-auto"
                    >
                      <ThumbsUp className={`h-4 w-4 mr-1 ${
                        user && comment.likes.includes(user.uid) ? 'fill-[#F1592A] text-[#F1592A]' : ''
                      }`} />
                      {comment.likes.length}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResourceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [resource, setResource] = useState<Resource | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [relatedResources, setRelatedResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const resourceId = params?.resourceId as string

  useEffect(() => {
    if (resourceId) {
      fetchResource()
      incrementViews()
    }
  }, [resourceId])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  useEffect(() => {
    if (resource) {
      fetchRelatedResources()
    }
  }, [resource])

  const fetchResource = async () => {
    try {
      const resourceDoc = await getDoc(doc(db, 'resources', resourceId))
      if (resourceDoc.exists()) {
        const resourceData = { id: resourceDoc.id, ...resourceDoc.data() } as Resource
        setResource(resourceData)
        
        if (user) {
          setIsLiked(resourceData.likes?.includes(user.uid) || false)
          setIsBookmarked(resourceData.bookmarks?.includes(user.uid) || false)
        }
      }
    } catch (error) {
      console.error('Error fetching resource:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        setUserProfile(userDoc.data())
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchRelatedResources = async () => {
    if (!resource) return
    
    try {
      const resourcesRef = collection(db, 'resources')
      const q = query(
        resourcesRef,
        where('category', '==', resource.category),
        limit(4)
      )
      const snapshot = await getDocs(q)
      
      const relatedData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Resource))
        .filter(r => r.id !== resourceId)
        .slice(0, 3)
      
      setRelatedResources(relatedData)
    } catch (error) {
      console.error('Error fetching related resources:', error)
    }
  }

  const incrementViews = async () => {
    try {
      await updateDoc(doc(db, 'resources', resourceId), {
        views: increment(1)
      })
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like resources')
      return
    }

    try {
      const resourceRef = doc(db, 'resources', resourceId)
      
      if (isLiked) {
        await updateDoc(resourceRef, {
          likes: arrayRemove(user.uid)
        })
        setIsLiked(false)
        toast.success('Removed from liked resources')
      } else {
        await updateDoc(resourceRef, {
          likes: arrayUnion(user.uid)
        })
        setIsLiked(true)
        toast.success('Added to liked resources')
      }
      
      await fetchResource()
    } catch (error) {
      console.error('Error updating like:', error)
      toast.error('Failed to update like status')
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please sign in to bookmark resources')
      return
    }

    try {
      const resourceRef = doc(db, 'resources', resourceId)
      
      if (isBookmarked) {
        await updateDoc(resourceRef, {
          bookmarks: arrayRemove(user.uid)
        })
        setIsBookmarked(false)
        toast.success('Removed from bookmarks')
      } else {
        await updateDoc(resourceRef, {
          bookmarks: arrayUnion(user.uid)
        })
        setIsBookmarked(true)
        toast.success('Added to bookmarks')
      }
      
      await fetchResource()
    } catch (error) {
      console.error('Error updating bookmark:', error)
      toast.error('Failed to update bookmark status')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to log out')
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
      case 'blog': return <BookOpen className="h-4 w-4" />
      case 'link': return <ExternalLink className="h-4 w-4" />
      case 'guide': return <Star className="h-4 w-4" />
      case 'tool': return <Download className="h-4 w-4" />
      case 'template': return <Library className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#F1592A]"></div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Resource Not Found</h1>
          <Button onClick={() => router.push('/forum/resources')} className="bg-[#F1592A] hover:bg-[#D14820]">
            Back to Resources
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#F1592A] to-[#D14820] rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Novellize</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-12 w-12 rounded-full border border-white/20">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || userProfile?.avatar} alt={user.displayName || 'User'} />
                        <AvatarFallback className="bg-[#F1592A] text-white">
                          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end">
                    <DropdownMenuLabel className="text-gray-200">
                      {user.displayName || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem asChild>
                      <Link href="/" className="text-gray-300 hover:text-white cursor-pointer">
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/author/profile" className="text-gray-300 hover:text-white cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={handleLogout} className="text-gray-300 hover:text-white cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild className="bg-[#F1592A] hover:bg-[#D14820] text-white">
                  <Link href="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Resource Header */}
            <div className="space-y-6">
              {resource.image && (
                <div className="relative h-64 rounded-2xl overflow-hidden">
                  <Image
                    src={resource.image}
                    alt={resource.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getDifficultyColor(resource.difficulty)} border`}>
                    {resource.difficulty}
                  </Badge>
                  <Badge variant="outline" className="border-[#F1592A]/30 text-[#F1592A]">
                    <div className="mr-1">{getTypeIcon(resource.type)}</div>
                    {resource.type}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-gray-300">
                    {resource.category}
                  </Badge>
                </div>

                <h1 className="text-3xl font-bold text-[#232120] dark:text-[#E7E7E8]">
                  {resource.title}
                </h1>

                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                  {resource.description}
                </p>

                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {resource.author}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {resource.createdAt?.toDate?.()?.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {resource.estimatedReadTime} min read
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {resource.views} views
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleLike}
                    variant="outline"
                    size="sm"
                    className={`bg-white/5 border-white/20 text-white hover:bg-white/10 ${
                      isLiked ? 'border-[#F1592A] text-[#F1592A]' : ''
                    }`}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-[#F1592A]' : ''}`} />
                    {resource.likes?.length || 0}
                  </Button>

                  <Button
                    onClick={handleBookmark}
                    variant="outline"
                    size="sm"
                    className={`bg-white/5 border-white/20 text-white hover:bg-white/10 ${
                      isBookmarked ? 'border-[#F1592A] text-[#F1592A]' : ''
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-[#F1592A]' : ''}`} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </Button>

                  <ShareButton resource={resource} />

                  {resource.externalUrl && (
                    <Button asChild variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <Link href={resource.externalUrl} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Link
                      </Link>
                    </Button>
                  )}

                  {resource.downloadUrl && (
                    <Button asChild variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <Link href={resource.downloadUrl} target="_blank">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Resource Content */}
            <Card className="bg-white/5 border-white/20">
              <CardContent className="p-8">
                <div 
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: resource.content }}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#232120] dark:text-[#E7E7E8]">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="border-white/20 text-gray-300">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <CommentSection resourceId={resourceId} userProfile={userProfile} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author Info */}
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-[#232120] dark:text-[#E7E7E8]">About the Author</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[#F1592A] text-white">
                      {resource.author.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-white">{resource.author}</h4>
                    <p className="text-sm text-gray-400">Resource Author</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Resources */}
            {relatedResources.length > 0 && (
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="text-[#232120] dark:text-[#E7E7E8]">Related Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedResources.map((relatedResource) => (
                    <Link
                      key={relatedResource.id}
                      href={`/forum/resources/${relatedResource.id}`}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20"
                    >
                      <h5 className="font-medium text-white text-sm mb-1 line-clamp-2">
                        {relatedResource.title}
                      </h5>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {relatedResource.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                          {relatedResource.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {relatedResource.estimatedReadTime} min
                        </span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
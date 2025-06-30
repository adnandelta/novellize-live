'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/authcontext'
import { db, storage } from '@/lib/firebaseConfig'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'react-hot-toast'
import { PlusIcon, Pencil, Trash, AlertTriangle, BookOpen, ExternalLink, Star, Download, Eye, Heart, Bookmark, Upload, X, Search, Filter, Grid, List } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"

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

const resourceCategories = [
  'Writing Techniques',
  'Publishing',
  'Marketing',
  'Character Development',
  'Plot Structure',
  'World Building',
  'Grammar & Style',
  'Research',
  'Inspiration',
  'Business',
  'Tools & Software',
  'Community'
]

const commonTags = [
  'beginner-friendly',
  'advanced',
  'fiction',
  'non-fiction',
  'fantasy',
  'romance',
  'thriller',
  'sci-fi',
  'self-publishing',
  'traditional-publishing',
  'editing',
  'proofreading',
  'marketing',
  'social-media',
  'book-covers',
  'formatting',
  'productivity',
  'motivation'
]

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    type: 'blog' as Resource['type'],
    category: '',
    tags: [] as string[],
    externalUrl: '',
    downloadUrl: '',
    featured: false,
    difficulty: 'beginner' as Resource['difficulty'],
    estimatedReadTime: 5,
    image: null as File | null
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  const { user } = useAuth()

  useEffect(() => {
    checkUserType()
    fetchResources()
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const checkUserType = async () => {
    if (!user) return

    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)))
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data()
        if (userData.userType !== 'admin') {
          toast.error('Access denied. Admin privileges required.')
          return
        }
      }
    } catch (error) {
      console.error('Error checking user type:', error)
      toast.error('Error verifying permissions')
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB')
        return
      }
      
      setFormData(prev => ({ ...prev, image: file }))
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const imageRef = ref(storage, `resources/${Date.now()}_${file.name}`)
    await uploadBytes(imageRef, file)
    return await getDownloadURL(imageRef)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) {
      toast.error('User profile not loaded')
      return
    }

    try {
      setLoading(true)
      
      let imageUrl = editingResource?.image || ''
      
      if (formData.image) {
        imageUrl = await uploadImage(formData.image)
      }

      const resourceData = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        type: formData.type,
        category: formData.category,
        tags: formData.tags,
        externalUrl: formData.externalUrl || '',
        downloadUrl: formData.downloadUrl || '',
        featured: formData.featured,
        difficulty: formData.difficulty,
        estimatedReadTime: formData.estimatedReadTime,
        image: imageUrl,
        author: userProfile.displayName || user?.email || 'Admin',
        authorId: userProfile.id,
        updatedAt: serverTimestamp(),
        ...(editingResource ? {} : {
          createdAt: serverTimestamp(),
          views: 0,
          likes: [],
          bookmarks: []
        })
      }

      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), resourceData)
        toast.success('Resource updated successfully!')
        setShowEditDialog(false)
      } else {
        await addDoc(collection(db, 'resources'), resourceData)
        toast.success('Resource created successfully!')
        setShowCreateDialog(false)
      }

      resetForm()
      await fetchResources()
    } catch (error) {
      console.error('Error saving resource:', error)
      toast.error('Failed to save resource')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      title: resource.title,
      description: resource.description,
      content: resource.content,
      type: resource.type,
      category: resource.category,
      tags: resource.tags,
      externalUrl: resource.externalUrl || '',
      downloadUrl: resource.downloadUrl || '',
      featured: resource.featured,
      difficulty: resource.difficulty,
      estimatedReadTime: resource.estimatedReadTime,
      image: null
    })
    setImagePreview(resource.image || null)
    setShowEditDialog(true)
  }

  const handleDelete = async (id: string, imageUrl?: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      setLoading(true)
      
      // Delete image from storage if exists
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl)
          await deleteObject(imageRef)
        } catch (error) {
          console.log('Image deletion failed (might not exist):', error)
        }
      }
      
      await deleteDoc(doc(db, 'resources', id))
      toast.success('Resource deleted successfully!')
      await fetchResources()
    } catch (error) {
      console.error('Error deleting resource:', error)
      toast.error('Failed to delete resource')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      type: 'blog',
      category: '',
      tags: [],
      externalUrl: '',
      downloadUrl: '',
      featured: false,
      difficulty: 'beginner',
      estimatedReadTime: 5,
      image: null
    })
    setImagePreview(null)
    setEditingResource(null)
  }

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const addCustomTag = (customTag: string) => {
    if (customTag && !formData.tags.includes(customTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, customTag]
      }))
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
    const matchesType = selectedType === 'all' || resource.type === selectedType
    
    return matchesSearch && matchesCategory && matchesType
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog': return <BookOpen className="h-4 w-4" />
      case 'link': return <ExternalLink className="h-4 w-4" />
      case 'guide': return <Star className="h-4 w-4" />
      case 'tool': return <Star className="h-4 w-4" />
      case 'template': return <Download className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400'
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400'
      case 'advanced': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">Please sign in to access the admin panel</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Resource Management</h1>
            <p className="text-gray-400">Manage author resources, guides, and tools</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" className="border-gray-600 text-gray-300">
              <Link href="/forum/resources">
                <Eye className="h-4 w-4 mr-2" />
                View Public Page
              </Link>
            </Button>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#F1592A] to-[#D14820]">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Resources</p>
                  <p className="text-2xl font-bold text-white">{resources.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Star className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Featured</p>
                  <p className="text-2xl font-bold text-white">
                    {resources.filter(r => r.featured).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Views</p>
                  <p className="text-2xl font-bold text-white">
                    {resources.reduce((sum, r) => sum + (r.views || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Heart className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Likes</p>
                  <p className="text-2xl font-bold text-white">
                    {resources.reduce((sum, r) => sum + (r.likes?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Categories</SelectItem>
                  {resourceCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="blog">Blog Posts</SelectItem>
                  <SelectItem value="link">External Links</SelectItem>
                  <SelectItem value="guide">Guides</SelectItem>
                  <SelectItem value="tool">Tools</SelectItem>
                  <SelectItem value="template">Templates</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 border border-slate-600 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-[#F1592A] text-white' : 'text-gray-400'}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-[#F1592A] text-white' : 'text-gray-400'}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Display */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F1592A] mx-auto mb-4"></div>
            <p className="text-white">Loading resources...</p>
          </div>
        ) : viewMode === 'table' ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-300">Resource</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Category</TableHead>
                    <TableHead className="text-gray-300">Difficulty</TableHead>
                    <TableHead className="text-gray-300">Stats</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((resource) => (
                    <TableRow key={resource.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {resource.image && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                              <Image
                                src={resource.image}
                                alt={resource.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{resource.title}</p>
                            <p className="text-gray-400 text-sm line-clamp-1">
                              {resource.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[#F1592A]">
                          {getTypeIcon(resource.type)}
                          <span className="capitalize">{resource.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300">{resource.category}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(resource.difficulty)}>
                          {resource.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{resource.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            <span>{resource.likes?.length || 0}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {resource.featured && (
                          <Badge className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white">
                            Featured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(resource)}
                            className="border-slate-600 text-gray-300 hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(resource.id, resource.image)}
                            className="border-red-600 text-red-400 hover:text-red-300"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="bg-slate-800/50 border-slate-700 hover:border-[#F1592A]/30 transition-all duration-300">
                  {resource.image && (
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <Image
                        src={resource.image}
                        alt={resource.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {resource.featured && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white">
                            Featured
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3 text-[#F1592A]">
                      {getTypeIcon(resource.type)}
                      <span className="text-sm font-medium capitalize">{resource.type}</span>
                      <Badge className={`text-xs ${getDifficultyColor(resource.difficulty)}`}>
                        {resource.difficulty}
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {resource.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                      {resource.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{resource.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{resource.likes?.length || 0}</span>
                        </div>
                      </div>
                      <span className="text-xs">{resource.category}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(resource)}
                        className="flex-1 border-slate-600 text-gray-300 hover:text-white"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(resource.id, resource.image)}
                        className="border-red-600 text-red-400 hover:text-red-300"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {filteredResources.length === 0 && !loading && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No resources found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setShowEditDialog(false)
            resetForm()
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingResource ? 'Edit Resource' : 'Create New Resource'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-gray-300">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="type" className="text-gray-300">Type *</Label>
                    <Select value={formData.type} onValueChange={(value: Resource['type']) => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="blog">Blog Post</SelectItem>
                        <SelectItem value="link">External Link</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-gray-300">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {resourceCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty" className="text-gray-300">Difficulty *</Label>
                    <Select value={formData.difficulty} onValueChange={(value: Resource['difficulty']) => 
                      setFormData(prev => ({ ...prev, difficulty: value }))
                    }>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="readTime" className="text-gray-300">Estimated Read Time (minutes)</Label>
                    <Input
                      id="readTime"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.estimatedReadTime}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estimatedReadTime: parseInt(e.target.value) || 5 
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="externalUrl" className="text-gray-300">External URL</Label>
                    <Input
                      id="externalUrl"
                      type="url"
                      value={formData.externalUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, externalUrl: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="downloadUrl" className="text-gray-300">Download URL</Label>
                    <Input
                      id="downloadUrl"
                      type="url"
                      value={formData.downloadUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, downloadUrl: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com/download"
                    />
                  </div>

                  <div>
                    <Label htmlFor="image" className="text-gray-300">Cover Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0"
                    />
                    {imagePreview && (
                      <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1"
                          onClick={() => {
                            setImagePreview(null)
                            setFormData(prev => ({ ...prev, image: null }))
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, featured: checked as boolean }))
                      }
                    />
                    <Label htmlFor="featured" className="text-gray-300">Featured Resource</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-300">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                  required
                />
              </div>

              {formData.type !== 'link' && (
                <div>
                  <Label htmlFor="content" className="text-gray-300">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white min-h-[200px]"
                    placeholder="Enter the full content of your resource..."
                  />
                </div>
              )}

              {/* Tags Section */}
              <div>
                <Label className="text-gray-300 mb-3 block">Tags</Label>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {commonTags.map(tag => (
                      <Button
                        key={tag}
                        type="button"
                        size="sm"
                        variant={formData.tags.includes(tag) ? "default" : "outline"}
                        onClick={() => handleTagToggle(tag)}
                        className={formData.tags.includes(tag) 
                          ? "bg-[#F1592A] text-white" 
                          : "border-slate-600 text-gray-300 hover:text-white"
                        }
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom tag..."
                      className="bg-slate-700 border-slate-600 text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const input = e.target as HTMLInputElement
                          addCustomTag(input.value)
                          input.value = ''
                        }
                      }}
                    />
                  </div>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="bg-[#F1592A]/10 text-[#F1592A] border-[#F1592A]/30">
                          {tag}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-1 h-auto p-0 text-[#F1592A] hover:text-[#D14820]"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setShowEditDialog(false)
                    resetForm()
                  }}
                  className="border-slate-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#F1592A] to-[#D14820]"
                >
                  {loading ? 'Saving...' : editingResource ? 'Update Resource' : 'Create Resource'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
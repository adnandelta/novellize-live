'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/authcontext'
import { db, storage } from '@/lib/firebaseConfig'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'react-hot-toast'
import { 
  PlusIcon, 
  Pencil, 
  Trash, 
  BookOpen, 
  ExternalLink, 
  Download, 
  Star, 
  Eye, 
  Upload,
  FileText,
  Link as LinkIcon,
  Target,
  Wrench,
  FileImage,
  ArrowLeft
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const resourceTypes = [
  { value: 'blog', label: 'Blog Post', icon: FileText },
  { value: 'link', label: 'External Link', icon: LinkIcon },
  { value: 'guide', label: 'Guide', icon: BookOpen },
  { value: 'tool', label: 'Tool', icon: Wrench },
  { value: 'template', label: 'Template', icon: FileImage }
]

const categories = [
  'Writing Techniques',
  'Character Development',
  'Plot Structure',
  'World Building',
  'Publishing',
  'Marketing',
  'Grammar & Style',
  'Research',
  'Inspiration',
  'Tools & Software'
]

const difficulties = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-500' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-500' },
  { value: 'advanced', label: 'Advanced', color: 'bg-red-500' }
]

export default function AdminResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    type: 'blog' as Resource['type'],
    category: '',
    tags: '',
    externalUrl: '',
    downloadUrl: '',
    featured: false,
    difficulty: 'beginner' as Resource['difficulty'],
    estimatedReadTime: 5,
    image: ''
  })

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      const resourcesQuery = query(
        collection(db, 'resources'),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(resourcesQuery)
      const resourcesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resource[]
      
      setResources(resourcesData)
    } catch (error) {
      console.error('Error fetching resources:', error)
      toast.error('Failed to fetch resources')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      const resourceData = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        type: formData.type,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        author: user.displayName || user.email || 'Admin',
        authorId: user.uid,
        externalUrl: formData.externalUrl || null,
        downloadUrl: formData.downloadUrl || null,
        featured: formData.featured,
        difficulty: formData.difficulty,
        estimatedReadTime: formData.estimatedReadTime,
        image: formData.image || null,
        views: 0,
        likes: [],
        bookmarks: [],
        updatedAt: serverTimestamp()
      }

      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), resourceData)
        toast.success('Resource updated successfully!')
      } else {
        await addDoc(collection(db, 'resources'), {
          ...resourceData,
          createdAt: serverTimestamp()
        })
        toast.success('Resource created successfully!')
      }

      resetForm()
      setIsDialogOpen(false)
      fetchResources()
    } catch (error) {
      console.error('Error saving resource:', error)
      toast.error('Failed to save resource')
    } finally {
      setIsSubmitting(false)
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
      tags: resource.tags.join(', '),
      externalUrl: resource.externalUrl || '',
      downloadUrl: resource.downloadUrl || '',
      featured: resource.featured,
      difficulty: resource.difficulty,
      estimatedReadTime: resource.estimatedReadTime,
      image: resource.image || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      await deleteDoc(doc(db, 'resources', id))
      toast.success('Resource deleted successfully!')
      fetchResources()
    } catch (error) {
      console.error('Error deleting resource:', error)
      toast.error('Failed to delete resource')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const imageRef = ref(storage, `resources/${Date.now()}-${file.name}`)
      await uploadBytes(imageRef, file)
      const imageUrl = await getDownloadURL(imageRef)
      setFormData(prev => ({ ...prev, image: imageUrl }))
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      type: 'blog',
      category: '',
      tags: '',
      externalUrl: '',
      downloadUrl: '',
      featured: false,
      difficulty: 'beginner',
      estimatedReadTime: 5,
      image: ''
    })
    setEditingResource(null)
  }

  const getTypeIcon = (type: string) => {
    const typeData = resourceTypes.find(t => t.value === type)
    return typeData ? typeData.icon : FileText
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F1592A]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F8F8] to-white dark:from-[#1A1918] dark:to-[#232120]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#232120] dark:text-[#E7E7E8]">
                Resources Management
              </h1>
              <p className="text-[#8E8F8E] dark:text-[#C3C3C3] mt-1">
                Manage forum resources and guides
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white hover:scale-105 transition-transform"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingResource ? 'Edit Resource' : 'Add New Resource'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: Resource['type']) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select 
                      value={formData.difficulty} 
                      onValueChange={(value: Resource['difficulty']) => setFormData(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map(diff => (
                          <SelectItem key={diff.value} value={diff.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${diff.color}`} />
                              {diff.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="writing, tips, beginner"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="readTime">Estimated Read Time (minutes)</Label>
                    <Input
                      id="readTime"
                      type="number"
                      min="1"
                      value={formData.estimatedReadTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedReadTime: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                </div>

                {(formData.type === 'link' || formData.type === 'tool') && (
                  <div className="space-y-2">
                    <Label htmlFor="externalUrl">External URL</Label>
                    <Input
                      id="externalUrl"
                      type="url"
                      value={formData.externalUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, externalUrl: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                {formData.type === 'template' && (
                  <div className="space-y-2">
                    <Label htmlFor="downloadUrl">Download URL</Label>
                    <Input
                      id="downloadUrl"
                      type="url"
                      value={formData.downloadUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, downloadUrl: e.target.value }))}
                      placeholder="https://example.com/download"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image">Cover Image</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage && (
                        <div className="flex items-center gap-2 text-sm text-[#8E8F8E]">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F1592A]"></div>
                          Uploading...
                        </div>
                      )}
                    </div>
                    {formData.image && (
                      <div className="mt-2">
                        <Image
                          src={formData.image}
                          alt="Preview"
                          width={200}
                          height={120}
                          className="rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                    />
                    <Label htmlFor="featured">Featured Resource</Label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-[#F1592A] to-[#D14820] text-white"
                  >
                    {isSubmitting ? 'Saving...' : (editingResource ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resources.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resources.filter(r => r.featured).length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resources.reduce((sum, r) => sum + r.views, 0)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(resources.map(r => r.category)).size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Resources Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => {
                    const TypeIcon = getTypeIcon(resource.type)
                    return (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {resource.image && (
                              <Image
                                src={resource.image}
                                alt={resource.title}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{resource.title}</div>
                              <div className="text-sm text-[#8E8F8E] truncate max-w-xs">
                                {resource.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            <span className="capitalize">{resource.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{resource.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              resource.difficulty === 'beginner' ? 'bg-green-500' :
                              resource.difficulty === 'intermediate' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="capitalize">{resource.difficulty}</span>
                          </div>
                        </TableCell>
                        <TableCell>{resource.views}</TableCell>
                        <TableCell>
                          {resource.featured && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        </TableCell>
                        <TableCell>
                          {resource.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(resource)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(resource.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
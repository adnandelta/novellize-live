'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, query, getDocs, doc, getDoc, setDoc, where } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Save, Plus, X, Edit, Trash2, Eye, EyeOff, GripVertical, Upload, ImageIcon, Monitor } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebaseConfig'
import { genres } from '@/app/genreColors'
import { Checkbox } from "@/components/ui/checkbox"

interface HeroCard {
  id: string
  title: string
  content: string
  image: string
  link: string
  buttonText: string
  isActive: boolean
  order: number
  tags?: string[]
  isWritingChallenge: boolean
  byWho: string
  genres: string[]
}

export default function HeroCarouselManagement() {
  const [cards, setCards] = useState<HeroCard[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCard, setEditingCard] = useState<HeroCard | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalCards, setOriginalCards] = useState<HeroCard[]>([])
  const { user } = useAuth()
  const router = useRouter()

  // Form state for new/editing card
  const [formData, setFormData] = useState<Partial<HeroCard>>({
    title: '',
    content: '',
    image: '',
    link: '',
    buttonText: 'Learn More',
    isActive: true,
    tags: [],
    isWritingChallenge: false,
    byWho: '',
    genres: []
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        router.push('/')
        return
      }

      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid), where('userType', '==', 'admin')))
      
      if (userSnap.empty) {
        router.push('/')
        return
      }
    }

    checkAdminAccess()
    fetchHeroCards()
  }, [user, router])

  const fetchHeroCards = async () => {
    try {
      setLoading(true)
      const heroCarouselRef = doc(db, 'featuredContent', 'heroCarousel')
      const heroCarouselDoc = await getDoc(heroCarouselRef)
      
      if (heroCarouselDoc.exists()) {
        const data = heroCarouselDoc.data()
        if (data.cards) {
          // Sort by order
          const sortedCards = data.cards.sort((a: HeroCard, b: HeroCard) => (a.order || 0) - (b.order || 0))
          setCards(sortedCards)
          setOriginalCards(JSON.parse(JSON.stringify(sortedCards))) // Deep copy for comparison
        }
      }
    } catch (error) {
      console.error('Error fetching hero cards:', error)
      toast.error('Failed to fetch hero cards')
    } finally {
      setLoading(false)
    }
  }

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(cards) !== JSON.stringify(originalCards)
    setHasUnsavedChanges(hasChanges)
  }, [cards, originalCards])

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const saveCards = async () => {
    try {
      setSaving(true)
      
      const heroCarouselRef = doc(db, 'featuredContent', 'heroCarousel')
      
      await setDoc(heroCarouselRef, {
        cards: cards,
        updatedAt: new Date()
      }, { merge: true })
      
      setOriginalCards(JSON.parse(JSON.stringify(cards))) // Update original after save
      toast.success('Hero carousel saved successfully')
    } catch (error) {
      console.error('Error saving hero cards:', error)
      toast.error('Failed to save hero cards')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCard = () => {
    const newCard: HeroCard = {
      id: Date.now().toString(),
      title: formData.title || '',
      content: formData.content || '',
      image: formData.image || '',
      link: formData.link || '',
      buttonText: formData.buttonText || 'Learn More',
      isActive: formData.isActive ?? true,
      order: cards.length,
      tags: formData.tags || [],
      isWritingChallenge: formData.isWritingChallenge ?? false,
      byWho: formData.byWho || '',
      genres: formData.genres || []
    }

    setCards([...cards, newCard])
    setFormData({
      title: '',
      content: '',
      image: '',
      link: '',
      buttonText: 'Learn More',
      isActive: true,
      tags: [],
      isWritingChallenge: false,
      byWho: '',
      genres: []
    })
    setIsAddingNew(false)
    toast.success('Card added successfully')
  }

  const handleEditCard = (card: HeroCard) => {
    setEditingCard(card)
    setFormData(card)
    setTagInput('')
  }

  const handleUpdateCard = () => {
    if (!editingCard) return

    const updatedCards = cards.map(card => 
      card.id === editingCard.id 
        ? { ...card, ...formData }
        : card
    )

    setCards(updatedCards)
    setEditingCard(null)
    setFormData({
      title: '',
      content: '',
      image: '',
      link: '',
      buttonText: 'Learn More',
      isActive: true,
      tags: [],
      isWritingChallenge: false,
      byWho: '',
      genres: []
    })
    toast.success('Card updated successfully')
  }

  const handleDeleteCard = (cardId: string) => {
    setCards(cards.filter(card => card.id !== cardId))
    toast.success('Card deleted successfully')
  }

  const toggleCardActive = (cardId: string) => {
    const updatedCards = cards.map(card => 
      card.id === cardId 
        ? { ...card, isActive: !card.isActive }
        : card
    )
    setCards(updatedCards)
  }

  const moveCard = (cardId: string, direction: 'up' | 'down') => {
    const cardIndex = cards.findIndex(card => card.id === cardId)
    if (cardIndex === -1) return

    const newCards = [...cards]
    if (direction === 'up' && cardIndex > 0) {
      [newCards[cardIndex], newCards[cardIndex - 1]] = [newCards[cardIndex - 1], newCards[cardIndex]]
    } else if (direction === 'down' && cardIndex < cards.length - 1) {
      [newCards[cardIndex], newCards[cardIndex + 1]] = [newCards[cardIndex + 1], newCards[cardIndex]]
    }

    // Update order values
    const updatedCards = newCards.map((card, index) => ({
      ...card,
      order: index
    }))

    setCards(updatedCards)
  }

  const uploadFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    try {
      setUploading(true)
      
      // Create a unique filename
      const fileName = `hero-carousel/${Date.now()}-${file.name}`
      const storageRef = ref(storage, fileName)
      
      // Upload file
      await uploadBytes(storageRef, file)
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef)
      
      // Update form data with the new image URL
      setFormData({ ...formData, image: downloadURL })
      
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    await uploadFile(file)
    // Reset the input
    event.target.value = ''
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0])
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image: '',
      link: '',
      buttonText: 'Learn More',
      isActive: true,
      tags: [],
      isWritingChallenge: false,
      byWho: '',
      genres: []
    })
    setTagInput('')
    setEditingCard(null)
    setIsAddingNew(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A]">
      <Toaster position="bottom-center" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#232120] to-[#2A2827] border-b border-[#333] sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-[#333] transition-all duration-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] bg-clip-text text-transparent">
                Hero Carousel Management
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAddingNew(true)}
                className="bg-[#F1592A] hover:bg-[#E44D1F] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </Button>
              <Button
                onClick={saveCards}
                disabled={saving}
                className={`${hasUnsavedChanges ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white relative`}
              >
                {hasUnsavedChanges && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Save All'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Unsaved Changes</span>
            </div>
            <p className="text-yellow-300 text-sm mt-1">
              You have unsaved changes. Don't forget to save your work!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-[#232120] to-[#2A2827] border-[#333] text-white sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl">
                  {editingCard ? 'Edit Card' : isAddingNew ? 'Add New Card' : 'Card Form'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(isAddingNew || editingCard) && (
                  <>
                    <div>
                      <Label htmlFor="title" className="text-gray-300">Title</Label>
                      <Input
                        id="title"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-[#2A2827] border-[#444] text-white"
                        placeholder="Enter card title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="content" className="text-gray-300">Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content || ''}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="bg-[#2A2827] border-[#444] text-white min-h-[100px]"
                        placeholder="Enter card content"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tags" className="text-gray-300">Tags</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="tags"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            className="bg-[#2A2827] border-[#444] text-white"
                            placeholder="Enter tag and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
                                  setFormData({ 
                                    ...formData, 
                                    tags: [...(formData.tags || []), tagInput.trim()] 
                                  })
                                  setTagInput('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
                                setFormData({ 
                                  ...formData, 
                                  tags: [...(formData.tags || []), tagInput.trim()] 
                                })
                                setTagInput('')
                              }
                            }}
                            className="bg-[#F1592A] hover:bg-[#E44D1F] text-white px-3"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Display current tags */}
                        {formData.tags && formData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="bg-transparent text-white text-xs font-medium px-2 py-1 border border-white uppercase tracking-wide flex items-center gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = formData.tags?.filter((_, i) => i !== index)
                                    setFormData({ ...formData, tags: newTags })
                                  }}
                                  className="text-gray-300 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="image" className="text-gray-300">Image</Label>
                      <div className="space-y-3">
                        {/* Image Preview */}
                        {formData.image && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#444]">
                            <Image
                              src={formData.image}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                            <button
                              onClick={() => setFormData({ ...formData, image: '' })}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        
                        {/* Drag & Drop Upload Area */}
                        <div
                          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                            dragActive 
                              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-[#444] hover:border-blue-400'
                          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => !uploading && document.getElementById('imageUpload')?.click()}
                        >
                          <input
                            type="file"
                            id="imageUpload"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                          
                          {uploading ? (
                            <div className="flex flex-col items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                              <p className="text-gray-400">Uploading...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-gray-300 mb-1">
                                {dragActive ? 'Drop image here' : 'Click to upload or drag & drop'}
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Manual URL Input */}
                        <div className="relative">
                          <Input
                            id="image"
                            value={formData.image || ''}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="bg-[#2A2827] border-[#444] text-white pl-10"
                            placeholder="Or enter image URL manually"
                          />
                          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="link" className="text-gray-300">Link URL</Label>
                      <Input
                        id="link"
                        value={formData.link || ''}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        className="bg-[#2A2827] border-[#444] text-white"
                        placeholder="Enter link URL"
                      />
                    </div>

                    <div>
                      <Label htmlFor="buttonText" className="text-gray-300">Button Text</Label>
                      <Input
                        id="buttonText"
                        value={formData.buttonText || ''}
                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                        className="bg-[#2A2827] border-[#444] text-white"
                        placeholder="Enter button text"
                      />
                    </div>

                    <div>
                      <Label htmlFor="byWho" className="text-gray-300">By Who</Label>
                      <Input
                        id="byWho"
                        value={formData.byWho || ''}
                        onChange={(e) => setFormData({ ...formData, byWho: e.target.value })}
                        className="bg-[#2A2827] border-[#444] text-white"
                        placeholder="Enter author/creator name"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Genres</Label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-[#2A2827] border border-[#444] rounded-md p-3">
                          {genres.map((genre) => (
                            <div key={genre} className="flex items-center space-x-2">
                              <Checkbox
                                id={`genre-${genre}`}
                                checked={formData.genres?.includes(genre) || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      genres: [...(formData.genres || []), genre]
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      genres: formData.genres?.filter(g => g !== genre) || []
                                    })
                                  }
                                }}
                                className="border-[#666] data-[state=checked]:bg-[#F1592A] data-[state=checked]:border-[#F1592A]"
                              />
                              <Label
                                htmlFor={`genre-${genre}`}
                                className="text-sm text-gray-300 cursor-pointer"
                              >
                                {genre}
                              </Label>
                            </div>
                          ))}
                        </div>
                        
                        {/* Display selected genres */}
                        {formData.genres && formData.genres.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.genres.map((genre, index) => (
                              <span
                                key={index}
                                className="bg-[#F1592A] text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
                              >
                                {genre}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGenres = formData.genres?.filter(g => g !== genre)
                                    setFormData({ ...formData, genres: newGenres })
                                  }}
                                  className="text-white hover:text-gray-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isWritingChallenge"
                        checked={formData.isWritingChallenge ?? false}
                        onCheckedChange={(checked) => setFormData({ ...formData, isWritingChallenge: checked })}
                      />
                      <Label htmlFor="isWritingChallenge" className="text-gray-300">Writing Challenge</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="isActive" className="text-gray-300">Active</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={editingCard ? handleUpdateCard : handleAddCard}
                        className="bg-[#F1592A] hover:bg-[#E44D1F] text-white flex-1"
                        disabled={!formData.title || !formData.content}
                      >
                        {editingCard ? 'Update Card' : 'Add Card'}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-[#444] text-gray-300 hover:bg-[#333]"
                            disabled={!formData.title && !formData.content && !formData.image}
                          >
                            <Monitor className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-gradient-to-br from-[#232120] to-[#2A2827] border-[#333] text-white">
                          <DialogHeader>
                            <DialogTitle className="text-xl text-white">Card Preview</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="relative bg-gray-800 rounded-lg overflow-hidden h-80">
                              {/* Preview Image */}
                              {formData.image && (
                                <div className="absolute inset-0">
                                  <Image
                                    src={formData.image}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                                </div>
                              )}
                              
                              {/* Writing Challenge Badge */}
                              {formData.isWritingChallenge && (
                                <div className="absolute top-0 right-0 z-20">
                                  <div className="relative">
                                    <div className="absolute left-0 top-0 w-0 h-0 border-r-[12px] border-r-[#F1592A] border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent transform -translate-x-full"></div>
                                    <span className="bg-[#F1592A] text-white text-xs font-bold pl-6 pr-3 py-2 uppercase tracking-wide shadow-lg inline-block">
                                      Writing Challenge
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Content */}
                              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                                                 {/* Tags */}
                                 {formData.tags && formData.tags.length > 0 && (
                                   <div className="flex flex-row mb-2 gap-2">
                                     {formData.tags.map((tag, index) => (
                                       <span
                                         key={index}
                                         className="bg-transparent text-white text-xs font-medium px-3 py-1 uppercase tracking-wide border border-white rounded"
                                       >
                                         {tag}
                                       </span>
                                     ))}
                                   </div>
                                 )}

                                                                 {/* Title */}
                                 <h3 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">
                                   {formData.title || 'Card Title'}
                                 </h3>

                                 {/* Genres */}
                                 {formData.genres && formData.genres.length > 0 && (
                                   <div className="flex flex-row mb-2 overflow-hidden">
                                     {formData.genres.map((genre, index) => (
                                       <span
                                         key={index}
                                         className={`bg-transparent text-white text-xs font-medium px-2 py-0.5 uppercase tracking-wide border-t border-b border-r border-white ${
                                           index === 0 ? 'border-l border-white rounded-l' : 'border-l border-white'
                                         } ${index === (formData.genres?.length ?? 0) - 1 ? 'rounded-r' : ''}`}
                                       >
                                         {genre}
                                       </span>
                                     ))}
                                   </div>
                                 )}

                                 {/* Content */}
                                 <p className="text-sm md:text-base text-gray-200 mb-4 whitespace-pre-line" style={{ lineHeight: '1.1' }}>
                                   {formData.content || 'Card content will appear here...'}
                                 </p>

                                {/* By Who */}
                                {formData.byWho && (
                                  <div className="mb-3">
                                    <span className="text-sm text-gray-300">by {formData.byWho}</span>
                                  </div>
                                )}

                                {/* Button */}
                                <div className="flex justify-start">
                                  <span className="bg-[#F1592A] hover:bg-[#E44D1F] text-white px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg inline-flex items-center">
                                    {formData.buttonText || 'Learn More'}
                                    <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-400 bg-[#2A2827] rounded-lg p-4">
                              <p className="font-medium mb-2">Preview Notes:</p>
                              <ul className="space-y-1 text-xs">
                                <li>• This preview shows the actual size and styling of your hero card</li>
                                <li>• The card will appear in the carousel with smooth animations</li>
                                <li>• All interactive elements will be functional in the live version</li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        onClick={resetForm}
                        variant="outline"
                        className="border-[#444] text-gray-300 hover:bg-[#333]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}

                {!isAddingNew && !editingCard && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">Select a card to edit or add a new one</p>
                    <Button
                      onClick={() => setIsAddingNew(true)}
                      className="bg-[#F1592A] hover:bg-[#E44D1F] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Card
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cards List Section */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-[#232120] to-[#2A2827] border-[#333] text-white">
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                  Hero Cards ({cards.length})
                  <span className="text-sm text-gray-400">Manage order and visibility</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cards.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No hero cards yet</p>
                    <Button
                      onClick={() => setIsAddingNew(true)}
                      className="bg-[#F1592A] hover:bg-[#E44D1F] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Card
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cards.map((card, index) => (
                      <div
                        key={card.id}
                        className={`bg-[#2A2827] border border-[#444] rounded-lg p-4 transition-all duration-200 ${
                          !card.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col gap-1">
                            <Button
                              onClick={() => moveCard(card.id, 'up')}
                              disabled={index === 0}
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6 w-6 text-gray-400 hover:text-white"
                            >
                              ↑
                            </Button>
                            <Button
                              onClick={() => moveCard(card.id, 'down')}
                              disabled={index === cards.length - 1}
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6 w-6 text-gray-400 hover:text-white"
                            >
                              ↓
                            </Button>
                          </div>

                          {card.image && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={card.image}
                                alt={card.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-white truncate">{card.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2 mt-1">{card.content}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>Button: {card.buttonText}</span>
                                  <span>Link: {card.link}</span>
                                  {card.byWho && <span>By: {card.byWho}</span>}
                                  {card.isWritingChallenge && <span className="text-[#F1592A]">Writing Challenge</span>}
                                </div>
                                {card.genres && card.genres.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {card.genres.slice(0, 3).map((genre, index) => (
                                      <span
                                        key={index}
                                        className="bg-[#F1592A] text-white text-xs px-2 py-1 rounded-full"
                                      >
                                        {genre}
                                      </span>
                                    ))}
                                    {card.genres.length > 3 && (
                                      <span className="text-xs text-gray-400">+{card.genres.length - 3} more</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  onClick={() => toggleCardActive(card.id)}
                                  variant="ghost"
                                  size="sm"
                                  className={`p-2 ${card.isActive ? 'text-green-400' : 'text-gray-400'}`}
                                >
                                  {card.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="p-2 text-purple-400 hover:text-purple-300"
                                    >
                                      <Monitor className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl bg-gradient-to-br from-[#232120] to-[#2A2827] border-[#333] text-white">
                                    <DialogHeader>
                                      <DialogTitle className="text-xl text-white">Card Preview - {card.title}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="relative bg-gray-800 rounded-lg overflow-hidden h-80">
                                        {/* Preview Image */}
                                        {card.image && (
                                          <div className="absolute inset-0">
                                            <Image
                                              src={card.image}
                                              alt="Preview"
                                              fill
                                              className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                                          </div>
                                        )}
                                        
                                        {/* Writing Challenge Badge */}
                                        {card.isWritingChallenge && (
                                          <div className="absolute top-0 right-0 z-20">
                                            <div className="relative">
                                              <div className="absolute left-0 top-0 w-0 h-0 border-r-[12px] border-r-[#F1592A] border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent transform -translate-x-full"></div>
                                              <span className="bg-[#F1592A] text-white text-xs font-bold pl-6 pr-3 py-2 uppercase tracking-wide shadow-lg inline-block">
                                                Writing Challenge
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                                                                     {/* Tags */}
                                           {card.tags && card.tags.length > 0 && (
                                             <div className="flex flex-row mb-2 gap-2">
                                               {card.tags.map((tag, index) => (
                                                 <span
                                                   key={index}
                                                   className="bg-transparent text-white text-xs font-medium px-3 py-1 uppercase tracking-wide border border-white rounded"
                                                 >
                                                   {tag}
                                                 </span>
                                               ))}
                                             </div>
                                           )}

                                                                                     {/* Title */}
                                           <h3 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">
                                             {card.title}
                                           </h3>

                                           {/* Genres */}
                                           {card.genres && card.genres.length > 0 && (
                                             <div className="flex flex-row mb-2 overflow-hidden">
                                               {card.genres.map((genre, index) => (
                                                 <span
                                                   key={index}
                                                   className={`bg-transparent text-white text-xs font-medium px-2 py-0.5 uppercase tracking-wide border-t border-b border-r border-white ${
                                                     index === 0 ? 'border-l border-white rounded-l' : 'border-l border-white'
                                                   } ${index === (card.genres?.length ?? 0) - 1 ? 'rounded-r' : ''}`}
                                                 >
                                                   {genre}
                                                 </span>
                                               ))}
                                             </div>
                                           )}

                                           {/* Content */}
                                           <p className="text-sm md:text-base text-gray-200 mb-4 whitespace-pre-line" style={{ lineHeight: '1.1' }}>
                                             {card.content}
                                           </p>

                                          {/* By Who */}
                                          {card.byWho && (
                                            <div className="mb-3">
                                              <span className="text-sm text-gray-300">by {card.byWho}</span>
                                            </div>
                                          )}

                                          {/* Button */}
                                          <div className="flex justify-start">
                                            <span className="bg-[#F1592A] hover:bg-[#E44D1F] text-white px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg inline-flex items-center">
                                              {card.buttonText}
                                              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                              </svg>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="text-sm text-gray-400 bg-[#2A2827] rounded-lg p-4">
                                        <p className="font-medium mb-2">Preview Notes:</p>
                                        <ul className="space-y-1 text-xs">
                                          <li>• This preview shows the actual size and styling of your hero card</li>
                                          <li>• The card will appear in the carousel with smooth animations</li>
                                          <li>• All interactive elements will be functional in the live version</li>
                                          <li>• Status: {card.isActive ? 'Active' : 'Inactive'}</li>
                                        </ul>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  onClick={() => handleEditCard(card)}
                                  variant="ghost"
                                  size="sm"
                                  className="p-2 text-blue-400 hover:text-blue-300"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteCard(card.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="p-2 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, getDoc, Timestamp, writeBatch } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast, Toaster } from 'react-hot-toast'
import { PlusIcon, Pencil, Trash, AlertTriangle, ArrowLeft, ArrowUp, ArrowDown, BookOpen, Home, Eye, Link as LinkIcon, Calendar, File, Download } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parse } from 'papaparse'
import { motion } from "framer-motion"
import Image from 'next/image'

interface Chapter {
  id?: string
  title: string
  link: string
  chapter: number
  releaseDate?: Timestamp
}

interface Novel {
  novelId?: string
  title: string
  coverPhoto: string
  brand: {
    name: string
    logo: string
  }
}

export default function ChapterManagement() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [novel, setNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const novelId = params.novelId as string

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const fetchNovelDetails = async () => {
    try {
      const novelDoc = await getDoc(doc(db, 'novels', novelId))
      if (novelDoc.exists()) {
        setNovel({ novelId: novelDoc.id, ...novelDoc.data() } as Novel)
      } else {
        setError("Novel not found")
      }
    } catch (error) {
      console.error('Error fetching novel details:', error)
      setError(`Failed to fetch novel details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const fetchChapters = async () => {
    setLoading(true)
    setError(null)
    try {
      const chaptersRef = collection(db, 'novels', novelId, 'chapters')
      const q = query(chaptersRef, orderBy('chapter'))
      const querySnapshot = await getDocs(q)
      const fetchedChapters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter))
      setChapters(fetchedChapters)
    } catch (error) {
      console.error('Error fetching chapters:', error)
      setError(`Failed to fetch chapters: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast.error('Failed to fetch chapters. Please try again.')
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentChapter) return
    
    setIsSaving(true)
    try {
      const chapterData = {
        ...currentChapter,
        chapter: Number(currentChapter.chapter),
        releaseDate: Timestamp.now()
      }

      if (currentChapter.id) {
        await updateDoc(doc(db, 'novels', novelId, 'chapters', currentChapter.id), chapterData)
        toast.success('Chapter updated successfully')
      } else {
        await addDoc(collection(db, 'novels', novelId, 'chapters'), chapterData)
        toast.success('Chapter added successfully')
      }
      setIsDialogOpen(false)
      fetchChapters()
    } catch (error) {
      console.error('Error saving chapter:', error)
      toast.error(`Failed to save chapter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this chapter?')) {
      setActionInProgress(id);
      try {
        await deleteDoc(doc(db, 'novels', novelId, 'chapters', id))
        toast.success('Chapter deleted successfully')
        fetchChapters()
      } catch (error) {
        console.error('Error deleting chapter:', error)
        toast.error(`Failed to delete chapter: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setActionInProgress(null);
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentChapter(prev => ({ ...prev!, [name]: value }))
  }

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    const chapterIndex = chapters.findIndex(chapter => chapter.id === chapterId)
    if (chapterIndex === -1) return

    setActionInProgress(`${chapterId}-${direction}`);
    const newChapters = [...chapters]
    const chapter = newChapters[chapterIndex]
    let swapChapter: Chapter

    if (direction === 'up' && chapterIndex > 0) {
      swapChapter = newChapters[chapterIndex - 1]
    } else if (direction === 'down' && chapterIndex < newChapters.length - 1) {
      swapChapter = newChapters[chapterIndex + 1]
    } else {
      setActionInProgress(null);
      return
    }

    const tempchapter = chapter.chapter
    chapter.chapter = swapChapter.chapter
    swapChapter.chapter = tempchapter

    try {
      await updateDoc(doc(db, 'novels', novelId, 'chapters', chapter.id!), { chapter: chapter.chapter })
      await updateDoc(doc(db, 'novels', novelId, 'chapters', swapChapter.id!), { chapter: swapChapter.chapter })
      toast.success('Chapter order updated successfully')
      fetchChapters()
    } catch (error) {
      console.error('Error updating chapter order:', error)
      toast.error(`Failed to update chapter order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionInProgress(null);
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    setLoading(true)
    parse(file, {
      header: true,
      complete: async (results) => {
        try {
          console.log(`Attempting to upload ${results.data.length} chapters`);
          
          // Create a batch
          const batch = writeBatch(db);
          const chaptersRef = collection(db, 'novels', novelId, 'chapters');
          
          const chaptersToAdd = results.data.map((row: any) => ({
            title: row.title,
            link: row.link,
            chapter: Number(row.chapter),
            releaseDate: Timestamp.now()
          }));

          // Add chapters in batches of 500 (Firestore limit)
          for (const chapter of chaptersToAdd) {
            const newChapterRef = doc(chaptersRef);
            batch.set(newChapterRef, chapter);
          }

          // Commit the batch
          await batch.commit();
          
          console.log(`Successfully processed ${chaptersToAdd.length} chapters`);
          toast.success(`Successfully uploaded ${chaptersToAdd.length} chapters`);
          fetchChapters();
        } catch (error) {
          console.error('Error uploading chapters:', error);
          toast.error(`Failed to upload chapters: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setLoading(false);
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsUploading(false);
        setLoading(false);
      }
    });

    // Reset the file input value to allow uploading the same file again
    e.target.value = '';
  }

  const copyFormatTemplate = () => {
    const template = 'title,link,chapter\nChapter Title,https://example.com/chapter-link,1\nChapter Title,https://example.com/chapter-link,2\nChapter Title,https://example.com/chapter-link,3';
    navigator.clipboard.writeText(template)
      .then(() => toast.success('Format template copied to clipboard!'))
      .catch(() => toast.error('Failed to copy template'));
  };

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.userType !== 'admin' && userData.userType !== 'author') {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/');
      }
    };

    checkAccess();
    fetchNovelDetails();
    fetchChapters();
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A]">
      <Toaster />
      
      {/* Header Section */}
      <motion.header 
        className="bg-gradient-to-r from-[#232120] to-[#2A2827] border-b border-[#333] sticky top-0 z-50 shadow-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center space-x-2 hover:opacity-80 transition-all duration-300 hover:scale-105">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Home className="h-6 w-6 text-[#F1592A]" />
                </motion.div>
                <span className="text-xl font-semibold text-white"></span>
              </Link>
              <motion.h1 
                className="text-xl font-semibold text-white ml-4 bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Chapter Management
              </motion.h1>
            </div>
            <Link href="/admin">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="outline" className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Novels
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8">
        {/* Novel Info Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg border border-[#333] overflow-hidden shadow-lg"
          >
            {novel && (
              <div className="flex p-6">
                <div className="relative w-24 h-36 rounded overflow-hidden shadow-md mr-6 flex-shrink-0">
                  {novel.coverPhoto ? (
                    <Image
                      src={novel.coverPhoto}
                      alt={novel.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{novel.title}</h2>
                  <div className="flex items-center text-gray-300 mb-2">
                    <BookOpen className="h-4 w-4 text-[#F1592A] mr-2" />
                    <span>{chapters.length} Chapters</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#333]/50 text-white">
                      Published by {novel.brand.name || 'Unknown Publisher'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {error && (
          <Alert variant="destructive" className="mb-4 animate-fade-in bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#232120] to-[#2A2827] border-[#333] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{currentChapter?.id ? 'Edit Chapter' : 'Add New Chapter'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="chapter" className="text-gray-300">Chapter Number</Label>
                <Input 
                  id="chapter" 
                  name="chapter" 
                  type="number" 
                  min="1" 
                  value={currentChapter?.chapter || ''} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-[#1A1A1A] border-[#333] text-white"
                />
              </div>
              <div>
                <Label htmlFor="title" className="text-gray-300">Title</Label>
                <Input 
                  id="title" 
                  name="title" 
                  value={currentChapter?.title || ''} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-[#1A1A1A] border-[#333] text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="link" className="text-gray-300">Chapter Link</Label>
                <Textarea 
                  id="link" 
                  name="link" 
                  value={currentChapter?.link || ''} 
                  onChange={handleInputChange} 
                  required 
                  rows={4} 
                  className="bg-[#1A1A1A] border-[#333] text-white"
                />
              </div>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] hover:from-[#E14A1B] hover:to-[#FF6B3D] text-white transition-all duration-300 hover:scale-105 shadow-lg"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Saving...</span>
                  </div>
                ) : 'Save Chapter'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-4 mb-6">
            <motion.div variants={itemVariants}>
              <Button
                onClick={() => {
                  setCurrentChapter({ title: '', link: '', chapter: chapters.length + 1 });
                  setIsDialogOpen(true);
                }}
                className="bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] hover:from-[#E14A1B] hover:to-[#FF6B3D] text-white transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <PlusIcon className="mr-2 h-4 w-4" /> Add New Chapter
              </Button>
            </motion.div>
            
            <motion.div variants={itemVariants} className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('csv-upload')?.click()}
                className="bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] shadow-md"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F1592A] mr-2"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <File className="mr-2 h-4 w-4" /> Upload Chapters (CSV)
                  </>
                )}
              </Button>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button 
                variant="ghost" 
                onClick={copyFormatTemplate}
                className="text-sm text-gray-400 hover:text-gray-300 bg-gradient-to-r from-[#2A2827]/40 to-[#333]/40 hover:from-[#3A3837]/40 hover:to-[#444]/40"
              >
                <Download className="mr-2 h-4 w-4" />
                Copy CSV Format
              </Button>
            </motion.div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F1592A]"></div>
            </div>
          ) : (
            <motion.div 
              className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg shadow-lg border border-[#333] overflow-hidden"
              variants={itemVariants}
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#232120] via-[#2A2827] to-[#333]">
                    <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-[#F1592A]" />
                        <span>Chapter</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                      <div className="flex items-center gap-1">
                        <File className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Title</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-yellow-400" />
                        <span>Release Date</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                      <div className="flex items-center gap-1 justify-center">
                        <Pencil className="h-3.5 w-3.5 text-blue-400" />
                        <span>Actions</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapters.map((chapter, index) => (
                    <motion.tr
                      key={chapter.id}
                      className={`hover:bg-[#2A2827] transition-colors group ${index % 2 === 0 ? 'bg-gradient-to-r from-[#232120]/20 to-[#2A2827]/20' : 'bg-gradient-to-r from-[#2A2827]/40 to-[#232120]/40'}`}
                      variants={itemVariants}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(50, 50, 50, 0.3)' }}
                    >
                      <TableCell className="text-white font-medium border-l-4 border-l-transparent group-hover:border-l-[#F1592A] transition-colors">
                        <span className="px-3 py-1 bg-gradient-to-r from-[#333]/70 to-[#333]/50 group-hover:from-[#F1592A]/30 group-hover:to-[#FF7B4D]/30 rounded-full text-xs font-medium text-white group-hover:text-white transition-all shadow-sm group-hover:shadow-[0_0_8px_rgba(241,89,42,0.3)]">
                          Chapter {chapter.chapter}
                        </span>
                      </TableCell>
                      <TableCell className="text-white group-hover:text-[#F1592A] transition-colors font-medium">
                        {chapter.title}
                      </TableCell>
                      <TableCell className="text-gray-300 group-hover:text-yellow-300 transition-colors">
                        {chapter.releaseDate ? new Date(chapter.releaseDate.toDate()).toLocaleDateString() : 'Not released'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 justify-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-[#3A3837] hover:to-[#444] shadow-md hover:shadow-[0_0_10px_rgba(156,163,175,0.3)]"
                            onClick={() => { setCurrentChapter(chapter); setIsDialogOpen(true); }}
                            title="Edit Chapter"
                          >
                            <Pencil className="h-4 w-4 hover:text-blue-300"/>
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-[#3A3837] hover:to-[#444] shadow-md"
                            onClick={() => chapter.id && handleMoveChapter(chapter.id, 'up')}
                            disabled={index === 0 || actionInProgress === `${chapter.id}-up` || actionInProgress === `${chapter.id}-down`}
                            title="Move Up"
                          >
                            {actionInProgress === `${chapter.id}-up` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <ArrowUp className={`h-4 w-4 ${index === 0 ? 'text-gray-500' : 'hover:text-green-300'}`} />
                            )}
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-[#3A3837] hover:to-[#444] shadow-md"
                            onClick={() => chapter.id && handleMoveChapter(chapter.id, 'down')}
                            disabled={index === chapters.length - 1 || actionInProgress === `${chapter.id}-up` || actionInProgress === `${chapter.id}-down`}
                            title="Move Down"
                          >
                            {actionInProgress === `${chapter.id}-down` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <ArrowDown className={`h-4 w-4 ${index === chapters.length - 1 ? 'text-gray-500' : 'hover:text-green-300'}`} />
                            )}
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-red-600/80 hover:to-red-700/80 shadow-md hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                            onClick={() => chapter.id && handleDelete(chapter.id)}
                            disabled={actionInProgress === chapter.id}
                            title="Delete Chapter"
                          >
                            {actionInProgress === chapter.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash className="h-4 w-4"/>
                            )}
                          </motion.button>
                          
                          {chapter.link && (
                            <motion.a
                              href={chapter.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-blue-600/80 hover:to-blue-700/80 shadow-md hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                              title="View Chapter"
                            >
                              <Eye className="h-4 w-4"/>
                            </motion.a>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
              
              {chapters.length === 0 && (
                <div className="text-center py-12 bg-gradient-to-br from-[#232120] to-[#2A2827] border-t border-dashed border-[#333]">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg font-medium">No chapters found</p>
                  <p className="text-gray-400 text-sm mt-1">Start adding chapters using the "Add New Chapter" button above.</p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

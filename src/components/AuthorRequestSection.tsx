'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Upload, Users, ChevronRight } from 'lucide-react'

interface FormData {
  role: 'author' | 'uploader' | 'fan' | ''
  hasBookIdea: 'yes' | 'no' | ''
  bookName: string
  bookLink: string
  relationship: 'fan' | 'author' | 'connected' | ''
  comments: string
}

export const AuthorRequestSection = () => {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    role: '',
    hasBookIdea: '',
    bookName: '',
    bookLink: '',
    relationship: '',
    comments: ''
  })

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      role: '',
      hasBookIdea: '',
      bookName: '',
      bookLink: '',
      relationship: '',
      comments: ''
    })
  }

  const handleSubmitRequest = async () => {
    if (!user) {
      toast.error('Please login to submit a request')
      return
    }

    if (!formData.role) {
      toast.error('Please select your role')
      return
    }

    try {
      setIsSubmitting(true)

      // Check if user has already submitted a request
      const requestsRef = collection(db, 'requests')
      const q = query(
        requestsRef, 
        where('userId', '==', user.uid),
        where('type', '==', 'platform_access')
      )
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast.error('You have already submitted a platform access request')
        return
      }

      // Add new request to Firestore
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        email: user.email,
        status: 'pending',
        createdAt: new Date(),
        type: 'platform_access',
        formData: formData
      })

      toast.success('Your request has been submitted successfully!')
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'author': return <Sparkles className="w-5 h-5" />
      case 'uploader': return <Upload className="w-5 h-5" />
      case 'fan': return <Users className="w-5 h-5" />
      default: return null
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'author': return 'Create and publish your own original novels'
      case 'uploader': return 'Upload and share content from other authors'
      case 'fan': return 'Support and promote your favorite stories'
      default: return ''
    }
  }

  const shouldShowBookIdea = formData.role === 'author' || formData.role === 'uploader'
  const shouldShowBookDetails = shouldShowBookIdea && formData.hasBookIdea === 'yes'
  const shouldShowRelationship = shouldShowBookDetails && (formData.bookName || formData.bookLink)
  const shouldShowComments = formData.role !== ''

  return (
    <motion.section 
      className="py-16 bg-gradient-to-br from-[#232120] via-[#2A2827] to-[#232120] relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(241, 89, 42, 0.15) 0%, transparent 50%)`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#F1592A] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Request Platform Access
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-12">
              Join our growing community and choose the role that fits you best. Fill out the form below to get started.
            </p>
          </motion.div>

          {!showForm ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Button
                onClick={() => setShowForm(true)}
                disabled={!user}
                className="relative group bg-gradient-to-r from-[#F1592A] to-[#FF8C94] hover:from-[#FF8C94] hover:to-[#F1592A] text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Your Request
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Button>
              {!user && (
                <p className="mt-4 text-gray-400 text-sm">
                  Please login to request access
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-[#2A2827] rounded-2xl p-8 border border-gray-700">
                <div className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="role" className="text-white font-semibold">
                      What role best describes you? *
                    </Label>
                    <Select value={formData.role} onValueChange={(value) => handleFormChange('role', value)}>
                      <SelectTrigger className="bg-[#232120] border-gray-600 text-white">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#232120] border-gray-600">
                        <SelectItem value="author" className="text-white hover:bg-[#2A2827]">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Author
                          </div>
                        </SelectItem>
                        <SelectItem value="uploader" className="text-white hover:bg-[#2A2827]">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Uploader
                          </div>
                        </SelectItem>
                        <SelectItem value="fan" className="text-white hover:bg-[#2A2827]">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Fan
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.role && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-gray-400 flex items-center gap-2"
                      >
                        {getRoleIcon(formData.role)}
                        {getRoleDescription(formData.role)}
                      </motion.p>
                    )}
                  </div>

                  {/* Book Idea Question */}
                  <AnimatePresence>
                    {shouldShowBookIdea && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <Label htmlFor="hasBookIdea" className="text-white font-semibold">
                          Do you have a specific book in mind to {formData.role === 'author' ? 'write' : 'upload'}?
                        </Label>
                        <Select value={formData.hasBookIdea} onValueChange={(value) => handleFormChange('hasBookIdea', value)}>
                          <SelectTrigger className="bg-[#232120] border-gray-600 text-white">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#232120] border-gray-600">
                            <SelectItem value="yes" className="text-white hover:bg-[#2A2827]">Yes</SelectItem>
                            <SelectItem value="no" className="text-white hover:bg-[#2A2827]">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Book Details */}
                  <AnimatePresence>
                    {shouldShowBookDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="space-y-3">
                          <Label htmlFor="bookName" className="text-white font-semibold">
                            Book Name
                          </Label>
                          <Input
                            id="bookName"
                            value={formData.bookName}
                            onChange={(e) => handleFormChange('bookName', e.target.value)}
                            placeholder="Enter the book title"
                            className="bg-[#232120] border-gray-600 text-white placeholder-gray-400"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="bookLink" className="text-white font-semibold">
                            Book Link (optional)
                          </Label>
                          <Input
                            id="bookLink"
                            value={formData.bookLink}
                            onChange={(e) => handleFormChange('bookLink', e.target.value)}
                            placeholder="Link to the book (if available)"
                            className="bg-[#232120] border-gray-600 text-white placeholder-gray-400"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Relationship to Book */}
                  <AnimatePresence>
                    {shouldShowRelationship && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <Label htmlFor="relationship" className="text-white font-semibold">
                          What is your relationship to this book?
                        </Label>
                        <Select value={formData.relationship} onValueChange={(value) => handleFormChange('relationship', value)}>
                          <SelectTrigger className="bg-[#232120] border-gray-600 text-white">
                            <SelectValue placeholder="Select your relationship" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#232120] border-gray-600">
                            <SelectItem value="author" className="text-white hover:bg-[#2A2827]">I am the author</SelectItem>
                            <SelectItem value="connected" className="text-white hover:bg-[#2A2827]">I am connected to the author</SelectItem>
                            <SelectItem value="fan" className="text-white hover:bg-[#2A2827]">I am a fan</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Comments */}
                  <AnimatePresence>
                    {shouldShowComments && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <Label htmlFor="comments" className="text-white font-semibold">
                          Additional Comments (optional)
                        </Label>
                        <Textarea
                          id="comments"
                          value={formData.comments}
                          onChange={(e) => handleFormChange('comments', e.target.value)}
                          placeholder="Tell us more about your request, experience, or anything else you'd like us to know..."
                          className="bg-[#232120] border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form Actions */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => {
                        setShowForm(false)
                        resetForm()
                      }}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-[#232120]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitRequest}
                      disabled={isSubmitting || !formData.role}
                      className="flex-1 bg-gradient-to-r from-[#F1592A] to-[#FF8C94] hover:from-[#FF8C94] hover:to-[#F1592A] text-white"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  )
} 
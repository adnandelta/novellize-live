'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useAuth } from '@/app/authcontext'
import { db } from '@/lib/firebaseConfig'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Sparkles, Upload } from 'lucide-react'

export const AuthorRequestSection = () => {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestType, setRequestType] = useState<string | null>(null)

  const handleRequestAccess = async (type: 'author_access' | 'uploader_access') => {
    if (!user) {
      toast.error(`Please login to request ${type.split('_')[0]} access`)
      return
    }

    try {
      setIsSubmitting(true)
      setRequestType(type)

      // Check if user has already submitted a request of this type
      const requestsRef = collection(db, 'requests')
      const q = query(
        requestsRef, 
        where('userId', '==', user.uid),
        where('type', '==', type)
      )
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast.error(`You have already submitted a request for ${type.split('_')[0]} access`)
        return
      }

      // Add new request to Firestore
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        email: user.email,
        status: 'pending',
        createdAt: new Date(),
        type: type
      })

      toast.success('Your request has been submitted successfully!')
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
      setRequestType(null)
    }
  }

  const buttonConfig = [
    {
      type: 'author_access',
      title: 'Author Access',
      description: 'Create and publish your own novels',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'from-[#F1592A] to-[#FF8C94] hover:from-[#FF8C94] hover:to-[#F1592A]'
    },
    {
      type: 'uploader_access',
      title: 'Uploader Access',
      description: 'Upload content from other authors',
      icon: <Upload className="w-5 h-5" />,
      color: 'from-[#4A90E2] to-[#5CB9FF] hover:from-[#5CB9FF] hover:to-[#4A90E2]'
    }
  ]

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
              Join our growing community and choose the role that fits you best. Whether you want to publish your own stories or upload content from other authors.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {buttonConfig.map((config, index) => (
              <motion.div
                key={config.type}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + (index * 0.15), duration: 0.5 }}
                className="flex flex-col"
              >
                <h3 className="text-xl font-bold text-white mb-2">{config.title}</h3>
                <p className="text-gray-300 mb-4 text-sm">{config.description}</p>
                <Button
                  onClick={() => handleRequestAccess(config.type as any)}
                  disabled={isSubmitting || !user}
                  className={`relative group bg-gradient-to-r ${config.color} text-white px-4 py-5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 mt-auto`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 w-full">
                    {config.icon}
                    {isSubmitting && requestType === config.type 
                      ? 'Submitting...' 
                      : `Request ${config.title}`}
                  </span>
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </Button>
              </motion.div>
            ))}
          </div>

          {!user && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-gray-400 text-sm"
            >
              Please login to request access
            </motion.p>
          )}
        </div>
      </div>
    </motion.section>
  )
} 
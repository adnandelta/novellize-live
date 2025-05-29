'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

interface Novel {
  novelId: string
  title: string
  coverPhoto: string
  synopsis: string
  rating: number
  genres?: { name: string }[]
  publishers?: {
    original: string
    english?: string
  }
  likes?: number
  views?: number
  metadata?: {
    createdAt: any
    updatedAt: any
  }
}

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: { toDate: () => Date }
  image?: string
}

interface WeeklyBookSectionProps {
  popularNovels: Novel[]
  announcements: Announcement[]
}

export default function WeeklyBookSection({ popularNovels, announcements }: WeeklyBookSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentAnnouncementPage, setCurrentAnnouncementPage] = useState(0)
  const [direction, setDirection] = useState(0)
  const [autoSlideInterval, setAutoSlideInterval] = useState<NodeJS.Timeout | null>(null)
  const [weeklyFeaturedNovels, setWeeklyFeaturedNovels] = useState<Novel[]>([])
  const [isLoadingWeeklyFeatured, setIsLoadingWeeklyFeatured] = useState(true)

  // Fetch admin-selected weekly featured novels
  useEffect(() => {
    const fetchWeeklyFeaturedNovels = async () => {
      try {
        setIsLoadingWeeklyFeatured(true)
        const weeklyFeaturedRef = doc(db, 'featuredContent', 'weeklyFeatured')
        const weeklyFeaturedDoc = await getDoc(weeklyFeaturedRef)
        
        if (weeklyFeaturedDoc.exists()) {
          const data = weeklyFeaturedDoc.data()
          if (data.novels && data.novels.length > 0) {
            console.log('Using admin-selected weekly featured novels')
            
            // Fetch full novel details for admin-selected novels
            const novels: Novel[] = []
            for (const id of data.novels) {
              try {
                const novelDoc = await getDoc(doc(db, 'novels', id))
                if (novelDoc.exists()) {
                  novels.push({
                    novelId: novelDoc.id,
                    ...novelDoc.data()
                  } as Novel)
                }
              } catch (error) {
                console.error(`Error fetching novel ${id}:`, error)
              }
            }
            
            setWeeklyFeaturedNovels(novels)
            setIsLoadingWeeklyFeatured(false)
            return
          }
        }
        
        // Fallback to popular novels if no admin selection
        console.log('Using fallback popular novels for weekly featured')
        setWeeklyFeaturedNovels([])
        setIsLoadingWeeklyFeatured(false)
      } catch (error) {
        console.error('Error fetching weekly featured novels:', error)
        setWeeklyFeaturedNovels([])
        setIsLoadingWeeklyFeatured(false)
      }
    }

    fetchWeeklyFeaturedNovels()
  }, [])

  // Use admin-selected novels if available, otherwise use popular novels
  const displayNovels = weeklyFeaturedNovels.length > 0 ? weeklyFeaturedNovels : popularNovels
  const filteredNovels = displayNovels.filter(novel => novel.coverPhoto && novel.title).slice(0, 5)
  
  const announcementsPerPage = 4
  const totalAnnouncementPages = Math.ceil(announcements.length / announcementsPerPage)

  // Reset currentSlide if it's out of bounds
  useEffect(() => {
    if (filteredNovels.length > 0 && currentSlide >= filteredNovels.length) {
      setCurrentSlide(0)
    }
  }, [filteredNovels.length, currentSlide])

  useEffect(() => {
    if (filteredNovels.length <= 1) return

    const interval = setInterval(() => {
      setDirection(1)
      setCurrentSlide(prev => (prev + 1) % filteredNovels.length)
    }, 5000)
    setAutoSlideInterval(interval)
    return () => clearInterval(interval)
  }, [filteredNovels.length])

  const handlePrevSlide = () => {
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    if (filteredNovels.length === 0) return
    setDirection(-1)
    setCurrentSlide(prev => (prev - 1 + filteredNovels.length) % filteredNovels.length)
  }

  const handleNextSlide = () => {
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    if (filteredNovels.length === 0) return
    setDirection(1)
    setCurrentSlide(prev => (prev + 1) % filteredNovels.length)
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  }

  const getCurrentPageAnnouncements = () => {
    const start = currentAnnouncementPage * announcementsPerPage
    return announcements.slice(start, start + announcementsPerPage)
  }

  return (
    <section className="pt-2 pb-6 bg-[#E7E7E8] dark:bg-[#3e3f3e]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Featured Novel */}
          <div className="bg-white dark:bg-[#3E3F3E] rounded-2xl p-4 lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#232120] dark:text-[#E7E7E8] mb-4 relative inline-block after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#F1592A]">Weekly Book</h2>
            {filteredNovels.length > 0 && filteredNovels[currentSlide] && (
              <div className="relative h-[280px] lg:h-[350px] rounded-xl overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={currentSlide}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    className="absolute w-full h-full"
                  >
                    <div className="relative w-full h-full flex items-center">
                      {/* Blurred background */}
                      <div className="absolute inset-0 z-0">
                        <Image
                          src={filteredNovels[currentSlide]?.coverPhoto || '/assets/cover.jpg'}
                          alt=""
                          fill
                          className="object-cover blur-md brightness-50"
                        />
                      </div>
                      
                      {/* Content container */}
                      <div className="relative z-10 w-full h-full flex px-8 md:px-12">
                        {/* Book cover */}
                        <div className="w-1/3 h-full flex items-center justify-center">
                          <div className="relative w-[120px] h-[180px] md:w-[140px] md:h-[210px] lg:w-[160px] lg:h-[240px] shadow-2xl transition-transform duration-300 hover:scale-105">
                            <Image
                              src={filteredNovels[currentSlide]?.coverPhoto || '/assets/cover.jpg'}
                              alt={filteredNovels[currentSlide]?.title || 'Novel cover'}
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                        </div>
                        
                        {/* Book info */}
                        <div className="w-2/3 flex flex-col justify-center pl-4 md:pl-6">
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                            {filteredNovels[currentSlide]?.title || 'Loading...'}
                          </h3>
                          <p className="text-gray-200 text-sm md:text-base mb-2 line-clamp-3 md:line-clamp-4">
                            <span className="font-bold">{filteredNovels[currentSlide]?.synopsis?.split('.')[0] || 'Loading'}.</span>
                            {filteredNovels[currentSlide]?.synopsis?.split('.').slice(1).join('.') || ''}
                          </p>
                          <div className="flex items-center space-x-2 text-lg text-[#F1592A]">
                            <span>★</span>
                            <span>{filteredNovels[currentSlide]?.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                
                {filteredNovels.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevSlide}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-[#F1592A]/75 text-white p-2 rounded-full z-20 transition-colors duration-300"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleNextSlide}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-[#F1592A]/75 text-white p-2 rounded-full z-20 transition-colors duration-300"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white dark:bg-[#3E3F3E] rounded-2xl p-4 lg:col-span-1">
            <h2 className="text-2xl font-bold text-[#232120] dark:text-[#E7E7E8] mb-4">Announcements</h2>
            <div className="space-y-3 max-h-[350px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentAnnouncementPage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {getCurrentPageAnnouncements().map((announcement) => (
                    <Link 
                      href={`/forum/post/${announcement.id}`} 
                      key={announcement.id}
                      className="group block p-4 rounded-lg bg-[#232120] dark:bg-[#232120] hover:bg-gray-900 
                        transition-all duration-300 flex items-center gap-3"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-white dark:bg-white rounded-lg flex items-center justify-center">
                          <Image
                            src="/assets/favicon.png"
                            alt="Announcement icon"
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium line-clamp-1">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {(() => {
                            const date = announcement.createdAt?.toDate();
                            if (!date) return '9 days ago';
                            
                            const now = new Date();
                            const diffTime = Math.abs(now.getTime() - date.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays === 1) return '1 day ago';
                            return `${diffDays} days ago`;
                          })()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Pagination dots */}
              {totalAnnouncementPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: totalAnnouncementPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentAnnouncementPage(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        currentAnnouncementPage === index 
                          ? 'bg-[#F1592A] w-4' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


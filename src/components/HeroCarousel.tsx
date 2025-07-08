'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

interface HeroCard {
  id: string
  title: string
  content: string
  image: string
  link: string
  buttonText?: string
  isActive: boolean
  tags?: string[]
}

interface HeroCarouselProps {
  loading?: boolean
}

export default function HeroCarousel({ loading = false }: HeroCarouselProps) {
  const [cards, setCards] = useState<HeroCard[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [autoSlideInterval, setAutoSlideInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch admin-configured hero cards
  useEffect(() => {
    const fetchHeroCards = async () => {
      try {
        setIsLoading(true)
        const heroCarouselRef = doc(db, 'featuredContent', 'heroCarousel')
        const heroCarouselDoc = await getDoc(heroCarouselRef)
        
        if (heroCarouselDoc.exists()) {
          const data = heroCarouselDoc.data()
          if (data.cards && data.cards.length > 0) {
            // Filter only active cards and sort by order
            const activeCards = data.cards
              .filter((card: HeroCard) => card.isActive)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            
            setCards(activeCards)
          }
        }
      } catch (error) {
        console.error('Error fetching hero carousel cards:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHeroCards()
  }, [])

  // Auto-slide functionality
  useEffect(() => {
    if (cards.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide(current => 
        current < cards.length - 1 ? current + 1 : 0
      )
    }, 6000) // Change slide every 6 seconds

    setAutoSlideInterval(interval)

    return () => {
      if (autoSlideInterval) {
        clearInterval(autoSlideInterval)
      }
    }
  }, [cards.length])

  const nextSlide = () => {
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    setCurrentSlide(current => current < cards.length - 1 ? current + 1 : 0)
  }

  const prevSlide = () => {
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    setCurrentSlide(current => current > 0 ? current - 1 : cards.length - 1)
  }

  const goToSlide = (index: number) => {
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    setCurrentSlide(index)
  }

  // Get the next slides for animation
  const getNextSlides = () => {
    return [1, 2].map(offset => {
      const index = (currentSlide + offset) % cards.length
      return { index, card: cards[index] }
    }).filter(item => item.card)
  }

  if (loading || isLoading || cards.length === 0) {
    return (
      <section className="relative pt-10 pb-4 bg-gradient-to-br from-[#E7E7E8] to-[#F5F5F5] dark:from-[#232120] dark:to-[#2A2827] overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="relative h-[300px] md:h-[350px] rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 dark:text-gray-500">Loading...</div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative pt-10 pb-4 bg-gradient-to-br from-[#E7E7E8] to-[#F5F5F5] dark:from-[#232120] dark:to-[#2A2827] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute w-full h-full">
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background: `
                linear-gradient(90deg, transparent 95%, rgba(241, 89, 42, 0.1) 95%),
                linear-gradient(transparent 95%, rgba(241, 89, 42, 0.1) 95%)
              `,
              backgroundSize: '30px 30px'
            }}
            animate={{
              backgroundPosition: ['0px 0px', '30px 30px'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Extended container with transparent sides for navigation buttons */}
        <div className="relative">
          {/* Transparent extensions for buttons */}
          <div className="absolute -left-16 top-0 w-20 h-full z-30 pointer-events-none" />
          <div className="absolute -right-16 top-0 w-20 h-full z-30 pointer-events-none" />
          
          <div className="flex gap-4 h-[300px] md:h-[350px] mx-8 relative">
            {/* Main Carousel */}
            <div className="flex-1 relative rounded-2xl shadow-2xl">
              {/* Navigation Arrows - Centered on card edge (left) */}
              {cards.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevSlide}
                  className="absolute left-0 -translate-x-1/2 inset-y-0 my-auto z-30 w-10 h-10 bg-white/30 border border-white/80 backdrop-blur-md shadow-lg hover:bg-white/60 text-white flex items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    boxShadow: '0 4px 24px 0 rgba(255,255,255,0.10)',
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: 'rgba(255,255,255,0.8)',
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.8, x: 100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.1, x: -100 }}
                transition={{ 
                  duration: 0.7, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  scale: { duration: 0.8 }
                }}
                className="absolute inset-0"
              >
                {/* Background Image */}
                <motion.div 
                  className="absolute inset-0"
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <Image
                    src={cards[currentSlide]?.image || '/assets/hero-section.jpg'}
                    alt={cards[currentSlide]?.title || 'Hero Image'}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                </motion.div>

                {/* Content - Bottom Aligned */}
                <div className="relative z-10 h-full flex items-end">
                  <div className="w-full px-6 md:px-8 pb-6 md:pb-8">
                    {/* Tags */}
                    {cards[currentSlide]?.tags && cards[currentSlide].tags.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 50, x: 30 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                        className="flex flex-row mb-1 overflow-hidden"
                      >
                        {cards[currentSlide].tags.map((tag, index) => (
                          <span
                            key={index}
                            className={
                              `bg-transparent text-white text-xs font-medium px-3 py-1 uppercase tracking-wide border-t border-b border-r border-white ${
                                index === 0
                                  ? 'border-l border-white rounded-l'
                                  : 'border-l border-white'
                              } ${
                                index === ((cards[currentSlide].tags?.length ?? 0) - 1)
                                  ? 'rounded-r'
                                  : ''
                              }`
                            }
                          >
                            {tag}
                          </span>
                        ))}
                      </motion.div>
                    )}

                    <motion.h1
                      initial={{ opacity: 0, y: 50, x: 30 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                      className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight"
                    >
                      {cards[currentSlide]?.title}
                    </motion.h1>
                    
                    <motion.p
                      initial={{ opacity: 0, y: 50, x: 30 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                      className="text-sm md:text-base text-gray-200 mb-4 whitespace-pre-line"
                      style={{ lineHeight: '1.1' }}
                    >
                      {cards[currentSlide]?.content}
                    </motion.p>

                    {cards[currentSlide]?.link && (
                      <motion.div
                        initial={{ opacity: 0, y: 50, x: 30 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                      >
                        <Link 
                          href={cards[currentSlide].link}
                          target={cards[currentSlide].link.startsWith('http') ? '_blank' : '_self'}
                          rel={cards[currentSlide].link.startsWith('http') ? 'noopener noreferrer' : ''}
                        >
                          <Button 
                            size="sm"
                            className="bg-[#F1592A] hover:bg-[#E44D1F] text-white px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg group"
                          >
                            {cards[currentSlide]?.buttonText || 'Learn More'}
                            <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide Counter - Bottom Right */}
            {cards.length > 1 && (
              <div className="absolute bottom-3 right-3 z-20 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center min-w-[32px] h-6">
                <span className="text-white text-xs font-bold mr-0.5">
                  {currentSlide + 1}
                </span>
                <span className="text-white/60 text-xs font-semibold">
                  / {cards.length}
                </span>
              </div>
            )}
          </div>

          {/* Side Preview Cards - Vertical Strips */}
          {cards.length > 1 && (
            <div className="hidden md:flex gap-1 w-16 lg:w-20 relative mr-4">
              {/* Show next 2 cards as tall vertical strips */}
              {getNextSlides().map((item, index) => {
                const { index: previewIndex, card } = item;
                
                return (
                  <motion.div
                    key={`preview-${previewIndex}-${currentSlide}`}
                    className="relative flex-1 h-full rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => goToSlide(previewIndex)}
                    initial={{ 
                      scale: 0.9,
                      opacity: 0.7,
                      x: 20
                    }}
                    animate={{ 
                      scale: 1,
                      opacity: 1,
                      x: 0
                    }}
                    exit={{ 
                      scale: 0.8,
                      opacity: 0,
                      x: -20
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ 
                      scale: 0.95,
                      transition: { duration: 0.1 }
                    }}
                    transition={{ 
                      duration: 0.6,
                      delay: index * 0.1,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        className="object-cover"
                      />
                    </motion.div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    
                    {/* Hover overlay with expansion effect */}
                    <motion.div 
                      className="absolute inset-0 bg-[#F1592A]/20"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ 
                        opacity: 1,
                        scale: 1,
                        transition: { duration: 0.3 }
                      }}
                    />
                    
                    {/* Click animation overlay */}
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileTap={{ 
                        opacity: [0, 0.5, 0],
                        scale: [0.5, 1.2, 1],
                        transition: { duration: 0.4 }
                      }}
                    />
                  </motion.div>
                );
              })}
              {/* Right arrow at the end of preview cards */}
              <Button
                variant="ghost"
                size="icon"
                onClick={nextSlide}
                className="absolute right-0 translate-x-1/2 inset-y-0 my-auto z-30 w-10 h-10 bg-white/30 border border-white/80 backdrop-blur-md shadow-lg hover:bg-white/60 text-white flex items-center justify-center rounded-full transition-all duration-300"
                style={{
                  boxShadow: '0 4px 24px 0 rgba(255,255,255,0.10)',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: 'rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
        </div>

        {/* Bottom Slide Indicators */}
        {cards.length > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-[#F1592A] scale-125' 
                    : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
} 
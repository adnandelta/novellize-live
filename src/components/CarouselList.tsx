'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { NovelCard } from '@/components/NovelCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

interface Novel {
  novelId: string
  title: string
  coverPhoto: string
  genres: { name: string }[]
  rating: number
  synopsis: string
  publishers: {
    original: string
    english?: string
  }
  likes: number
  tags?: string[]
}

interface LatestReleasesCarouselProps {
  novels: Novel[]
  loading: boolean
  onFollowChange: (novelId: string, isFollowing: boolean) => void
  title: string
}

export function LatestReleasesCarousel({ 
  novels, 
  loading, 
  onFollowChange,
  title 
}: LatestReleasesCarouselProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  const scrollToIndex = useCallback((index: number) => {
    api?.scrollTo(index)
  }, [api])

  const buttonVariants = {
    idle: {
      scale: 1,
      boxShadow: "0px 0px 8px rgba(241, 89, 42, 0.5)",
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0px 0px 15px rgba(241, 89, 42, 0.8)",
    }
  }

  useEffect(() => {
    if (!api) {
      return
    }

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  }

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <section className=" bg-[#E7E7E8] dark:bg-[#232120]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <motion.h2 
            className="text-2xl font-bold text-[#232120] dark:text-[#E7E7E8] relative inline-block after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#F1592A]"
            variants={fadeIn}
          >
            {title}
          </motion.h2>
          {/* <motion.div
            variants={fadeIn}
            className="text-[#F1592A]"
          >
            View All
          </motion.div> */}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="relative">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {novels.map((novel, index) => (
                  <CarouselItem key={novel.novelId} className="pl-2 md:pl-4 md:basis-1/3 lg:basis-1/5">
                    <motion.div
                      variants={fadeIn}
                      whileHover={{ scale: 1.05 }}
                      onHoverStart={() => setHoveredIndex(index)}
                      onHoverEnd={() => setHoveredIndex(null)}
                    >
                      <NovelCard 
                        novel={{
                          ...novel, 
                          availability: {type: "FREE"},
                          tags: novel.tags || []
                        }} 
                        onFollowChange={onFollowChange} 
                      />
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-1 mt-4">
              {novels.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    current === index 
                      ? "bg-[#F1592A] w-4" 
                      : "bg-[#F1592A]/20 hover:bg-[#F1592A]/40"
                  )}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Browse All button for both mobile and desktop */}
        <motion.div 
          className="mt-8 md:mt-12 text-center"
          variants={fadeIn}
        >
          <Link href="/browse">
            <motion.div
              variants={buttonVariants}
              initial="idle"
              animate="idle"
              whileHover="hover"
              className="inline-block"
            >
              <Button 
                variant="outline" 
                className="relative border-2 border-[#F1592A] text-[#F1592A] hover:bg-[#F1592A] hover:text-white dark:border-[#F1592A] dark:text-[#F1592A] dark:hover:bg-[#F1592A] dark:hover:text-[#E7E7E8] overflow-hidden group"
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/0 via-[#F1592A]/30 to-[#F1592A]/0"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <span className="relative">Browse All {title}</span>
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
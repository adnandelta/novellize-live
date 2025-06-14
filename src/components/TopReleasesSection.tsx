import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

interface Novel {
  novelId: string;
  title: string;
  coverPhoto: string;
  genres: { name: string }[];
  rating: number;
  synopsis: string;
  publishers: {
    original: string;
    english?: string;
  };
  likes: number;
  metadata?: {
    createdAt: any;
    updatedAt: any;
  };
}

interface TopReleasesSectionProps {
  latestNovels: Novel[];
  editorsPicks: Novel[];
  loading: boolean;
}

export function TopReleasesSection({ latestNovels, editorsPicks, loading }: TopReleasesSectionProps) {
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const novels = latestNovels.slice(0, 10);
  const [isAutoSlidePaused, setIsAutoSlidePaused] = useState(false);

  useEffect(() => {
    if (novels.length > 0 && !selectedNovel) {
      setSelectedNovel(novels[0]);
    }
  }, [novels]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (!isAutoSlidePaused && novels.length > 0) {
      intervalId = setInterval(() => {
        setSelectedNovel((currentNovel) => {
          const currentIndex = currentNovel 
            ? novels.findIndex(novel => novel.novelId === currentNovel.novelId)
            : -1;
          const nextIndex = (currentIndex + 1) % novels.length;
          return novels[nextIndex];
        });
      }, 8000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [novels.length, isAutoSlidePaused]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isScrolling) return;

    const container = scrollContainerRef.current;
    const scrollWidth = container.scrollWidth / 3;
    
    if (container.scrollLeft < 10) {
      setIsScrolling(true);
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = scrollWidth;
      container.style.scrollBehavior = 'smooth';
      setIsScrolling(false);
    } else if (container.scrollLeft >= (scrollWidth * 2) - 10) {
      setIsScrolling(true);
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = scrollWidth;
      container.style.scrollBehavior = 'smooth';
      setIsScrolling(false);
    }
  }, [isScrolling]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initialize scroll position
      container.scrollLeft = container.scrollWidth / 3;
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && !isScrolling) {
      const scrollAmount = 300;
      const container = scrollContainerRef.current;
      const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleNovelSelect = useCallback((novel: Novel) => {
    setSelectedNovel(novel);
    setIsAutoSlidePaused(true);
    
    // Resume auto-sliding after 8 seconds of inactivity
    setTimeout(() => {
      setIsAutoSlidePaused(false);
    }, 8000);
  }, []);

  if (loading) {
    return (
      <section className=" bg-[#E7E7E8] dark:bg-[#232120]">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-[500px]">
            <div className="border-4 border-[#F1592A] border-t-transparent rounded-lg animate-spin"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!latestNovels.length && !editorsPicks.length) {
    return null;
  }

  return (
    <section className="py-6 md:py-8 bg-[#E7E7E8] dark:bg-[#232120]">
      <div className="container mx-auto">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Latest Releases Section - Reduced width to 60% */}
            {latestNovels.length > 0 && (
              <div className="lg:w-[60%]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl md:text-2xl font-bold text-[#232120] dark:text-[#E7E7E8] relative inline-block after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#F1592A]">
                    New Arrivals
                  </h2>
                  {/* Navigation Arrows */}
                  <div className="flex gap-2">
                    <div 
                      onClick={() => scrollCarousel('left')}
                      className="w-8 h-8 bg-white/80 dark:bg-black/80 rounded-full flex items-center justify-center cursor-pointer shadow-md backdrop-blur-sm hover:bg-white dark:hover:bg-black transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#232120] dark:text-[#E7E7E8]" />
                    </div>
                    <div 
                      onClick={() => scrollCarousel('right')}
                      className="w-8 h-8 bg-white/80 dark:bg-black/80 rounded-full flex items-center justify-center cursor-pointer shadow-md backdrop-blur-sm hover:bg-white dark:hover:bg-black transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-[#232120] dark:text-[#E7E7E8]" />
                    </div>
                  </div>
                </div>
                
                {/* Horizontal Novel Covers - Reduced sizes and padding */}
                <div className="relative mb-4 mt-2">
                  <div 
                    ref={scrollContainerRef} 
                    className="overflow-x-auto scrollbar-hide"
                  >
                    <div className="flex gap-3 min-w-min pb-3 pt-2 px-1">
                      {/* First set */}
                      {novels.map((novel, index) => (
                        <motion.div
                          key={`pre-${novel.novelId}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            delay: index * 0.1,
                            duration: 0.5,
                            ease: [0.4, 0, 0.2, 1]
                          }}
                          whileHover={{ 
                            scale: 1.05,
                            y: -5,
                            transition: { duration: 0.2 }
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="relative cursor-pointer flex-shrink-0 pt-1"
                          onClick={() => handleNovelSelect(novel)}
                        >
                          <div className={`relative w-24 h-36 rounded-lg transform transition-all duration-300 ${
                            selectedNovel?.novelId === novel.novelId
                              ? 'ring-2 ring-[#F1592A] scale-105 shadow-lg'
                              : 'hover:shadow-md'
                          }`}>
                            <Image
                              src={novel.coverPhoto}
                              alt={novel.title}
                              fill
                              className="object-cover rounded-lg"
                              sizes="96px"
                              quality={75}
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        </motion.div>
                      ))}
                      {/* Main set */}
                      {novels.map((novel, index) => (
                        <motion.div
                          key={novel.novelId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative cursor-pointer flex-shrink-0 pt-1"
                          onClick={() => handleNovelSelect(novel)}
                        >
                          <div className={`relative w-24 h-36 rounded-lg ${
                            selectedNovel?.novelId === novel.novelId
                              ? 'ring-2 ring-[#F1592A]'
                              : ''
                          }`}>
                            <Image
                              src={novel.coverPhoto}
                              alt={novel.title}
                              fill
                              className="object-cover rounded-lg"
                              sizes="96px"
                              quality={75}
                            />
                          </div>
                        </motion.div>
                      ))}
                      {/* Last set */}
                      {novels.map((novel, index) => (
                        <motion.div
                          key={`post-${novel.novelId}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative cursor-pointer flex-shrink-0 pt-1"
                          onClick={() => handleNovelSelect(novel)}
                        >
                          <div className={`relative w-24 h-36 rounded-lg ${
                            selectedNovel?.novelId === novel.novelId
                              ? 'ring-2 ring-[#F1592A]'
                              : ''
                          }`}>
                            <Image
                              src={novel.coverPhoto}
                              alt={novel.title}
                              fill
                              className="object-cover rounded-lg"
                              sizes="96px"
                              quality={75}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Novel Details - Reduced sizes */}
                {selectedNovel && (
                  <motion.div
                    key={selectedNovel.novelId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4"
                  >
                    <div className="relative w-32 h-48 flex-shrink-0">
                      <Image
                        src={selectedNovel.coverPhoto}
                        alt={selectedNovel.title}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#232120] dark:text-[#E7E7E8] mb-1">
                        {selectedNovel.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-[#464646] dark:text-[#C3C3C3] px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-md">
                          {selectedNovel.publishers.original}
                        </span>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-[#F1592A] fill-[#F1592A]" />
                          <span className="ml-1 text-sm text-[#464646] dark:text-[#C3C3C3]">
                            {selectedNovel.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedNovel.genres.map((genre, index) => (
                          <Link 
                            key={index}
                            href={`/browse?selectedGenres=${encodeURIComponent(genre.name)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-bold px-2 py-1 bg-[#F1592A]/10 text-[#F1592A] rounded-full hover:bg-[#F1592A]/20 transition-colors"
                          >
                            {genre.name}
                          </Link>
                        ))}
                      </div>
                      <p className="text-sm text-[#464646] dark:text-[#C3C3C3] mb-3 line-clamp-3">
                        {selectedNovel.synopsis}
                      </p>
                      <div className="flex gap-2">
                        <Link href={`/novel/${selectedNovel.novelId}`}>
                          <Button className="bg-[#F1592A] rounded-full text-white hover:bg-[#F1592A]/90">
                            READ NOW
                          </Button>
                        </Link>
                        <Button variant="outline" size="icon" className="rounded-full">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Editors' Choice Section - Increased width to 40% */}
            {editorsPicks.length > 0 && (
              <div className={`${latestNovels.length > 0 ? 'lg:w-[40%]' : 'w-full'} bg-[#1A1A1A] dark:bg-[#1A1A1A] p-6 rounded-lg`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#232120] dark:text-[#E7E7E8] mb-4 relative inline-block after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#F1592A]">
                    Editors' Choice
                  </h2>
                  
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {editorsPicks.map((novel, index) => (
                    <Link key={novel.novelId} href={`/novel/${novel.novelId}`}>
                      <div className="flex gap-3 group cursor-pointer">
                        <div className="relative w-[70px] h-[95px] flex-shrink-0">
                          <Image
                            src={novel.coverPhoto}
                            alt={novel.title}
                            fill
                            className="object-cover rounded"
                            sizes="70px"
                            quality={75}
                          />
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-white line-clamp-2 group-hover:text-[#4B6BFB] leading-tight mb-1">
                            {novel.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-[#94A3B8] truncate">
                              {novel.publishers.original}
                            </span>
                          </div>
                          <span className="text-xs text-[#94A3B8] mb-1">
                            {novel.genres[0]?.name || 'Fantasy'}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-[#F1592A] fill-[#F1592A]" />
                              <span className="ml-1 text-xs text-[#94A3B8]">
                                {novel.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
} 
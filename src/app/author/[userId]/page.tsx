'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StarRating } from '@/components/ui/starrating'
import { Home, Moon, Sun, BookOpen, Heart, Eye, Twitter, Facebook, Globe, Share, Star } from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GiQuillInk, GiBookshelf, GiTrophyCup, GiStarMedal, GiRibbonMedal, GiLaurelsTrophy } from "react-icons/gi"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/app/authcontext"
import { FaDiscord, FaTwitter, FaEdit, FaPatreon, FaFacebook, FaHeart, FaInstagram, FaYoutube, FaTiktok, FaPaypal } from 'react-icons/fa'
import { SiKofi } from 'react-icons/si'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { BsCalendarCheck, BsPencilSquare, BsBookHalf, BsStars, BsShare, BsArrowUpRight } from "react-icons/bs"

// Use dynamic import for Chart.js components to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false })
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false })
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface User {
  id: string
  username: string
  bio: string
  profilePicture: string
  social_links?: {
    twitter?: string
    discord?: string
    instagram?: string
    youtube?: string
    tiktok?: string
    website?: string
  }
  support_links?: {
    patreon?: string
    kofi?: string
    paypal?: string
  }
  userType: 'reader' | 'author'
  totalWorks?: number
  totalLikes?: number
  timeCreated: Timestamp
  verified: boolean
  recentActivity?: {
    type: 'published' | 'updated' | 'chapter'
    novelId: string
    novelTitle: string
    timestamp: Timestamp
    details?: string
  }[]
  authorStats?: {
    totalViews: number
    totalChapters: number
    averageRating: number
    followers: number
  }
}

interface Novel {
  novelId: string
  name: string
  coverUrl: string
  rating: number
  genre: string
  likes: number
  views: number
  chapters: number
  tags?: string[]
  description?: string
  author?: string
}

const initializeSocialLinks = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && !userDoc.data().social_links) {
      await updateDoc(userRef, {
        social_links: {
          twitter: '',
          discord: '',
          instagram: '',
          youtube: '',
          tiktok: '',
          website: ''
        }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error initializing social links:', error);
    return false;
  }
};

const initializeSupportLinks = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && !userDoc.data().support_links) {
      await updateDoc(userRef, {
        support_links: {
          patreon: '',
          kofi: '',
          paypal: ''
        }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error initializing support links:', error);
    return false;
  }
};

export default function AuthorPage({ params }: { params: { userId: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState({
    username: '',
    bio: '',
    profilePicture: '',
    social_links: {
      twitter: '',
      discord: '',
      instagram: '',
      youtube: '',
      tiktok: '',
      website: ''
    },
    support_links: {
      patreon: '',
      kofi: '',
      paypal: ''
    }
  })
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { user: currentUser } = useAuth()
  const [isEditingSocials, setIsEditingSocials] = useState(false)
  const [socialLinksForm, setSocialLinksForm] = useState({
    twitter: '',
    discord: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    website: ''
  })
  const [isEditingSupports, setIsEditingSupports] = useState(false)
  const [supportLinksForm, setSupportLinksForm] = useState({
    patreon: '',
    kofi: '',
    paypal: ''
  })

  // Data for the weekly activity chart
  const activityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Views',
        data: [120, 150, 180, 90, 160, 95, 75],
        fill: false,
        borderColor: '#F1592A',
        backgroundColor: '#F1592A',
        tension: 0.4,
        pointBackgroundColor: '#F1592A',
        pointBorderColor: '#F1592A',
        pointHoverBackgroundColor: '#F1592A',
        pointHoverBorderColor: '#F1592A',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Likes',
        data: [45, 62, 95, 42, 85, 55, 40],
        fill: false,
        borderColor: '#10B981',
        backgroundColor: '#10B981',
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#10B981',
        pointHoverBackgroundColor: '#10B981',
        pointHoverBorderColor: '#10B981',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ],
  }

  // Options for the weekly activity chart
  const activityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          padding: 10,
          callback: function(value: any) {
            return value + ' views';
          },
        },
        border: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          padding: 10,
        },
        border: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#ffffff',
        bodyColor: '#9ca3af',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + (context.dataset.label === 'Views' ? ' views' : ' likes');
            }
            return label;
          }
        }
      }
    },
  }

  // Data for the genre distribution chart
  const genreData = {
    labels: ['Fantasy', 'Romance', 'Sci-Fi', 'Mystery', 'Action'],
    datasets: [
      {
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          '#F1592A',  // Orange - Fantasy
          '#EC4899',  // Pink - Romance
          '#4B6BFB',  // Blue - Sci-Fi
          '#10B981',  // Green - Mystery
          '#F59E0B',  // Amber - Action
        ],
        borderWidth: 0,
      },
    ],
  }

  // Options for the genre distribution chart
  const genreOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#ffffff',
        bodyColor: '#9ca3af',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value * 100) / total);
            return `${context.label}: ${percentage}%`;
          }
        }
      }
    },
    cutout: '70%',
    rotation: -90,
    circumference: 360,
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  }

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  useEffect(() => {
    setMounted(true)
    if (params.userId) {
      fetchUserData()
      fetchUserNovels()
    }
  }, [params.userId, currentUser])

  useEffect(() => {
    console.log('Current state:', {
      isCurrentUser: currentUser?.uid === user?.id,
      currentUserId: currentUser?.uid,
      userId: user?.id,
      userType: user?.userType,
      isEditMode
    });
  }, [currentUser, user, isEditMode]);

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString();
  };

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const fetchUserData = async () => {
    if (!params.userId) return;
    setLoading(true);
    try {
      console.log('Fetching user data for:', params.userId);
      console.log('Current user:', currentUser?.uid);
      
      const userDoc = await getDoc(doc(db, 'users', params.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        console.log('User data:', userData);
        
        if (userData.userType === 'author') {
          // Initialize social_links and support_links if not present
          const defaultSocialLinks = {
            twitter: '',
            discord: '',
            instagram: '',
            youtube: '',
            tiktok: '',
            website: ''
          };

          const defaultSupportLinks = {
            patreon: '',
            kofi: '',
            paypal: ''
          };

          if (!userData.social_links) {
            await initializeSocialLinks(params.userId);
            userData.social_links = defaultSocialLinks;
          }

          if (!userData.support_links) {
            await initializeSupportLinks(params.userId);
            userData.support_links = defaultSupportLinks;
          }
          
          // Set initial edit form data
          setEditFormData({
            username: userData.username || '',
            bio: userData.bio || '',
            profilePicture: userData.profilePicture || '',
            social_links: {
              twitter: userData.social_links?.twitter || '',
              discord: userData.social_links?.discord || '',
              instagram: userData.social_links?.instagram || '',
              youtube: userData.social_links?.youtube || '',
              tiktok: userData.social_links?.tiktok || '',
              website: userData.social_links?.website || ''
            },
            support_links: {
              patreon: userData.support_links?.patreon || '',
              kofi: userData.support_links?.kofi || '',
              paypal: userData.support_links?.paypal || ''
            }
          });
          
          setUser({ ...userData, id: params.userId });
          setSocialLinksForm({
            twitter: userData.social_links?.twitter || '',
            discord: userData.social_links?.discord || '',
            instagram: userData.social_links?.instagram || '',
            youtube: userData.social_links?.youtube || '',
            tiktok: userData.social_links?.tiktok || '',
            website: userData.social_links?.website || ''
          });
          setSupportLinksForm({
            patreon: userData.support_links?.patreon || '',
            kofi: userData.support_links?.kofi || '',
            paypal: userData.support_links?.paypal || ''
          });
        } else {
          toast.error('This user is not an author');
          router.push('/');
        }
      } else {
        toast.error('User not found');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to fetch user details');
    }
    setLoading(false);
  };

  const fetchUserNovels = async () => {
    if (!params.userId) return
    try {
      // Placeholder data for now
      const placeholderNovels: Novel[] = [
        {
          novelId: '1',
          name: 'The Dragon\'s Legacy',
          coverUrl: 'https://source.unsplash.com/random/400x600?book,fantasy',
          rating: 4.7,
          genre: 'Fantasy',
          likes: 1200,
          views: 5000,
          chapters: 48,
          tags: ['Fantasy', 'Adventure', 'Romance'],
          description: 'A thrilling fantasy novel about a young dragon who discovers his destiny.',
          author: 'John Doe'
        },
        {
          novelId: '2',
          name: 'Midnight Shadows',
          coverUrl: 'https://source.unsplash.com/random/400x600?book,mystery',
          rating: 4.2,
          genre: 'Mystery',
          likes: 800,
          views: 3000,
          chapters: 32,
          tags: ['Mystery', 'Thriller'],
          description: 'A gripping mystery novel about a detective who investigates a series of mysterious disappearances.',
          author: 'Jane Smith'
        },
        {
          novelId: '3',
          name: 'Stars Beyond',
          coverUrl: 'https://source.unsplash.com/random/400x600?book,scifi',
          rating: 4.5,
          genre: 'Sci-Fi',
          likes: 1500,
          views: 6000,
          chapters: 45,
          tags: ['Sci-Fi', 'Adventure', 'Romance'],
          description: 'A sci-fi novel about a spaceship crew exploring the stars.',
          author: 'John Doe'
        }
      ]
      setNovels(placeholderNovels)
    } catch (error) {
      console.error('Error fetching user novels:', error)
      toast.error('Failed to fetch user novels')
    }
  }

  const handleEditProfile = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.id), {
        username: editFormData.username,
        bio: editFormData.bio,
        profilePicture: editFormData.profilePicture,
        social_links: editFormData.social_links,
        support_links: editFormData.support_links
      })
      
      setUser(prev => prev ? {
        ...prev,
        username: editFormData.username,
        bio: editFormData.bio,
        profilePicture: editFormData.profilePicture,
        social_links: editFormData.social_links,
        support_links: editFormData.support_links
      } : null)
      
      setIsEditMode(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleSocialLinksUpdate = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.id), {
        social_links: socialLinksForm
      })
      
      setUser(prev => prev ? {
        ...prev,
        social_links: socialLinksForm
      } : null)
      
      setIsEditingSocials(false)
      toast.success('Social links updated successfully')
    } catch (error) {
      console.error('Error updating social links:', error)
      toast.error('Failed to update social links')
    }
  }

  const handleSupportLinksUpdate = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.id), {
        support_links: supportLinksForm
      })
      
      setUser(prev => prev ? {
        ...prev,
        support_links: supportLinksForm
      } : null)
      
      setIsEditingSupports(false)
      toast.success('Support links updated successfully')
    } catch (error) {
      console.error('Error updating support links:', error)
      toast.error('Failed to update support links')
    }
  }

  const NovelCard = ({ novel }: { novel: Novel }) => {
    return (
      <Card className="overflow-hidden border-2 border-gray-300 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow duration-300">
        <Link href={`/novel/${novel.novelId}`}>
          <div className="relative aspect-[2/3] w-full">
            <Image
              src={novel.coverUrl}
              alt={novel.name}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 hover:scale-105"
            />
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2 truncate text-gray-900 dark:text-gray-100">{novel.name}</h3>
            <div className="flex items-center mb-2">
              <StarRating rating={novel.rating} />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({novel.rating.toFixed(1)})</span>
            </div>
            {novel.genre && <Badge variant="secondary" className="mb-2">{novel.genre}</Badge>}
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center"><Heart className="h-4 w-4 mr-1" /> {novel.likes}</span>
              <span className="flex items-center"><Eye className="h-4 w-4 mr-1" /> {novel.views}</span>
              <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> {novel.chapters}</span>
            </div>
          </CardContent>
        </Link>
      </Card>
    )
  }

  if (!mounted || loading) return null
  if (!user) return <div className="flex justify-center items-center h-screen">Author not found</div>

  return (
    <div className="min-h-screen bg-[#E7E7E8] dark:bg-[#232120] text-[#232120] dark:text-[#E7E7E8]">
      {/* Header Background */}
      <div className="relative h-[200px] w-full overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Ink Splashes */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`ink-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 0.7, 0.4],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: i * 0.8,
              }}
            >
              <svg
                className="w-32 h-32 text-[#F1592A]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
              </svg>
            </motion.div>
          ))}

          {/* Floating Books */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`book-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                x: [0, 30, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: i * 0.7,
              }}
            >
              <svg
                className="w-24 h-24 text-[#F1592A]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21,5c-1.11-0.35-2.33-0.5-3.5-0.5c-1.95,0-4.05,0.4-5.5,1.5c-1.45-1.1-3.55-1.5-5.5-1.5S2.45,4.9,1,6v14.65 c0,0.25,0.25,0.5,0.5,0.5c0.1,0,0.15-0.05,0.25-0.05C3.1,20.45,5.05,20,6.5,20c1.95,0,4.05,0.4,5.5,1.5c1.35-0.85,3.8-1.5,5.5-1.5 c1.65,0,3.35,0.3,4.75,1.05c0.1,0.05,0.15,0.05,0.25,0.05c0.25,0,0.5-0.25,0.5-0.5V6C22.4,5.55,21.75,5.25,21,5z M21,18.5 c-1.1-0.35-2.3-0.5-3.5-0.5c-1.7,0-4.15,0.65-5.5,1.5V8c1.35-0.85,3.8-1.5,5.5-1.5c1.2,0,2.4,0.15,3.5,0.5V18.5z" />
              </svg>
            </motion.div>
          ))}

          {/* Writing Quills */}
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={`quill-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -40, 0],
                x: [-20, 20, -20],
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              <svg
                className="w-16 h-16 text-[#F1592A]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-2.3 6.7l-1.4-1.4a5.95 5.95 0 0 1-1.6 3.3l-8.3 8.3L2 22l1.1-4.4 8.3-8.3a5.96 5.96 0 0 1 3.3-1.6l-1.4-1.4a8 8 0 0 0-4.7 2.3L1.3 16c-.4.4-.4 1 0 1.4l5.3 5.3c.4.4 1 .4 1.4 0l7.5-7.5a8 8 0 0 0 2.3-4.7z" />
              </svg>
            </motion.div>
          ))}

          {/* Magical Sparkles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              <div className="w-2 h-2 bg-[#F1592A] rounded-full" />
            </motion.div>
          ))}

          {/* Floating Text Lines */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`text-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [-50, 50, -50],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                delay: i * 1,
              }}
            >
              <div className="w-32 h-1 bg-gradient-to-r from-[#F1592A] to-transparent rounded-full" />
            </motion.div>
          ))}
        </div>

        <Image 
          src="/assets/default-cover.jpg"
          alt="Background"
          fill
          className="object-cover opacity-30"
          priority
        />
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E7E7E8]/60 to-[#E7E7E8]/40 dark:from-[#232120]/60 dark:to-[#232120]/40" />
        
        {/* Stars effect */}
        <div className="absolute inset-0">
          <div className="absolute top-4 left-[10%] w-1 h-1 bg-white rounded-full opacity-60" />
          <div className="absolute top-8 left-[20%] w-2 h-2 bg-white rounded-full opacity-40" />
          <div className="absolute top-12 right-[30%] w-1.5 h-1.5 bg-white rounded-full opacity-50" />
          <div className="absolute top-6 right-[15%] w-1 h-1 bg-white rounded-full opacity-70" />
        </div>
        
        {/* Planet effect */}
        <div className="absolute -right-20 -top-20 w-[200px] h-[200px] rounded-full bg-gradient-to-br from-gray-400/20 to-gray-600/20 blur-sm" />
        
        {/* Header Content */}
        <div className="container max-w-[1200px] mx-auto relative z-10">
          {/* Top Bar */}
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-1 rounded-full text-sm mr-3">
                Home
              </Link>
            </div>
            {currentUser?.uid === params.userId && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditMode(!isEditMode)}
                className="bg-gradient-to-r from-[#F1592A] to-[#FF424D] hover:from-[#E73E48] hover:to-[#FF424D] text-white px-6 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg"
              >
                <FaEdit className="w-4 h-4" />
                {isEditMode ? 'Cancel Editing' : 'Edit Profile'}
              </motion.button>
            )}
          </div>

          {/* Main Header Bar */}
          <div className="flex items-center justify-between rounded-full bg-orange-50/30 dark:bg-[#2A1F1A]/60 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 shadow-lg overflow-hidden mt-10 h-[72px] w-full">
            {/* Profile Info - Left side */}
            <div className="flex items-center gap-4 pl-4 pr-10 border-r border-orange-200/20 dark:border-orange-800/20 h-full relative group">
              {currentUser?.uid === params.userId && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsEditMode(true)}
                  className="absolute -top-2 -right-2 bg-[#F1592A] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                >
                  <FaEdit className="w-3 h-3" />
                </motion.button>
              )}
              <Avatar className="w-14 h-14 ring-2 ring-white/20">
                <AvatarImage src={user.profilePicture} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{user.username}</h2>
                <span className="text-sm text-gray-400">Author since {new Date(user.timeCreated.toDate()).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Stats Section - Center */}
            <div className="flex items-center justify-center flex-1 h-full border-r border-orange-200/20 dark:border-orange-800/20">
              {/* Stats pill container */}
              <div className="bg-orange-50/20 dark:bg-[#2A1F1A]/40 backdrop-blur-md border border-orange-100/10 dark:border-orange-900/10 rounded-full px-10 py-2">
                <div className="grid grid-cols-3 gap-10">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Total Works</div>
                    <div className="text-lg font-semibold">{user.totalWorks || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Total Views</div>
                    <div className="text-lg font-semibold">{user.authorStats?.totalViews || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Followers</div>
                    <div className="text-lg font-semibold">{user.authorStats?.followers || 0}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Social Links - Right Side */}
            <div className="flex gap-2 px-4">
              {user.social_links?.twitter && (
                <Link href={user.social_links.twitter} className="w-10 h-10 bg-white/20 dark:bg-[#2A3447]/40 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-full flex items-center justify-center">
                  <FaTwitter className="w-5 h-5 text-blue-400" />
                </Link>
              )}
              {user.social_links?.discord && (
                <Link href={user.social_links.discord} className="w-10 h-10 bg-white/20 dark:bg-[#2A3447]/40 backdrop-blur-md border border-white/10 dark:border-gray-700/10 rounded-full flex items-center justify-center">
                  <FaDiscord className="w-5 h-5 text-indigo-400" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social Media and Support Section */}
      <div className="container max-w-[1200px] mx-auto -mt-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Social Media Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-50/30 via-rose-50/30 to-amber-50/30 dark:from-[#2A1F1A]/60 dark:via-[#2A1A1A]/60 dark:to-[#2A2015]/60 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-[#F1592A] to-orange-600 rounded-lg">
                  <BsShare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">My Socials</h3>
              </div>
              {currentUser?.uid === params.userId && (
                <Button
                  onClick={() => setIsEditingSocials(!isEditingSocials)}
                  className="bg-[#2A1F1A]/40 hover:bg-[#2A1F1A]/60 text-white text-sm px-3 py-1 rounded-lg"
                >
                  {isEditingSocials ? 'Cancel' : 'Edit Links'}
                </Button>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Connect with me on social media to stay updated with my latest works and announcements!
            </p>

            {isEditingSocials ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(socialLinksForm).map(([platform, url]) => (
                    <div key={platform} className="space-y-1">
                      <Label className="text-sm text-gray-400 capitalize">{platform}</Label>
                      <Input
                        value={url}
                        onChange={(e) => setSocialLinksForm(prev => ({
                          ...prev,
                          [platform]: e.target.value
                        }))}
                        placeholder={`Enter ${platform} URL`}
                        className="bg-[#2A1F1A]/40 border-orange-100/10 text-white"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleSocialLinksUpdate}
                  className="w-full bg-[#F1592A] hover:bg-[#E73E48] text-white mt-4"
                >
                  Save Social Links
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-3">
                {/* Twitter */}
                <Link 
                  href={user.social_links?.twitter || "https://twitter.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#1DA1F2]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#1DA1F2] rounded-lg group-hover:scale-110 transition-transform">
                      <FaTwitter className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[#1DA1F2]">Twitter</span>
                  </div>
                </Link>

                {/* Discord */}
                <Link 
                  href={user.social_links?.discord || "https://discord.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#5865F2]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#5865F2] rounded-lg group-hover:scale-110 transition-transform">
                      <FaDiscord className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[#5865F2]">Discord</span>
                  </div>
                </Link>

                {/* Instagram */}
                <Link 
                  href={user.social_links?.instagram || "https://instagram.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#E4405F]/10 hover:bg-[#E4405F]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#E4405F]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#E4405F] rounded-lg group-hover:scale-110 transition-transform">
                      <FaInstagram className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[#E4405F]">Instagram</span>
                  </div>
                </Link>

                {/* YouTube */}
                <Link 
                  href={user.social_links?.youtube || "https://youtube.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#FF0000]/10 hover:bg-[#FF0000]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#FF0000]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#FF0000] rounded-lg group-hover:scale-110 transition-transform">
                      <FaYoutube className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[#FFFFFF]">YouTube</span>
                  </div>
                </Link>

                {/* TikTok */}
                <Link 
                  href={user.social_links?.tiktok || "https://tiktok.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#000000]/10 hover:bg-[#000000]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#000000]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#000000] rounded-lg group-hover:scale-110 transition-transform">
                      <FaTiktok className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-900 dark:text-white">TikTok</span>
                  </div>
                </Link>

                {/* Website */}
                <Link 
                  href={user.social_links?.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#10B981]/10 hover:bg-[#10B981]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#10B981]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#10B981] rounded-lg group-hover:scale-110 transition-transform">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[#10B981]">Website</span>
                  </div>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Support Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#FF424D]/30 via-[#F1592A]/30 to-[#FF424D]/30 dark:from-[#2A1F1A]/60 dark:via-[#2A1A1A]/60 dark:to-[#2A2015]/60 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 rounded-xl p-4 relative overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-30">
              <motion.div
                className="absolute w-24 h-24 bg-gradient-to-r from-[#FF424D] to-[#F1592A] rounded-full -top-8 -left-8 blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute w-24 h-24 bg-gradient-to-r from-[#F1592A] to-[#FF424D] rounded-full -bottom-8 -right-8 blur-xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.5, 0.3, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#FF424D] to-[#F1592A] rounded-lg">
                    <FaHeart className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold">Support My Work</h3>
                </div>
                {currentUser?.uid === params.userId && (
                  <Button
                    onClick={() => setIsEditingSupports(!isEditingSupports)}
                    className="bg-[#2A1F1A]/40 hover:bg-[#2A1F1A]/60 text-white text-sm px-3 py-1 rounded-lg"
                  >
                    {isEditingSupports ? 'Cancel' : 'Edit Links'}
                  </Button>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Your support helps me create more amazing content! Choose your preferred platform to support my work.
              </p>

              {isEditingSupports ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(supportLinksForm).map(([platform, url]) => (
                      <div key={platform} className="space-y-1">
                        <Label className="text-sm text-gray-400 capitalize">{platform}</Label>
                        <Input
                          value={url}
                          onChange={(e) => setSupportLinksForm(prev => ({
                            ...prev,
                            [platform]: e.target.value
                          }))}
                          placeholder={`Enter ${platform} URL`}
                          className="bg-[#2A1F1A]/40 border-orange-100/10 text-white"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSupportLinksUpdate}
                    className="w-full bg-[#F1592A] hover:bg-[#E73E48] text-white mt-4"
                  >
                    Save Support Links
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-1">
                  <Link 
                    href={user.support_links?.patreon || "https://www.patreon.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full bg-[#FF424D]/10 hover:bg-[#FF424D]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#FF424D]/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#FF424D] rounded-lg group-hover:scale-110 transition-transform">
                        <FaPatreon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[#FF424D]">Support on Patreon</span>
                    </div>
                  </Link>

                  <Link 
                    href={user.support_links?.kofi || "https://ko-fi.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full bg-[#13C3FF]/10 hover:bg-[#13C3FF]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#13C3FF]/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#13C3FF] rounded-lg group-hover:scale-110 transition-transform">
                        <SiKofi className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[#13C3FF]">Buy me a coffee</span>
                    </div>
                  </Link>

                  <Link 
                    href={user.support_links?.paypal || "https://www.paypal.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full bg-[#003087]/10 hover:bg-[#003087]/20 py-2.5 px-4 rounded-full font-medium transition-all group border border-[#003087]/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#003087] rounded-lg group-hover:scale-110 transition-transform">
                        <FaPaypal className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[#FFFFFF]">Support via PayPal</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Rest of the content */}
      <motion.div 
        className="container max-w-[1200px] mx-auto py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Achievements Section */}
        <motion.div 
          className="mb-8"
          variants={itemVariants}
        >
          <motion.div 
            className="bg-gradient-to-r from-orange-50/30 via-rose-50/30 to-amber-50/30 dark:from-[#2A1F1A]/60 dark:via-[#2A1A1A]/60 dark:to-[#2A2015]/60 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 shadow-lg rounded-xl p-6"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <GiTrophyCup className="w-6 h-6 text-[#F1592A]" />
              Author Achievements
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Member Since Badge */}
              <motion.div 
                className="relative group"
                variants={cardVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-orange-50/50 dark:bg-[#2A1F1A]/80 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 rounded-lg p-4 h-full transform hover:scale-105 transition duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-400 rounded-lg">
                      <BsCalendarCheck className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-semibold">Member Since</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{new Date(user.timeCreated.toDate()).toLocaleDateString()}</p>
                </div>
              </motion.div>

              {/* Published Works Badge */}
              <motion.div 
                className="relative group"
                variants={cardVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-pink-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-orange-50/50 dark:bg-[#2A1F1A]/80 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 rounded-lg p-4 h-full transform hover:scale-105 transition duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-rose-400 to-pink-400 rounded-lg">
                      <GiBookshelf className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-semibold">Published Works</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{user.totalWorks || 0} Books</p>
                </div>
              </motion.div>

              {/* Total Chapters Badge */}
              <motion.div 
                className="relative group"
                variants={cardVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-orange-50/50 dark:bg-[#2A1F1A]/80 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 rounded-lg p-4 h-full transform hover:scale-105 transition duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg">
                      <BsBookHalf className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-semibold">Total Chapters</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{user.authorStats?.totalChapters || 0} Chapters</p>
                </div>
              </motion.div>

              {/* Author Level Badge */}
              <motion.div 
                className="relative group"
                variants={cardVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-violet-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-orange-50/50 dark:bg-[#2A1F1A]/80 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 rounded-lg p-4 h-full transform hover:scale-105 transition duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-purple-400 to-violet-400 rounded-lg">
                      <GiStarMedal className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-semibold">Author Level</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Level {user.authorStats?.followers ? Math.floor(user.authorStats.followers / 100) + 1 : 1}</p>
                </div>
              </motion.div>
            </div>

            {/* Special Achievements */}
            <motion.div 
              className="mt-6 bg-[#1A1614]/80 backdrop-blur-md border border-orange-900/30 rounded-xl p-6"
              variants={itemVariants}
            >
              <h4 className="text-md font-semibold mb-6 flex items-center gap-2 text-white">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <BsStars className="w-5 h-5 text-[#F1592A]" />
                </motion.div>
                Special Achievements
              </h4>
              <div className="flex flex-wrap gap-4">
                {/* Newcomer Achievement - Always visible */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(241, 89, 42, 0.3)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-[#F1592A] rounded-xl text-white text-sm font-medium flex items-center gap-3 shadow-lg border border-orange-500/20"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-2 bg-orange-500/20 rounded-lg"
                  >
                    <GiQuillInk className="w-5 h-5" />
                  </motion.div>
                  Aspiring Author
                </motion.div>

                {/* Early Supporter - Always visible */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.1
                    }
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(45, 212, 191, 0.3)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl text-white text-sm font-medium flex items-center gap-3 shadow-lg border border-teal-500/20"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: 360,
                    }}
                    transition={{
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      rotate: {
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                      }
                    }}
                    className="p-2 bg-teal-500/20 rounded-lg"
                  >
                    <BsStars className="w-5 h-5" />
                  </motion.div>
                  Early Supporter
                </motion.div>

                {(user.authorStats?.totalViews ?? 0) >= 100 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: 0.2
                      }
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 10
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl text-white text-sm font-medium flex items-center gap-3 shadow-lg border border-amber-500/20"
                  >
                    <motion.div
                      animate={{
                        y: [0, -5, 0],
                        scale: [1, 1.1, 1],
                        rotate: [0, -10, 10, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="p-2 bg-amber-500/20 rounded-lg"
                    >
                      <GiLaurelsTrophy className="w-5 h-5" />
                    </motion.div>
                    Rising Star
                  </motion.div>
                )}

                {(user.authorStats?.followers ?? 0) >= 10 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: 0.3
                      }
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 10
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl text-white text-sm font-medium flex items-center gap-3 shadow-lg border border-emerald-500/20"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="p-2 bg-emerald-500/20 rounded-lg"
                    >
                      <GiRibbonMedal className="w-5 h-5" />
                    </motion.div>
                    Growing Community
                  </motion.div>
                )}

                {(user.authorStats?.totalChapters ?? 0) >= 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: 0.4
                      }
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 10
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-sm font-medium flex items-center gap-3 shadow-lg border border-blue-500/20"
                  >
                    <motion.div
                      animate={{
                        x: [0, 5, -5, 0],
                        y: [0, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="p-2 bg-blue-500/20 rounded-lg"
                    >
                      <BsPencilSquare className="w-5 h-5" />
                    </motion.div>
                    Story Weaver
                  </motion.div>
                )}

                {(user.authorStats?.averageRating ?? 0) >= 4.0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: 0.5
                      }
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)",
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 10
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl text-white text-sm font-medium flex items-center gap-3 shadow-lg border border-purple-500/20"
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 0.8, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="p-2 bg-purple-500/20 rounded-lg"
                    >
                      <GiStarMedal className="w-5 h-5" />
                    </motion.div>
                    Reader's Choice
                  </motion.div>
                )}

                {/* Locked Achievements */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.6
                    }
                  }}
                  whileHover={{ 
                    opacity: 0.8,
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(148, 163, 184, 0.2)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-white/70 text-sm font-medium flex items-center gap-3 shadow-lg border border-slate-500/20 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-2 bg-slate-500/20 rounded-lg relative"
                  >
                    <GiLaurelsTrophy className="w-5 h-5" />
                  </motion.div>
                  <div className="flex items-center gap-2 relative">
                    <span>1K Views Master</span>
                    <span className="text-xs bg-slate-500/30 px-2 py-0.5 rounded">1000 views</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.7
                    }
                  }}
                  whileHover={{ 
                    opacity: 0.8,
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(148, 163, 184, 0.2)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-white/70 text-sm font-medium flex items-center gap-3 shadow-lg border border-slate-500/20 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-2 bg-slate-500/20 rounded-lg relative"
                  >
                    <GiRibbonMedal className="w-5 h-5" />
                  </motion.div>
                  <div className="flex items-center gap-2 relative">
                    <span>Popular Author</span>
                    <span className="text-xs bg-slate-500/30 px-2 py-0.5 rounded">100 followers</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.8
                    }
                  }}
                  whileHover={{ 
                    opacity: 0.8,
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(148, 163, 184, 0.2)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-white/70 text-sm font-medium flex items-center gap-3 shadow-lg border border-slate-500/20 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-2 bg-slate-500/20 rounded-lg relative"
                  >
                    <BsPencilSquare className="w-5 h-5" />
                  </motion.div>
                  <div className="flex items-center gap-2 relative">
                    <span>Prolific Writer</span>
                    <span className="text-xs bg-slate-500/30 px-2 py-0.5 rounded">50 chapters</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.9
                    }
                  }}
                  whileHover={{ 
                    opacity: 0.8,
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(148, 163, 184, 0.2)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-white/70 text-sm font-medium flex items-center gap-3 shadow-lg border border-slate-500/20 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-2 bg-slate-500/20 rounded-lg relative"
                  >
                    <GiStarMedal className="w-5 h-5" />
                  </motion.div>
                  <div className="flex items-center gap-2 relative">
                    <span>Elite Author</span>
                    <span className="text-xs bg-slate-500/30 px-2 py-0.5 rounded">4.8+ rating</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 1.0
                    }
                  }}
                  whileHover={{ 
                    opacity: 0.8,
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(148, 163, 184, 0.2)",
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-white/70 text-sm font-medium flex items-center gap-3 shadow-lg border border-slate-500/20 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-2 bg-slate-500/20 rounded-lg relative"
                  >
                    <GiTrophyCup className="w-5 h-5" />
                  </motion.div>
                  <div className="flex items-center gap-2 relative">
                    <span>Legendary Author</span>
                    <span className="text-xs bg-slate-500/30 px-2 py-0.5 rounded">10K+ views</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <motion.div 
          className="grid grid-cols-12 gap-4"
          variants={containerVariants}
        >
          {/* Left Column */}
          <motion.div 
            className="col-span-3"
            variants={itemVariants}
          >
            <motion.div 
              className="bg-[#1A1614] backdrop-blur-md border border-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F1592A] rounded-lg">
                      <GiQuillInk className="w-5 h-5 text-white" />
                </div>
                    <h3 className="text-lg font-semibold text-white">Genre Distribution</h3>
              </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Total Works:</span>
                    <span className="text-sm font-semibold text-white">5</span>
                  </div>
                </div>
                <div className="h-[200px] relative">
                  {mounted && <Doughnut data={genreData} options={genreOptions} />}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">100%</p>
                      <p className="text-sm text-gray-400">Total</p>
                    </div>
                  </div>
                </div>
                
                {/* Genre Legend */}
                <div className="mt-6 grid grid-cols-1 gap-2">
                  {genreData.labels.map((label, index) => (
                    <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-[#2A1F1A] hover:bg-[#2A1F1A]/80 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: genreData.datasets[0].backgroundColor[index] }} />
                        <span className="text-sm text-gray-300">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{genreData.datasets[0].data[index]}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-[#1A1614] overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${genreData.datasets[0].data[index]}%`,
                              backgroundColor: genreData.datasets[0].backgroundColor[index]
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#2A1F1A]">
                    <div className="text-sm text-gray-400">Most Popular</div>
                    <div className="text-lg font-semibold text-white mt-1">Fantasy</div>
                    <div className="text-xs text-[#F1592A] mt-1">35% of works</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#2A1F1A]">
                    <div className="text-sm text-gray-400">Least Popular</div>
                    <div className="text-lg font-semibold text-white mt-1">Action</div>
                    <div className="text-xs text-[#F59E0B] mt-1">5% of works</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#2A1F1A]">
                    <div className="text-sm text-gray-400">Most Trending</div>
                    <div className="text-lg font-semibold text-white mt-1">Sci-Fi</div>
                    <div className="flex items-center text-xs text-[#4B6BFB] mt-1">
                      <BsArrowUpRight className="mr-1 h-3 w-3" />
                      <span>+12% this month</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#2A1F1A]">
                    <div className="text-sm text-gray-400">New Genre</div>
                    <div className="text-lg font-semibold text-white mt-1">Mystery</div>
                    <div className="flex items-center text-xs text-[#10B981] mt-1">
                      <BsStars className="mr-1 h-3 w-3" />
                      <span>Added recently</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Middle Column */}
          <motion.div 
            className="col-span-6"
            variants={itemVariants}
          >
            <motion.div 
              className="bg-[#1A1614] backdrop-blur-md border border-gray-800 shadow-lg rounded-xl p-6 h-full"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F1592A] rounded-lg">
                    <BsStars className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Weekly Activity</h3>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="bg-[#F1592A] hover:bg-[#E73E48] text-white text-xs px-3 py-1 h-7"
                  >
                    Monthly
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 h-7"
                  >
                    Weekly
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-60px)] relative">
                <div className="absolute top-0 right-0 flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#F1592A]" />
                    <span className="text-xs text-gray-400">Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-gray-400">Likes</span>
                  </div>
                </div>
                {mounted && <Line data={activityData} options={activityOptions} />}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column */}
          <motion.div 
            className="col-span-3"
            variants={itemVariants}
          >
            <motion.div 
              className="bg-gradient-to-r from-[#1A1614]/80 via-[#2A1F1A]/80 to-[#1A1614]/80 backdrop-blur-md border border-orange-900/20 shadow-lg rounded-xl p-6 h-full flex flex-col"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-[#F1592A] to-[#FF424D] rounded-lg">
                  <GiStarMedal className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Author Stats</h3>
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                {/* Views Stat */}
                <motion.div 
                  className="relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/10 to-transparent rounded-lg" />
                  <div className="relative flex items-center justify-between bg-[#1A1614]/40 rounded-lg px-4 py-3 border border-orange-900/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#F1592A]/20 rounded-lg">
                        <Eye className="w-5 h-5 text-[#F1592A]" />
                    </div>
                      <div>
                        <p className="text-sm text-gray-400">Total Views</p>
                        <p className="text-xl font-semibold text-white">0</p>
                  </div>
                  </div>
                    <div className="text-[#F1592A]/20">
                      <Eye className="w-12 h-12" />
                </div>
                  </div>
                </motion.div>

                {/* Chapters Stat */}
                <motion.div 
                  className="relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#4B6BFB]/10 to-transparent rounded-lg" />
                  <div className="relative flex items-center justify-between bg-[#1A1614]/40 rounded-lg px-4 py-3 border border-blue-900/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#4B6BFB]/20 rounded-lg">
                        <BookOpen className="w-5 h-5 text-[#4B6BFB]" />
                    </div>
                      <div>
                        <p className="text-sm text-gray-400">Total Chapters</p>
                        <p className="text-xl font-semibold text-white">0</p>
                  </div>
                  </div>
                    <div className="text-[#4B6BFB]/20">
                      <BookOpen className="w-12 h-12" />
                </div>
                  </div>
                </motion.div>

                {/* Rating Stat */}
                <motion.div 
                  className="relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFB800]/10 to-transparent rounded-lg" />
                  <div className="relative flex items-center justify-between bg-[#1A1614]/40 rounded-lg px-4 py-3 border border-yellow-900/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#FFB800]/20 rounded-lg">
                        <Star className="w-5 h-5 text-[#FFB800]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Average Rating</p>
                  <div className="flex items-center gap-2">
                          <p className="text-xl font-semibold text-white">0.0</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                              <Star
                          key={i}
                                className="w-4 h-4 text-gray-600"
                          fill="currentColor"
                              />
                      ))}
                    </div>
                  </div>
                </div>
                    </div>
                    <div className="text-[#FFB800]/20">
                      <Star className="w-12 h-12" />
                    </div>
                  </div>
                </motion.div>

                {/* Followers Stat */}
                <motion.div 
                  className="relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/10 to-transparent rounded-lg" />
                  <div className="relative flex items-center justify-between bg-[#1A1614]/40 rounded-lg px-4 py-3 border border-emerald-900/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#10B981]/20 rounded-lg">
                        <Heart className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Followers</p>
                        <p className="text-xl font-semibold text-white">0</p>
                      </div>
                    </div>
                    <div className="text-[#10B981]/20">
                      <Heart className="w-12 h-12" />
                    </div>
                  </div>
                </motion.div>

                {/* Author Level */}
                <motion.div 
                  className="relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F1592A]/10 to-transparent rounded-lg" />
                  <div className="relative bg-[#1A1614]/40 rounded-lg p-4 border border-orange-900/10">
                    <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                        <GiTrophyCup className="w-5 h-5 text-[#F1592A]" />
                        <p className="text-sm text-gray-400">Author Level</p>
                    </div>
                      <p className="text-sm font-semibold text-white">Level 1</p>
                  </div>
                    <div className="relative h-2 bg-[#1A1614] rounded-full overflow-hidden">
                      <motion.div
                        className="absolute h-full bg-gradient-to-r from-[#F1592A] to-[#FF424D] rounded-full"
                        style={{ width: '0%' }}
                        animate={{
                          width: ['0%', '2%', '0%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                  </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">0 / 100 followers needed for next level</p>
                  </div>
                </motion.div>

                {/* Recent Activity */}
                <motion.div 
                  className="relative overflow-hidden mt-2"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#4B6BFB]/10 to-transparent rounded-lg" />
                  <div className="relative bg-[#1A1614]/40 rounded-lg p-4 border border-blue-900/10">
                    <div className="flex items-center gap-2 mb-3">
                      <BsCalendarCheck className="w-5 h-5 text-[#4B6BFB]" />
                      <p className="text-sm text-gray-400">Recent Activity</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Last Chapter</span>
                        <span className="text-gray-300">Never</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Last Novel</span>
                        <span className="text-gray-300">Never</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Last Update</span>
                        <span className="text-gray-300">Never</span>
                      </div>
                </div>
              </div>
            </motion.div>

                {/* Engagement Stats */}
                <motion.div 
                  className="relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/10 to-transparent rounded-lg" />
                  <div className="relative bg-[#1A1614]/40 rounded-lg p-4 border border-emerald-900/10">
                    <div className="flex items-center gap-2 mb-3">
                      <BsStars className="w-5 h-5 text-[#10B981]" />
                      <p className="text-sm text-gray-400">Engagement Stats</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Comments</span>
                        <span className="text-gray-300">0</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Reviews</span>
                        <span className="text-gray-300">0</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Avg. Views/Chapter</span>
                        <span className="text-gray-300">0</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Novels Grid Section */}
        <motion.div 
          className="mt-8"
          variants={itemVariants}
        >
          <motion.div 
            className="bg-orange-50/30 dark:bg-[#2A1F1A]/60 backdrop-blur-md border border-orange-100/20 dark:border-orange-900/20 shadow-lg rounded-xl p-6"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <GiBookshelf className="w-6 h-6 text-[#F1592A]" />
              Published Novels
            </h3>
            
              <motion.div 
              className="grid grid-cols-1 gap-8"
                variants={containerVariants}
              >
              {/* Welcome Message */}
                  <motion.div
                    variants={cardVariants}
                className="text-center p-8 bg-gradient-to-r from-[#1A1614]/80 via-[#2A1F1A]/80 to-[#1A1614]/80 rounded-xl border border-orange-900/20 shadow-xl relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: [
                      "radial-gradient(circle at 50% 50%, #F1592A 0%, transparent 50%)",
                      "radial-gradient(circle at 50% 50%, #FF424D 0%, transparent 50%)",
                      "radial-gradient(circle at 50% 50%, #F1592A 0%, transparent 50%)"
                    ]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative z-10"
                >
                  <h3 className="text-3xl font-bold text-white mb-4">Begin Your Author Journey</h3>
                  <p className="text-gray-300 text-lg mb-6">Your stories are waiting to be told. Start crafting your literary masterpiece today!</p>
                  </motion.div>
              </motion.div>

              {/* Novel Placeholders */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: "Epic Fantasy Adventure",
                    description: "Create sweeping tales of magic, heroism, and destiny. Build intricate worlds filled with mythical creatures and epic quests.",
                    icon: <GiBookshelf className="w-12 h-12" />,
                    gradient: "from-purple-500/20 to-blue-500/20"
                  },
                  {
                    title: "Romance & Drama",
                    description: "Weave heart-touching stories of love, passion, and emotional journeys that resonate with readers' hearts.",
                    icon: <FaHeart className="w-12 h-12" />,
                    gradient: "from-red-500/20 to-pink-500/20"
                  },
                  {
                    title: "Mystery & Thriller",
                    description: "Craft suspenseful narratives filled with twists, turns, and edge-of-your-seat excitement.",
                    icon: <BsStars className="w-12 h-12" />,
                    gradient: "from-green-500/20 to-teal-500/20"
                  }
                ].map((genre, index) => (
                  <motion.div
                    key={index}
                    variants={cardVariants}
                    whileHover={{ scale: 1.02 }}
                    className={`bg-gradient-to-br ${genre.gradient} backdrop-blur-xl border border-white/10 rounded-xl p-6 relative overflow-hidden group`}
                  >
                          <motion.div
                      className="absolute inset-0 bg-black opacity-40 transition-opacity duration-300 group-hover:opacity-30"
                    />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="relative z-10"
                    >
                      <div className="text-[#F1592A] mb-4 transform transition-transform duration-300 group-hover:scale-110">
                        {genre.icon}
                        </div>
                      <h4 className="text-xl font-semibold text-white mb-3">{genre.title}</h4>
                      <p className="text-gray-300 text-sm">{genre.description}</p>
                    </motion.div>
                    <motion.div
                      className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white">
                        Start Writing
                      </Button>
                    </motion.div>
                  </motion.div>
                        ))}
                      </div>

              {/* Call to Action */}
              <motion.div
                variants={cardVariants}
                className="text-center mt-8"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="inline-block"
                >
                        <Button 
                    className="bg-gradient-to-r from-[#F1592A] to-[#FF424D] hover:from-[#E73E48] hover:to-[#FF424D] text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
                        >
                    <BsPencilSquare className="w-5 h-5 mr-2" />
                    Create Your First Novel
                        </Button>
                  </motion.div>
                <p className="text-gray-400 mt-4 text-sm">
                  Join thousands of authors who have shared their stories with the world
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white dark:bg-[#2A1F1A] rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-xl font-semibold mb-4">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="profilePicture">Profile Picture URL</Label>
                <Input
                  id="profilePicture"
                  value={editFormData.profilePicture}
                  onChange={(e) => setEditFormData({ ...editFormData, profilePicture: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button
                  onClick={() => setIsEditMode(false)}
                  variant="outline"
                  className="bg-gray-100 dark:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditProfile}
                  className="bg-[#F1592A] hover:bg-[#E73E48] text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/authcontext'
import { db, storage } from '@/lib/firebaseConfig'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast, Toaster } from 'react-hot-toast'
import { PlusIcon, Pencil, Trash, AlertTriangle, BookOpen, Home, User, Eye, Star, UserPlus, Clock, X, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'
import { Novel } from '@/models/Novel'
import { Autocomplete } from '@/components/ui/autocomplete'
import { genreColors } from '@/app/genreColors'
import { tags } from '../tags'
import { CalendarIcon } from "lucide-react"
import { motion } from "framer-motion"
import dynamic from 'next/dynamic'

// Dynamic import for Chart.js to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false })
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false })
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false })
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

// Define the style categories
const styleCategories = [
  "Light Novels",
  "Published Novels",
  "Web Novels/Webtoons",
  "Graphic Novels",
  "Novella/Short Story",
  "Serialized Novels",
  "Episodic Novels",
  "Epistolary Novels",
  "Anthology Novels",
  "Choose Your Own Adventure Novels",
  "Novels-in-Verse",
  "Art"
];

// Add these at the top of your file with other constants
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1899 }, (_, i) => String(currentYear - i));
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Function to get days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

// Add these stats-related components near the top of the file
const StatsCard = ({ title, value, icon: Icon, bgColor = "from-blue-500/20 to-blue-600/20", iconColor = "text-blue-500", change, timeframe }: { 
  title: string, 
  value: string | number, 
  icon: any, 
  bgColor?: string,
  iconColor?: string,
  change?: { value: number, direction: 'up' | 'down' },
  timeframe?: string
}) => (
  <motion.div 
    className={`rounded-lg border bg-gradient-to-br ${bgColor} border-[#444] shadow-lg p-6 h-full`}
    whileHover={{ scale: 1.02 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg bg-gradient-to-br ${bgColor.replace('/20', '')}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
    </div>
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
  </div>
    <p className="text-3xl font-bold text-white mb-2">{value}</p>
    {change && (
      <div className="flex items-center mt-1">
        <span className={`text-xs font-medium ${change.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {change.direction === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
        </span>
        {timeframe && <span className="text-xs text-gray-400 ml-1">vs {timeframe}</span>}
      </div>
    )}
  </motion.div>
);

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

interface AuthorRequest {
  id: string;
  userId: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  type: 'author_access';
}

export default function AdminDashboard() {
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentNovel, setCurrentNovel] = useState<Novel | null>({
    novelId: '',
    title: '',
    synopsis: '',
    coverPhoto: '',
    extraArt: [],
    brand: {
      name: '',
      logo: '',
    },
    seriesType: 'ORIGINAL',
    styleCategory: {
      primary: '',
      secondary: [],
    },
    language: {
      original: '',
      translated: [],
    },
    publishers: {
      original: '',
      english: '',
    },
    releaseFrequency: '',
    alternativeNames: '',
    chapterType: 'TEXT',
    totalChapters: 0,
    seriesStatus: 'ONGOING',
    availability: {
      type: 'FREE',
      price: 0,
    },
    seriesInfo: {
      volumeNumber: 0,
      seriesNumber: 0,
      releaseYear: new Date().getFullYear(),
      releaseMonth: new Date().getMonth() + 1,
      firstReleaseDate: Timestamp.now(),
    },
    credits: {
      authors: [],
      artists: {
        translators: [],
        editors: [],
        proofreaders: [],
        posters: [],
        rawProviders: [],
        artDirectors: [],
        drafters: [],
        lineArtists: [],
        colorArtists: [],
        compositors: [],
        typesetters: [],
        projectManagers: [],
      },
    },
    genres: [],
    tags: [],
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    likes: 0,
    views: 0,
    rating: 0,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { user } = useAuth()
  const [isAuthor, setIsAuthor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorsList, setAuthorsList] = useState<{ id: string; name: string; username: string; }[]>([]);
  const [authorsInput, setAuthorsInput] = useState<string[]>([]);
  const [authorRequests, setAuthorRequests] = useState<AuthorRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('week')
  
  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalRating: 0,
    novelsByStatus: {} as Record<string, number>,
    novelsByCategory: {} as Record<string, number>,
    genreDistribution: {} as Record<string, number>,
    novelsActivity: {
      labels: [] as string[],
      viewsData: [] as number[],
      likesData: [] as number[],
    },
    completionRate: 0,
  })

  // For the author requests section
  const [showAllRequests, setShowAllRequests] = useState(false);
  const visibleRequests = showAllRequests 
    ? authorRequests 
    : authorRequests.slice(0, 3);

  // Pagination state for novels table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(novels.length / itemsPerPage);
  
  const paginatedNovels = novels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    if (currentNovel) {
      setAuthorsInput(currentNovel.credits.authors || []);
    }
  }, [currentNovel]);

  // Define fetchNovels as a callback
  const fetchNovels = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      setLoading(true);
      let q;
      if (isAdmin) {
        q = query(
          collection(db, 'novels'), 
          orderBy('metadata.createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'novels'),
          where('uploader', '==', user.uid),
          orderBy('metadata.createdAt', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      const fetchedNovels = querySnapshot.docs.map(doc => ({
        novelId: doc.id,
        ...doc.data()
      } as Novel));
      setNovels(fetchedNovels);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (error) {
      console.error('Error fetching novels:', error);
      setError(`Failed to fetch novels: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to fetch novels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]); // Dependencies for the callback

  // Check user type
  useEffect(() => {
    const checkUserType = async () => {
      if (!user) {
        setIsAuthor(false);
        setIsAdmin(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsAuthor(userData.userType === 'author');
          setIsAdmin(userData.userType === 'admin');
        }
      } catch (error) {
        console.error('Error checking user type:', error);
        setIsAuthor(false);
        setIsAdmin(false);
      }
    };

    checkUserType();
  }, [user]);

  // Fetch authors when isAdmin changes
  useEffect(() => {
    const fetchAuthors = async () => {
      if (!isAdmin) return;
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userType', 'in', ['author', 'admin']));
        const querySnapshot = await getDocs(q);
        const authors = querySnapshot.docs.map(doc => {
          const userData = doc.data();
          return {
            id: doc.id,
            name: userData.username || userData.displayName || userData.email || 'Unknown Author',
            username: userData.username || 'Unknown'
          };
        });
        setAuthorsList(authors);
      } catch (error) {
        console.error('Error fetching authors:', error);
        toast.error('Failed to fetch authors list');
      }
    };

    fetchAuthors();
  }, [isAdmin]);

  // Fetch novels when dependencies change
  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  // Add this function to calculate stats
  const calculateStats = useCallback(() => {
    // Status distribution
    const novelsByStatus = novels.reduce((acc, novel) => {
      const status = novel.seriesStatus || 'Unknown';
      return { ...acc, [status]: (acc[status] || 0) + 1 };
    }, {} as Record<string, number>);

    // Category distribution
    const novelsByCategory = novels.reduce((acc, novel) => {
      const category = novel.styleCategory?.primary || 'Uncategorized';
      return { ...acc, [category]: (acc[category] || 0) + 1 };
    }, {} as Record<string, number>);

    // Genre distribution
    const genreDistribution = novels.reduce((acc, novel) => {
      novel.genres?.forEach(genre => {
        if (genre.name) {
          acc[genre.name] = (acc[genre.name] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    // Sort and limit genres to top 5
    const topGenres = Object.entries(genreDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .reduce((acc, [key, value]) => {
        return { ...acc, [key]: value };
      }, {} as Record<string, number>);

    // Create labels for the time period
    let labels: string[] = [];
    let viewsData: number[] = [];
    let likesData: number[] = [];

    // Generate random data for demo purposes
    // In a real app, you would use actual data from your database
    if (chartPeriod === 'week') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      viewsData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000));
      likesData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 200));
    } else if (chartPeriod === 'month') {
      labels = Array.from({ length: 30 }, (_, i) => (i + 1).toString());
      viewsData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 1000));
      likesData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 200));
    } else if (chartPeriod === 'year') {
      labels = months;
      viewsData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 5000));
      likesData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 1000));
    }

    // Calculate total stats
    const totalViews = novels.reduce((sum, novel) => sum + (novel.views || 0), 0);
    const totalLikes = novels.reduce((sum, novel) => sum + (novel.likes || 0), 0);
    
    // Calculate average rating
    const ratingSum = novels.reduce((sum, novel) => sum + (novel.rating || 0), 0);
    const totalRating = novels.length > 0 ? ratingSum / novels.length : 0;
    
    // Calculate completion rate
    const completedNovels = novels.filter(novel => novel.seriesStatus === 'COMPLETED').length;
    const completionRate = novels.length > 0 ? (completedNovels / novels.length) * 100 : 0;

    setDashboardStats({
      totalViews,
      totalLikes,
      totalRating,
      novelsByStatus,
      novelsByCategory,
      genreDistribution: topGenres,
      novelsActivity: {
        labels,
        viewsData,
        likesData,
      },
      completionRate,
    });
  }, [novels, chartPeriod]);

  // Add this effect to update stats when novels change
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleAddAuthor = () => {
    setAuthorsInput([...authorsInput, '']);
  };

  const handleAuthorChange = (index: number, value: string) => {
    const updatedAuthors = [...authorsInput];
    updatedAuthors[index] = value;
    setAuthorsInput(updatedAuthors);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !currentNovel || isSaving) return;

    try {
      setIsSaving(true);
      const novelData: Omit<Novel, 'novelId'> = {
        title: currentNovel.title.trim(),
        synopsis: currentNovel.synopsis.trim(),
        coverPhoto: currentNovel.coverPhoto.trim(),
        extraArt: currentNovel.extraArt?.map(art => art.trim()) || [],
        brand: {
          name: (currentNovel.brand?.name || '').trim(),
          logo: (currentNovel.brand?.logo || '').trim(),
        },
        seriesType: currentNovel.seriesType || 'ORIGINAL',
        styleCategory: {
          primary: currentNovel.styleCategory?.primary || '',
          secondary: currentNovel.styleCategory?.secondary || [],
        },
        language: {
          original: currentNovel.language?.original || '',
          translated: currentNovel.language?.translated || [],
        },
        publishers: {
          original: currentNovel.publishers?.original || '',
          english: currentNovel.publishers?.english || '',
        },
        releaseFrequency: currentNovel.releaseFrequency || '',
        alternativeNames: currentNovel.alternativeNames.trim(),
        chapterType: currentNovel.chapterType || 'TEXT',
        totalChapters: currentNovel.totalChapters || 0,
        seriesStatus: currentNovel.seriesStatus || 'ONGOING',
        availability: {
          type: currentNovel.availability?.type || 'FREE',
          price: currentNovel.availability?.price || 0,
        },
        seriesInfo: {
          volumeNumber: currentNovel.seriesInfo?.volumeNumber || 0,
          seriesNumber: currentNovel.seriesInfo?.seriesNumber || 0,
          releaseYear: currentNovel.seriesInfo?.releaseYear || new Date().getFullYear(),
          releaseMonth: currentNovel.seriesInfo?.releaseMonth || new Date().getMonth() + 1,
          firstReleaseDate: currentNovel.seriesInfo?.firstReleaseDate || Timestamp.now(),
        },
        credits: {
          authors: authorsInput.filter(Boolean),
          artists: {
            translators: currentNovel.credits?.artists?.translators || [],
            editors: currentNovel.credits?.artists?.editors || [],
            proofreaders: currentNovel.credits?.artists?.proofreaders || [],
            posters: currentNovel.credits?.artists?.posters || [],
            rawProviders: currentNovel.credits?.artists?.rawProviders || [],
            artDirectors: currentNovel.credits?.artists?.artDirectors || [],
            drafters: currentNovel.credits?.artists?.drafters || [],
            lineArtists: currentNovel.credits?.artists?.lineArtists || [],
            colorArtists: currentNovel.credits?.artists?.colorArtists || [],
            compositors: currentNovel.credits?.artists?.compositors || [],
            typesetters: currentNovel.credits?.artists?.typesetters || [],
            projectManagers: currentNovel.credits?.artists?.projectManagers || [],
          },
        },
        genres: currentNovel.genres || [],
        tags: currentNovel.tags || [],
        metadata: {
          createdAt: currentNovel.metadata?.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        likes: currentNovel.likes || 0,
        views: currentNovel.views || 0,
        uploader: isAdmin ? currentNovel.uploader || user.uid : user.uid,
        rating: currentNovel.rating || 0,
      };

      if (currentNovel.novelId) {
        await updateDoc(doc(db, 'novels', currentNovel.novelId), novelData as any);
        toast.success('Novel updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'novels'), novelData as any);
        await updateDoc(docRef, { id: docRef.id });
        toast.success('Novel added successfully');
      }
      setIsDialogOpen(false);
      await fetchNovels(); // Refresh the novels list after submit
    } catch (error) {
      console.error('Error saving novel:', error);
      toast.error(`Failed to save novel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this novel?')) {
      try {
        await deleteDoc(doc(db, 'novels', id))
        toast.success('Novel deleted successfully')
        fetchNovels()
      } catch (error) {
        console.error('Error deleting novel:', error)
        toast.error(`Failed to delete novel: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setCurrentNovel(prev => {
      if (!prev) return prev;

      // Handle extraArt field specifically
      if (name === 'extraArt') {
        return { 
          ...prev, 
          extraArt: value.split(',')
            .map(url => url.trim())
            .filter(Boolean) 
        };
      }

      // For text inputs that should allow spaces, don't trim
      if (name === 'title' || name === 'synopsis' || name === 'alternativeNames') {
        return { ...prev, [name]: value };
      }

      // For other fields, trim the value
      return { ...prev, [name]: value.trim() };
    });
  };

  const handleSelectChange = <T extends string>(name: string, value: T) => {
    setCurrentNovel(prev => {
      if (!prev) return prev;
      if (name === 'availability.type') {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            type: value as 'FREE' | 'FREEMIUM' | 'PAID',
          },
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !currentNovel) return;

    try {
      const storageRef = ref(storage, `coverphoto/${user.uid}/${currentNovel.title}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setCurrentNovel(prev => ({ ...prev!, coverPhoto: downloadURL }));
      toast.success('Cover photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast.error(`Failed to upload cover photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getPageTitle = () => {
    if (isAdmin) {
      return "Novellize Admin Dashboard";
    }
    return "Author Dashboard";
  };

  // Add this new useEffect for fetching author requests
  useEffect(() => {
    const fetchAuthorRequests = async () => {
      if (!isAdmin) return;
      try {
        setLoadingRequests(true);
        const requestsRef = collection(db, 'requests');
        const q = query(
          requestsRef,
          where('type', '==', 'author_access'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AuthorRequest));
        setAuthorRequests(requests);
      } catch (error) {
        console.error('Error fetching author requests:', error);
        toast.error('Failed to fetch author requests');
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchAuthorRequests();
  }, [isAdmin]);

  const handleAuthorRequest = async (requestId: string, userId: string, status: 'approved' | 'rejected') => {
    try {
      // Update request status
      await updateDoc(doc(db, 'requests', requestId), {
        status,
        updatedAt: new Date()
      });

      if (status === 'approved') {
        // Update user type to author
        await updateDoc(doc(db, 'users', userId), {
          userType: 'author'
        });
        toast.success('Author request approved successfully');
      } else {
        toast.success('Author request rejected');
      }

      // Refresh the requests list
      const updatedRequests = authorRequests.map(request => 
        request.id === requestId ? { ...request, status } : request
      );
      setAuthorRequests(updatedRequests);
    } catch (error) {
      console.error('Error handling author request:', error);
      toast.error('Failed to process author request');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A] p-4">
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            You must be logged in to access this page. Please log in and try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Define chart data and options
  const activityChartData = {
    labels: dashboardStats.novelsActivity.labels,
    datasets: [
      {
        label: 'Views',
        data: dashboardStats.novelsActivity.viewsData,
        borderColor: '#F1592A',
        backgroundColor: 'rgba(241, 89, 42, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#F1592A',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Likes',
        data: dashboardStats.novelsActivity.likesData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const activityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#d1d5db',
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#ffffff',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  // Status distribution chart data
  const statusChartData = {
    labels: Object.keys(dashboardStats.novelsByStatus),
    datasets: [
      {
        data: Object.values(dashboardStats.novelsByStatus),
        backgroundColor: [
          '#F1592A', // Orange - Ongoing
          '#10B981', // Green - Completed
          '#3B82F6', // Blue - On Hold
          '#F59E0B', // Amber - Cancelled
          '#8B5CF6', // Purple - Upcoming
          '#EC4899', // Pink - Under Editing
        ],
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#d1d5db',
          boxWidth: 15,
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#ffffff',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value * 100) / total);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
    cutout: '70%',
  };

  // Category distribution chart data
  const categoryChartData = {
    labels: Object.keys(dashboardStats.novelsByCategory).slice(0, 6),
    datasets: [
      {
        data: Object.values(dashboardStats.novelsByCategory).slice(0, 6),
        backgroundColor: [
          'rgba(241, 89, 42, 0.8)',  // Orange
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(16, 185, 129, 0.8)',  // Green
          'rgba(245, 158, 11, 0.8)',  // Amber
          'rgba(139, 92, 246, 0.8)',  // Purple
          'rgba(236, 72, 153, 0.8)',  // Pink
        ],
        borderWidth: 0,
      },
    ],
  };

  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#d1d5db',
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
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A]">
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
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-all duration-300 hover:scale-105">
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
                {getPageTitle()}
              </motion.h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <>
                  <Link href="/admin/featured-novels" passHref>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300">
                        <Star className="mr-2 h-4 w-4" /> Featured Novels
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/admin/top-releases" passHref>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300">
                        <BookOpen className="mr-2 h-4 w-4" /> Top Releases
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/admin/weekly-featured" passHref>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300">
                        <Star className="mr-2 h-4 w-4" /> Weekly Featured
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/admin/ranking-novels" passHref>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300">
                        <TrendingUp className="mr-2 h-4 w-4" /> Ranking Novels
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/admin/users" passHref>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline" className="bg-gradient-to-r from-[#2A2827] to-[#333] border-[#444] text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300">
                        <User className="mr-2 h-4 w-4" /> Manage Users
                      </Button>
                    </motion.div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Author Requests Section for Admins */}
        {isAdmin && (
          <motion.div 
            className="mb-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <UserPlus className="h-6 w-6 text-[#F1592A]" />
                Author Access Requests
                <div className="flex items-center gap-1 ml-2">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10, delay: 0.3 }}
                    className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {authorRequests.filter(r => r.status === 'approved').length} Approved
                  </motion.span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10, delay: 0.4 }}
                    className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  >
                    {authorRequests.filter(r => r.status === 'rejected').length} Rejected
                  </motion.span>
                </div>
              </h2>
              <span className="px-3 py-1 bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] text-white rounded-full text-sm animate-pulse shadow-lg">
                {authorRequests.filter(r => r.status === 'pending').length} Pending
              </span>
            </div>

            {/* Stats for Requests */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <StatsCard 
                  title="Total Requests" 
                  value={authorRequests.length} 
                  icon={UserPlus} 
                  bgColor="from-[#F1592A]/20 to-[#FF7B4D]/20" 
                  iconColor="text-white"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatsCard 
                  title="Pending" 
                  value={authorRequests.filter(r => r.status === 'pending').length} 
                  icon={Clock} 
                  bgColor="from-yellow-500/20 to-yellow-600/20" 
                  iconColor="text-white"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatsCard 
                  title="Approved" 
                  value={authorRequests.filter(r => r.status === 'approved').length} 
                  icon={User} 
                  bgColor="from-green-500/20 to-green-600/20" 
                  iconColor="text-white"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatsCard 
                  title="Rejected" 
                  value={authorRequests.filter(r => r.status === 'rejected').length} 
                  icon={X} 
                  bgColor="from-red-500/20 to-red-600/20" 
                  iconColor="text-white"
                />
              </motion.div>
            </motion.div>

            {loadingRequests ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F1592A]"></div>
              </div>
            ) : authorRequests.length > 0 ? (
              <motion.div 
                className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg shadow-lg border border-[#333] overflow-hidden"
                variants={itemVariants}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-[#232120] via-[#2A2827] to-[#333]">
                      <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-[#F1592A]" />
                          <span>Email</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-yellow-400" />
                          <span>Status</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-blue-400" />
                          <span>Requested At</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                        <div className="flex items-center gap-1 justify-center">
                          <Pencil className="h-3.5 w-3.5 text-green-400" />
                          <span>Actions</span>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRequests ? (
                      Array(3).fill(0).map((_, index) => (
                        <TableRow key={`loading-${index}`} className="animate-pulse">
                          <TableCell><div className="h-5 bg-gray-600/20 rounded w-40"></div></TableCell>
                          <TableCell><div className="h-5 bg-gray-600/20 rounded w-20"></div></TableCell>
                          <TableCell><div className="h-5 bg-gray-600/20 rounded w-36"></div></TableCell>
                          <TableCell><div className="h-8 bg-gray-600/20 rounded w-32"></div></TableCell>
                        </TableRow>
                      ))
                    ) : visibleRequests.map((request) => (
                      <motion.tr 
                        key={request.id} 
                        className={`hover:bg-[#2A2827] transition-colors group ${request.status === 'pending' ? 'bg-gradient-to-r from-[#232120]/20 to-[#2A2827]/20' : request.status === 'approved' ? 'bg-gradient-to-r from-[#2A2827]/40 to-[#232120]/40' : 'bg-gradient-to-r from-[#2A2827]/40 to-[#232120]/40'}`}
                        variants={itemVariants}
                        custom={request.id}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: request.id.charCodeAt(0) * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(50, 50, 50, 0.3)' }}
                      >
                        <TableCell className="text-white group-hover:text-[#F1592A] transition-colors">{request.email}</TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(request.createdAt.toDate()).toLocaleDateString()} at {new Date(request.createdAt.toDate()).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAuthorRequest(request.id, request.userId, 'approved')}
                                className="px-3 py-1 rounded text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all duration-300 shadow-md"
                              >
                                Approve
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAuthorRequest(request.id, request.userId, 'rejected')}
                                className="px-3 py-1 rounded text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-md"
                              >
                                Reject
                              </motion.button>
                            </div>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
                
                {authorRequests.length > 3 && (
                  <div className="p-4 flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAllRequests(!showAllRequests)}
                      className="px-4 py-2 bg-gradient-to-r from-[#2A2827] to-[#333] border border-[#444] rounded-md text-white hover:from-[#3A3837] hover:to-[#444] transition-all duration-300 flex items-center gap-2 shadow-md"
                    >
                      {showAllRequests ? (
                        <>
                          <span>Show Less</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        </>
                      ) : (
                        <>
                          <span>Show More ({authorRequests.length - 3} more)</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </>
                      )}
                    </motion.button>
              </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                className="text-center py-12 bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg border border-dashed border-[#333]"
                variants={itemVariants}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg font-medium">No author access requests found</p>
                  <p className="text-gray-400 text-sm mt-1 max-w-md">
                    When users request author access, their applications will appear here for your review.
                  </p>
                  <div className="mt-6 p-3 bg-[#1A1614]/50 rounded-lg border border-[#333] max-w-md">
                    <p className="text-gray-300 text-sm">
                      <span className="text-[#F1592A] font-medium">Tip:</span> Authors can publish novels, manage their content, and engage with readers.
                    </p>
              </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Dashboard Header with Period Selector */}
        <motion.div 
          className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h2 
            className="text-2xl font-bold text-white flex items-center gap-2"
            variants={itemVariants}
          >
            <BookOpen className="h-6 w-6 text-[#F1592A]" />
            Dashboard Overview
          </motion.h2>
          
          <motion.div 
            className="flex items-center gap-2 bg-[#2A2827] p-1 rounded-lg"
            variants={itemVariants}
          >
            <Button 
              size="sm" 
              variant={chartPeriod === 'week' ? 'default' : 'outline'} 
              onClick={() => setChartPeriod('week')}
              className={chartPeriod === 'week' ? 'bg-[#F1592A] text-white' : 'bg-transparent text-gray-300'}
            >
              Week
            </Button>
            <Button 
              size="sm" 
              variant={chartPeriod === 'month' ? 'default' : 'outline'} 
              onClick={() => setChartPeriod('month')}
              className={chartPeriod === 'month' ? 'bg-[#F1592A] text-white' : 'bg-transparent text-gray-300'}
            >
              Month
            </Button>
            <Button 
              size="sm" 
              variant={chartPeriod === 'year' ? 'default' : 'outline'} 
              onClick={() => setChartPeriod('year')}
              className={chartPeriod === 'year' ? 'bg-[#F1592A] text-white' : 'bg-transparent text-gray-300'}
            >
              Year
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <StatsCard 
              title="Total Novels" 
              value={novels.length} 
              icon={BookOpen} 
              bgColor="from-[#F1592A]/20 to-[#FF7B4D]/20" 
              iconColor="text-white"
              change={{ value: 12, direction: 'up' }}
              timeframe="last month"
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <StatsCard 
              title="Total Views" 
              value={dashboardStats.totalViews.toLocaleString()} 
              icon={Eye} 
              bgColor="from-blue-500/20 to-blue-600/20" 
              iconColor="text-white"
              change={{ value: 8, direction: 'up' }}
              timeframe="last month"
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <StatsCard 
              title="Total Likes" 
              value={dashboardStats.totalLikes.toLocaleString()} 
              icon={Star} 
              bgColor="from-yellow-500/20 to-yellow-600/20" 
              iconColor="text-white"
              change={{ value: 5, direction: 'up' }}
              timeframe="last month"
            />
          </motion.div>
        </motion.div>

        {/* Charts Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Activity Chart */}
          <motion.div 
            className="lg:col-span-2 bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg border border-[#333] p-5 shadow-lg"
            variants={itemVariants}
          >
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Novel Activity</h3>
              <span className="text-sm text-gray-400">
                {chartPeriod === 'week' ? 'Last 7 days' : 
                 chartPeriod === 'month' ? 'Last 30 days' : 'Last 12 months'}
              </span>
            </div>
            <div className="h-80">
              <Line data={activityChartData} options={activityChartOptions} />
          </div>
          </motion.div>

          {/* Status Distribution Pie Chart */}
          <motion.div 
            className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg border border-[#333] p-5 shadow-lg"
            variants={itemVariants}
          >
            <h3 className="text-lg font-medium text-white mb-4">Status Distribution</h3>
            <div className="h-80">
              <Doughnut data={statusChartData} options={statusChartOptions} />
        </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(dashboardStats.novelsByStatus).map(([status, count], index) => (
                <div key={status} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: statusChartData.datasets[0].backgroundColor[index % statusChartData.datasets[0].backgroundColor.length] }}
                  />
                  <span className="text-xs text-gray-300 truncate">{status}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Secondary Charts & Category Distribution */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Category Distribution */}
          <motion.div 
            className="lg:col-span-2 bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg border border-[#333] p-5 shadow-lg"
            variants={itemVariants}
          >
            <h3 className="text-lg font-medium text-white mb-4">Style Categories</h3>
            <div className="h-80">
              <Bar data={categoryChartData} options={categoryChartOptions} />
                </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div 
            className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg border border-[#333] p-5 shadow-lg"
            variants={itemVariants}
          >
            <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {novels
                .sort((a, b) => b.metadata.updatedAt.toMillis() - a.metadata.updatedAt.toMillis())
                .slice(0, 4)
                .map(novel => (
                  <motion.div 
                    key={novel.novelId} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2A2827]/50 transition-colors"
                    whileHover={{ x: 4 }}
                  >
                    <div className="relative w-10 h-14 flex-shrink-0 overflow-hidden rounded">
                      <Image
                        src={novel.coverPhoto || '/placeholder-cover.jpg'}
                        alt={novel.title}
                        fill
                        className="object-cover"
                      />
                  </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{novel.title}</p>
                      <p className="text-xs text-gray-400">
                        Updated {new Date(novel.metadata.updatedAt.toMillis()).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        </motion.div>

        {error && (
          <Alert variant="destructive" className="mb-4 animate-fade-in bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <motion.div 
          className="flex justify-between items-center mb-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h2 
            className="text-2xl font-bold text-white"
            variants={itemVariants}
          >
            Novels Management
          </motion.h2>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <motion.div variants={itemVariants}>
              <Button 
                onClick={() => setCurrentNovel({ 
                  ...currentNovel,
                  uploader: user.uid,
                  metadata: {
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                  }
                } as Novel)}
                disabled={!isAuthor && !isAdmin}
                className="bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] hover:from-[#E14A1B] hover:to-[#FF6B3D] text-white transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <PlusIcon className="mr-2 h-4 w-4" /> Add New Novel
              </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{currentNovel?.novelId ? 'Edit Novel' : 'Add New Novel'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" value={currentNovel?.title || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="synopsis">Synopsis</Label>
                  <Textarea id="synopsis" name="synopsis" value={currentNovel?.synopsis || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="coverPhoto">Cover Photo</Label>
                  <Input type="file" id="coverPhoto" name="coverPhoto" accept="image/*" onChange={handleFileChange} />
                </div>
                <div>
                  <Label htmlFor="extraArt">Extra Art URLs (comma-separated)</Label>
                  <Input id="extraArt" name="extraArt" value={currentNovel?.extraArt?.join(', ') || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="brandName">Brand/Company/Group</Label>
                  <Input
                    id="brandName"
                    name="brand.name"
                    value={currentNovel?.brand?.name || ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setCurrentNovel(prev => ({
                        ...prev!,
                        brand: {
                          ...prev!.brand,
                          name: value
                        }
                      }));
                    }}
                    placeholder="Enter brand name"
                  />
                </div>
                <div>
                  <Label htmlFor="seriesType">Series Type</Label>
                  <Select name="seriesType" value={currentNovel?.seriesType || 'ORIGINAL'} onValueChange={(value) => handleSelectChange('seriesType', value as 'ORIGINAL' | 'TRANSLATED' | 'FAN_FIC')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a series type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORIGINAL">Original</SelectItem>
                      <SelectItem value="TRANSLATED">Translated</SelectItem>
                      <SelectItem value="FAN_FIC">Fan Fiction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="styleCategory">Style Category</Label>
                  <Autocomplete
                    suggestions={styleCategories} // Use the style categories array
                    selectedItems={currentNovel?.styleCategory?.primary ? [currentNovel.styleCategory.primary] : []}
                    onSelect={(items) => {
                      setCurrentNovel(prev => ({
                        ...prev!,
                        styleCategory: {
                          ...prev!.styleCategory,
                          primary: items[0] || '' // Set the first selected item as the primary style category
                        }
                      }))
                    }}
                    placeholder="Select a style category..."
                  />
                  
                </div>
                <div>
                  <Label htmlFor="originalLanguage">Original Language</Label>
                  <Input
                    id="originalLanguage"
                    name="language.original"
                    value={currentNovel?.language?.original || ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setCurrentNovel(prev => ({
                        ...prev!,
                        language: {
                          ...prev!.language,
                          original: value
                        }
                      }));
                    }}
                    placeholder="Enter original language"
                  />
                </div>
                <div>
                  <Label htmlFor="publishersOriginal">Original Publisher</Label>
                  <Input
                    id="publishersOriginal"
                    name="publishers.original"
                    value={currentNovel?.publishers?.original || ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setCurrentNovel(prev => ({
                        ...prev!,
                        publishers: {
                          ...prev!.publishers,
                          original: value
                        }
                      }));
                    }}
                    placeholder="Enter original publisher"
                  />
                </div>
                <div>
                  <Label htmlFor="publishersEnglish">English Publisher</Label>
                  <Input
                    id="publishersEnglish"
                    name="publishers.english"
                    value={currentNovel?.publishers?.english || ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setCurrentNovel(prev => ({
                        ...prev!,
                        publishers: {
                          ...prev!.publishers,
                          english: value
                        }
                      }));
                    }}
                    placeholder="Enter English publisher"
                  />
                </div>
                <div>
                  <Label htmlFor="translatedLanguages">Translated Languages (comma-separated)</Label>
                  <Input
                    id="translatedLanguages"
                    name="language.translated"
                    value={currentNovel?.language?.translated?.join(', ') || ''}
                    onChange={(e) => {
                      const languages = e.target.value.split(',').map(lang => lang.trim()).filter(Boolean);
                      setCurrentNovel(prev => ({
                        ...prev!,
                        language: {
                          ...prev!.language,
                          translated: languages
                        }
                      }));
                    }}
                    placeholder="Enter translated languages, separated by commas"
                  />
                </div>
                <div>
                  <Label htmlFor="releaseFrequency">Release Frequency per Week</Label>
                  <Input id="releaseFrequency" name="releaseFrequency" type="number" min="0" value={currentNovel?.releaseFrequency || 0} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="alternativeNames">Alternative Names</Label>
                  <Input
                    id="alternativeNames"
                    name="alternativeNames"
                    value={currentNovel?.alternativeNames || ''}
                    onChange={handleInputChange}
                    placeholder="Enter alternative names separated by commas"
                  />
                </div>
                <div>
                  <Label htmlFor="chapterType">Chapter Type</Label>
                  <Select name="chapterType" value={currentNovel?.chapterType || 'TEXT'} onValueChange={(value) => handleSelectChange('chapterType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a chapter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="MANGA">Manga</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="totalChapters">Total Chapters</Label>
                  <Input id="totalChapters" name="totalChapters" type="number" min="0" value={currentNovel?.totalChapters || 0} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="seriesStatus">Series Status</Label>
                  <Select name="seriesStatus" value={currentNovel?.seriesStatus || 'ONGOING'} onValueChange={(value) => handleSelectChange('seriesStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a series status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ON HOLD">On Hold</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="UNDER EDITING">Under Editing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="availabilityType">Availability Criteria</Label>
                  <Select name="availability.type" value={currentNovel?.availability?.type || 'FREE'} onValueChange={(value) => handleSelectChange('availability.type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select availability type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free</SelectItem>
                      <SelectItem value="FREEMIUM">Freemium</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="seriesNumber">Series/Volume Number</Label>
                  <Input
                    id="seriesNumber"
                    name="seriesInfo.seriesNumber"
                    type="number"
                    min="0"
                    value={currentNovel?.seriesInfo?.seriesNumber || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setCurrentNovel(prev => ({
                        ...prev!,
                        seriesInfo: {
                          ...prev!.seriesInfo,
                          seriesNumber: value
                        }
                      }));
                    }}
                    placeholder="Enter series/volume number"
                  />
                </div>
                <div className="space-y-4">
                  <Label>Series Release Year and Month</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="releaseYear" className="text-sm">Year</Label>
                      <Select
                        value={String(currentNovel?.seriesInfo?.releaseYear || currentYear)}
                        onValueChange={(value) => {
                          const year = parseInt(value);
                          setCurrentNovel(prev => ({
                            ...prev!,
                            seriesInfo: {
                              ...prev!.seriesInfo,
                              releaseYear: year,
                              firstReleaseDate: Timestamp.fromDate(new Date(
                                year,
                                (prev?.seriesInfo?.releaseMonth || 1) - 1
                              ))
                            }
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="releaseMonth" className="text-sm">Month</Label>
                      <Select
                        value={currentNovel?.seriesInfo?.releaseMonth 
                          ? String(currentNovel.seriesInfo.releaseMonth) 
                          : String(new Date().getMonth() + 1)}
                        onValueChange={(value) => {
                          const monthIndex = parseInt(value);
                          setCurrentNovel(prev => ({
                            ...prev!,
                            seriesInfo: {
                              ...prev!.seriesInfo,
                              releaseMonth: monthIndex,
                              firstReleaseDate: Timestamp.fromDate(new Date(
                                prev?.seriesInfo?.releaseYear || currentYear,
                                monthIndex - 1
                              ))
                            }
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, index) => (
                            <SelectItem key={month} value={String(index + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Selected: {currentNovel?.seriesInfo?.releaseMonth && currentNovel?.seriesInfo?.releaseYear ? 
                      `${months[currentNovel.seriesInfo.releaseMonth - 1]} ${currentNovel.seriesInfo.releaseYear}` : 
                      'No date selected'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>First Release Date</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="firstReleaseYear" className="text-sm">Year</Label>
                      <Select
                        value={String(currentNovel?.seriesInfo?.firstReleaseDate?.toDate().getFullYear() || currentYear)}
                        onValueChange={(value) => {
                          const year = parseInt(value);
                          const currentDate = currentNovel?.seriesInfo?.firstReleaseDate?.toDate() || new Date();
                          const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
                          
                          setCurrentNovel(prev => ({
                            ...prev!,
                            seriesInfo: {
                              ...prev!.seriesInfo,
                              firstReleaseDate: Timestamp.fromDate(newDate)
                            }
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="firstReleaseMonth" className="text-sm">Month</Label>
                      <Select
                        value={String((currentNovel?.seriesInfo?.firstReleaseDate?.toDate().getMonth() || 0) + 1)}
                        onValueChange={(value) => {
                          const monthIndex = parseInt(value) - 1;
                          const currentDate = currentNovel?.seriesInfo?.firstReleaseDate?.toDate() || new Date();
                          const newDate = new Date(currentDate.getFullYear(), monthIndex, currentDate.getDate());
                          
                          setCurrentNovel(prev => ({
                            ...prev!,
                            seriesInfo: {
                              ...prev!.seriesInfo,
                              firstReleaseDate: Timestamp.fromDate(newDate)
                            }
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, index) => (
                            <SelectItem key={month} value={String(index + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="firstReleaseDay" className="text-sm">Day</Label>
                      <Select
                        value={String(currentNovel?.seriesInfo?.firstReleaseDate?.toDate().getDate() || 1)}
                        onValueChange={(value) => {
                          const day = parseInt(value);
                          const currentDate = currentNovel?.seriesInfo?.firstReleaseDate?.toDate() || new Date();
                          const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                          
                          setCurrentNovel(prev => ({
                            ...prev!,
                            seriesInfo: {
                              ...prev!.seriesInfo,
                              firstReleaseDate: Timestamp.fromDate(newDate)
                            }
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: getDaysInMonth(
                              currentNovel?.seriesInfo?.firstReleaseDate?.toDate().getFullYear() || currentYear,
                              (currentNovel?.seriesInfo?.firstReleaseDate?.toDate().getMonth() || 0) + 1
                            ) },
                            (_, i) => String(i + 1)
                          ).map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Selected: {currentNovel?.seriesInfo?.firstReleaseDate ? 
                      currentNovel.seriesInfo.firstReleaseDate.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 
                      'No date selected'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="genres">Genres</Label>
                  <Autocomplete
                    suggestions={Object.keys(genreColors)}
                    selectedItems={currentNovel?.genres?.map(g => g.name) || []}
                    onSelect={(items) => {
                      setCurrentNovel(prev => ({
                        ...prev!,
                        genres: items.map(name => ({ name }))
                      }))
                    }}
                    placeholder="Select genres..."
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Autocomplete
                    suggestions={tags} // You can replace this with a separate tags array if needed
                    selectedItems={currentNovel?.tags || []}
                    onSelect={(items) => {
                      setCurrentNovel(prev => ({
                        ...prev!,
                        tags: items
                      }))
                    }}
                    placeholder="Select tags..."
                  />
                </div>
                {isAdmin && (
                  <div>
                    <Label htmlFor="uploader">Uploader</Label>
                    <Select
                      value={currentNovel?.uploader || user?.uid}
                      onValueChange={(value) => handleSelectChange('uploader', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an uploader" />
                      </SelectTrigger>
                      <SelectContent>
                        {authorsList.map((author) => (
                          <SelectItem key={author.id} value={author.id}>
                            {author.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Series Artists</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Translators */}
                      <div>
                        <Label htmlFor="translators">Translators</Label>
                        <Input
                          id="translators"
                          name="credits.artists.translators"
                          value={currentNovel?.credits?.artists?.translators?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  translators: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter translators (comma-separated)"
                        />
                      </div>

                      {/* Editors */}
                      <div>
                        <Label htmlFor="editors">Editors</Label>
                        <Input
                          id="editors"
                          name="credits.artists.editors"
                          value={currentNovel?.credits?.artists?.editors?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  editors: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter editors (comma-separated)"
                        />
                      </div>

                      {/* Proofreaders */}
                      <div>
                        <Label htmlFor="proofreaders">Proofreaders</Label>
                        <Input
                          id="proofreaders"
                          name="credits.artists.proofreaders"
                          value={currentNovel?.credits?.artists?.proofreaders?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  proofreaders: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter proofreaders (comma-separated)"
                        />
                      </div>

                      {/* Posters */}
                      <div>
                        <Label htmlFor="posters">Posters</Label>
                        <Input
                          id="posters"
                          name="credits.artists.posters"
                          value={currentNovel?.credits?.artists?.posters?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  posters: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter posters (comma-separated)"
                        />
                      </div>

                      {/* Raw Providers */}
                      <div>
                        <Label htmlFor="rawProviders">Raw Providers</Label>
                        <Input
                          id="rawProviders"
                          name="credits.artists.rawProviders"
                          value={currentNovel?.credits?.artists?.rawProviders?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  rawProviders: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter raw providers (comma-separated)"
                        />
                      </div>

                      {/* Art Directors */}
                      <div>
                        <Label htmlFor="artDirectors">Art Directors</Label>
                        <Input
                          id="artDirectors"
                          name="credits.artists.artDirectors"
                          value={currentNovel?.credits?.artists?.artDirectors?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  artDirectors: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter art directors (comma-separated)"
                        />
                      </div>

                      {/* Drafters */}
                      <div>
                        <Label htmlFor="drafters">Drafters</Label>
                        <Input
                          id="drafters"
                          name="credits.artists.drafters"
                          value={currentNovel?.credits?.artists?.drafters?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  drafters: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter drafters (comma-separated)"
                        />
                      </div>

                      {/* Line Artists */}
                      <div>
                        <Label htmlFor="lineArtists">Line Artists</Label>
                        <Input
                          id="lineArtists"
                          name="credits.artists.lineArtists"
                          value={currentNovel?.credits?.artists?.lineArtists?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  lineArtists: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter line artists (comma-separated)"
                        />
                      </div>

                      {/* Color Artists */}
                      <div>
                        <Label htmlFor="colorArtists">Color Artists</Label>
                        <Input
                          id="colorArtists"
                          name="credits.artists.colorArtists"
                          value={currentNovel?.credits?.artists?.colorArtists?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  colorArtists: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter color artists (comma-separated)"
                        />
                      </div>

                      {/* Compositors */}
                      <div>
                        <Label htmlFor="compositors">Compositors</Label>
                        <Input
                          id="compositors"
                          name="credits.artists.compositors"
                          value={currentNovel?.credits?.artists?.compositors?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  compositors: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter compositors (comma-separated)"
                        />
                      </div>

                      {/* Typesetters */}
                      <div>
                        <Label htmlFor="typesetters">Typesetters</Label>
                        <Input
                          id="typesetters"
                          name="credits.artists.typesetters"
                          value={currentNovel?.credits?.artists?.typesetters?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  typesetters: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter typesetters (comma-separated)"
                        />
                      </div>

                      {/* Project Managers */}
                      <div>
                        <Label htmlFor="projectManagers">Project Managers</Label>
                        <Input
                          id="projectManagers"
                          name="credits.artists.projectManagers"
                          value={currentNovel?.credits?.artists?.projectManagers?.join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map(name => name.trim()).filter(Boolean);
                            setCurrentNovel(prev => ({
                              ...prev!,
                              credits: {
                                ...prev!.credits,
                                artists: {
                                  ...prev!.credits?.artists,
                                  projectManagers: names
                                }
                              }
                            }));
                          }}
                          placeholder="Enter project managers (comma-separated)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-gradient-to-r from-[#F1592A] to-[#FF7B4D] hover:from-[#E14A1B] hover:to-[#FF6B3D] text-white transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Novel'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {!isAuthor && !isAdmin && (
          <Alert variant="default" className="mb-4 border-yellow-500 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 text-yellow-800 animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>Only authors and administrators can add new novels. If you believe this is an error, please contact support.</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F1592A]"></div>
          </div>
        ) : (
          <motion.div 
            className="bg-gradient-to-br from-[#232120] to-[#2A2827] rounded-lg shadow-lg border border-[#333] overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            transition={{ delayChildren: 0.5 }}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#232120] via-[#2A2827] to-[#333]">
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">Cover</TableHead>
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">Title</TableHead>
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">Status</TableHead>
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">Series Type</TableHead>
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">Primary Style</TableHead>
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-[#F1592A]" />
                      <span>Chapters</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-400" />
                      <span>Rating</span>
                    </div>
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-pink-400" />
                        <span>Uploader</span>
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-white font-bold uppercase text-xs opacity-80">
                    <div className="flex items-center gap-1 justify-center">
                      <Pencil className="h-3.5 w-3.5 text-blue-400" />
                      <span>Actions</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedNovels.length > 0 ? (
                  paginatedNovels.map((novel, index) => (
                    <motion.tr
                      key={novel.novelId}
                      className={`hover:bg-[#2A2827] transition-colors group ${index % 2 === 0 ? 'bg-gradient-to-r from-[#232120]/20 to-[#2A2827]/20' : 'bg-gradient-to-r from-[#2A2827]/40 to-[#232120]/40'}`}
                      variants={itemVariants}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(50, 50, 50, 0.3)' }}
                    >
                      <TableCell className="border-l-4 border-l-transparent group-hover:border-l-[#F1592A] transition-colors">
                        <motion.div 
                          className="relative w-16 h-24 overflow-hidden rounded shadow-md group-hover:shadow-[0_0_15px_rgba(241,89,42,0.3)] transition-shadow"
                          whileHover={{ scale: 1.05 }}
                        >
                        <Image
                            src={novel.coverPhoto || '/placeholder-cover.jpg'}
                          alt={novel.title}
                          fill
                          sizes="64px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          placeholder="blur"
                          blurDataURL="/path/to/placeholder.png"
                        />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </motion.div>
                      </TableCell>
                      <TableCell className="text-white font-medium group-hover:text-[#F1592A] transition-colors">
                        <div className="flex flex-col">
                          <span className="group-hover:text-[#F1592A] text-white transition-colors">{novel.title}</span>
                          {novel.alternativeNames && (
                            <span className="text-xs text-gray-400 truncate max-w-[150px] group-hover:text-gray-300">
                              {novel.alternativeNames}
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          novel.seriesStatus === 'COMPLETED' ? 'bg-green-100 text-green-800 group-hover:bg-green-200 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                          novel.seriesStatus === 'ONGOING' ? 'bg-blue-100 text-blue-800 group-hover:bg-blue-200 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]' :
                          novel.seriesStatus === 'ON HOLD' ? 'bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.4)]' :
                          novel.seriesStatus === 'CANCELLED' ? 'bg-red-100 text-red-800 group-hover:bg-red-200 group-hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                          novel.seriesStatus === 'UPCOMING' ? 'bg-purple-100 text-purple-800 group-hover:bg-purple-200 group-hover:shadow-[0_0_10px_rgba(139,92,246,0.4)]' :
                          'bg-gray-100 text-gray-800 group-hover:bg-gray-200 group-hover:shadow-[0_0_10px_rgba(156,163,175,0.4)]'
                        } transition-all`}>
                          {novel.seriesStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-300 group-hover:text-cyan-300 transition-colors">{novel.seriesType}</TableCell>
                      <TableCell className="text-gray-300 group-hover:text-indigo-300 transition-colors">{novel.styleCategory.primary || 'Not set'}</TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center">
                          <span className="px-3 py-1 bg-gradient-to-r from-[#333]/70 to-[#333]/50 group-hover:from-[#F1592A]/30 group-hover:to-[#FF7B4D]/30 rounded-full text-xs font-medium text-white group-hover:text-white transition-all shadow-sm group-hover:shadow-[0_0_8px_rgba(241,89,42,0.3)]">
                            {novel.totalChapters || 0} Chapters
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center group-hover:scale-110 transition-transform">
                          <Star className="h-4 w-4 text-yellow-400 mr-1 group-hover:text-yellow-300 group-hover:drop-shadow-[0_0_3px_rgba(250,204,21,0.5)]" />
                          <span className="text-white group-hover:text-yellow-100">{novel.rating ? novel.rating.toFixed(1) : 'N/A'}</span>
                        </div>
                      </TableCell>
                      {isAdmin && <TableCell className="text-gray-300 group-hover:text-pink-300 transition-colors">{authorsList.find(author => author.id === novel.uploader)?.username || 'Unknown'}</TableCell>}
                      <TableCell>
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-[#3A3837] hover:to-[#444] shadow-md hover:shadow-[0_0_10px_rgba(156,163,175,0.3)]"
                            onClick={() => { setCurrentNovel(novel); setIsDialogOpen(true); }}
                            title="Edit Novel"
                          >
                            <Pencil className="h-4 w-4 hover:text-blue-300"/>
                          </motion.button>
                          
                      {(isAdmin || isAuthor) && (
                        <Link href={`/admin/novel/${novel.novelId}/chapters`} passHref>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-1.5 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-[#F1592A]/80 hover:to-[#FF7B4D]/80 transition-all shadow-md hover:shadow-[0_0_12px_rgba(241,89,42,0.4)]"
                                title="Manage Chapters"
                              >
                                <BookOpen className="h-4 w-4"/> Chapters
                              </motion.button>
                        </Link>
                      )}
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full bg-gradient-to-r from-[#2A2827]/80 to-[#333]/80 text-white hover:from-red-600/80 hover:to-red-700/80 shadow-md hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                            onClick={() => novel.novelId && handleDelete(novel.novelId)}
                            title="Delete Novel"
                          >
                        <Trash className="h-4 w-4"/>
                          </motion.button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <BookOpen className="h-12 w-12 text-gray-400" />
                        <p className="text-lg text-gray-300 font-medium">No novels found</p>
                        <p className="text-sm text-gray-400 max-w-md">
                          Start adding novels to your collection by clicking the "Add New Novel" button above.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-4 border-t border-[#333]">
                <div className="text-sm text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, novels.length)} of {novels.length} novels
          </div>
                <div className="flex gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-[#333]'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="11 17 6 12 11 7"></polyline>
                      <polyline points="18 17 13 12 18 7"></polyline>
                    </svg>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-[#333]'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </motion.button>
                  
                  {/* Page Number Buttons */}
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1))
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-3 py-1 text-gray-500">...</span>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === page 
                                ? 'bg-[#F1592A] text-white' 
                                : 'text-white hover:bg-[#333]'
                            }`}
                          >
                            {page}
                          </motion.button>
                        </React.Fragment>
                      ))
                    }
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-[#333]'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-[#333]'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="13 17 18 12 13 7"></polyline>
                      <polyline points="6 17 11 12 6 7"></polyline>
                    </svg>
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      <Toaster />
    </div>
  )
}



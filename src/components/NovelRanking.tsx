import Image from 'next/image'
import Link from 'next/link'

const CustomStyles = () => (
  <style jsx global>{`
    @keyframes neonPulse {
      0%, 100% { 
        box-shadow: 0 0 2px #0ff,
                   inset 0 0 2px #0ff;
        border-color: rgba(0, 255, 255, 0.5);
      }
      50% { 
        box-shadow: 0 0 4px #0ff,
                   inset 0 0 3px #0ff;
        border-color: rgba(0, 255, 255, 0.8);
      }
    }

    @keyframes gradientText {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }

    .gradient-text {
      background: linear-gradient(90deg, #F1592A, #ff3d7f, #F1592A);
      background-size: 200% auto;
      color: transparent;
      -webkit-background-clip: text;
      background-clip: text;
      animation: gradientText 3s linear infinite;
    }

    .cool-underline {
      position: relative;
    }

    .cool-underline::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 4px;
      background: linear-gradient(90deg, transparent, #F1592A, transparent);
      border-radius: 2px;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .floating {
      animation: float 3s ease-in-out infinite;
    }

    @keyframes neonFire {
      0%, 100% { 
        box-shadow: 0 0 2px #ff3d7f,
                   inset 0 0 2px #ff3d7f;
        border-color: rgba(255, 61, 127, 0.5);
      }
      50% { 
        box-shadow: 0 0 4px #ff3d7f,
                   inset 0 0 3px #ff3d7f;
        border-color: rgba(255, 61, 127, 0.8);
      }
    }

    @keyframes neonSparkle {
      0%, 100% { 
        box-shadow: 0 0 2px #f0f,
                   inset 0 0 2px #f0f;
        border-color: rgba(255, 0, 255, 0.5);
      }
      50% { 
        box-shadow: 0 0 4px #f0f,
                   inset 0 0 3px #f0f;
        border-color: rgba(255, 0, 255, 0.8);
      }
    }

    .animate-neon-pulse {
      animation: neonPulse 2s ease-in-out infinite;
      border-width: 1.5px;
      position: relative;
      overflow: hidden;
    }

    .animate-neon-fire {
      animation: neonFire 2s ease-in-out infinite;
      border-width: 1.5px;
      position: relative;
      overflow: hidden;
    }

    .animate-neon-sparkle {
      animation: neonSparkle 2s ease-in-out infinite;
      border-width: 1.5px;
      position: relative;
      overflow: hidden;
    }

    .animate-neon-pulse::after,
    .animate-neon-fire::after,
    .animate-neon-sparkle::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 45%,
        rgba(255, 255, 255, 0.1) 48%,
        rgba(255, 255, 255, 0.2) 50%,
        rgba(255, 255, 255, 0.1) 52%,
        transparent 55%
      );
      animation: shine 3s linear infinite;
      pointer-events: none;
    }

    @keyframes shine {
      0% {
        transform: translate(-50%, -50%) rotate(0deg);
      }
      100% {
        transform: translate(-50%, -50%) rotate(360deg);
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(-10px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .novel-item {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      background: transparent;
    }

    .novel-item::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 8px;
      background: linear-gradient(to right, transparent, rgba(241, 89, 42, 0.05));
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: none;
    }

    .novel-item:hover {
      transform: translateX(4px);
    }

    .novel-item:hover::after {
      opacity: 1;
    }

    .novel-rank {
      position: relative;
      transition: all 0.3s ease;
      display: inline-block;
    }

    .novel-item:hover .novel-rank {
      transform: scale(1.1);
      background: linear-gradient(45deg, #F1592A, #ff3d7f);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .novel-cover {
      overflow: hidden;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .novel-item:hover .novel-cover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .novel-title {
      transition: color 0.3s ease;
    }

    .novel-item:hover .novel-title {
      background: linear-gradient(45deg, #F1592A, #ff3d7f);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `}</style>
)

interface Novel {
  novelId: string
  title: string
  coverPhoto: string
  genres: { name: string }[]
  rating: number
  author: string
}

interface NovelRankingsProps {
  newReleases: Novel[]
  trending: Novel[]
  popular: Novel[]
  loading?: boolean
}

export function NovelRankings({ newReleases, trending, popular, loading = false }: NovelRankingsProps) {
  // Display novels
  const renderNovelList = (novels: Novel[], title: string, subtitle: string, animationClass: string, subtitleColor: string) => (
    <div className="bg-[#E7E7E8] dark:bg-[#232120] rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3 pl-8">
        <h2 className="text-3xl font-bold text-[#F1592A] flex items-center gap-2">
          <span className="flex items-center">{title}</span>
          <div className="relative flex items-center">
            <span className={`text-sm px-4 py-1.5 rounded-full ${animationClass} inline-block ${subtitleColor} font-medium border shadow-sm transition-colors`}>
              {subtitle}
            </span>
          </div>
        </h2>
      </div>
      <div className="h-[1px] w-full bg-[#F1592A] mb-4"></div>
      <div className="space-y-6">
        {loading ? (
          // Show skeleton placeholders when loading
          <div className="space-y-6">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg h-[90px] animate-pulse">
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="w-[55px] h-[80px] bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : novels && novels.length > 0 ? (
          novels.slice(0, 5).map((novel, index) => (
            <Link href={`/novel/${novel.novelId}`} key={novel.novelId}>
              <div className="novel-item flex items-center space-x-3 p-3 rounded-lg h-[90px]">
                <span className="novel-rank font-bold text-[#F1592A] w-6 text-base">{(index + 1).toString().padStart(2, '0')}</span>
                <div className="novel-cover">
                  <Image
                    src={novel.coverPhoto || '/assets/cover.jpg'}
                    alt={novel.title}
                    width={55}
                    height={80}
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="flex-1 min-w-0 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="novel-title font-medium text-sm text-[#232120] dark:text-[#E7E7E8] line-clamp-2 mb-0.5">{novel.title}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                        {novel.genres && novel.genres[0]?.name || 'Fantasy'} • {novel.author || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-xs text-yellow-500">★ {novel.rating?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex justify-center py-6 flex-col items-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No novels in this list yet</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section className="pt-4 md:pt-6 bg-[#E7E7E8] dark:bg-[#232120]">
      <CustomStyles />
      <div className="container mx-auto px-3">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold gradient-text cool-underline floating inline-block">
            RANKING
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 max-w-6xl mx-auto">
          {renderNovelList(
            newReleases, 
            "New", 
            "#Latest", 
            "animate-neon-pulse", 
            "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
          )}
          {renderNovelList(
            trending, 
            "Trending", 
            "#Top 5", 
            "animate-neon-fire", 
            "bg-pink-500/10 text-pink-500 border-pink-500/20"
          )}
          {renderNovelList(
            popular, 
            "Popular", 
            "#All Time", 
            "animate-neon-sparkle", 
            "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20"
          )}
        </div>
      </div>
    </section>
  )
}


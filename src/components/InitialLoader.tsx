import { motion } from 'framer-motion';
import Image from 'next/image';

const InitialLoader = () => {
  // Floating particles animation
  const particleVariants = {
    animate: {
      y: [-20, -60, -20],
      opacity: [0, 1, 0],
      scale: [0.5, 1, 0.5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Create multiple particles with different delays
  const particles = Array.from({ length: 8 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-2 h-2 bg-[#F1592A] rounded-full"
      style={{
        left: `${20 + (i * 10)}%`,
        top: `${40 + Math.sin(i) * 20}%`,
      }}
      variants={particleVariants}
      animate="animate"
      transition={{
        delay: i * 0.2,
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  ));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] via-[#232120] to-[#2A2827] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated background grid */}
      <motion.div
        className="absolute inset-0 opacity-10"
        initial={{ scale: 0.8, rotate: 0 }}
        animate={{ scale: 1, rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full" style={{
          background: `
            linear-gradient(90deg, transparent 95%, rgba(241, 89, 42, 0.2) 95%),
            linear-gradient(transparent 95%, rgba(241, 89, 42, 0.2) 95%)
          `,
          backgroundSize: '50px 50px'
        }} />
      </motion.div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles}
      </div>

      {/* Circular pulse rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-96 h-96 border border-[#F1592A] rounded-full opacity-20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 2, 4],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 1.2,
            ease: "easeOut"
          }}
        />
      ))}

      <div className="flex flex-col items-center relative z-10">
        {/* Logo with enhanced animations */}
        <motion.div
          className="relative w-32 h-32 mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: 1, 
            rotate: 0,
          }}
          transition={{ 
            duration: 1,
            type: "spring",
            stiffness: 100,
            damping: 10
          }}
        >
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Image
              src="/assets/favicon.png"
              alt="Novellize"
              fill
              className="object-contain filter drop-shadow-lg"
              priority
            />
          </motion.div>
          
          {/* Glowing ring around logo */}
          <motion.div
            className="absolute inset-0 border-2 border-[#F1592A] rounded-full"
            animate={{ 
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        </motion.div>

        {/* Title with typewriter effect */}
        <motion.div className="text-center">
          <motion.h1 
            className="text-[#F1592A] text-3xl font-bold tracking-[0.2em] mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {"NOVELLIZE".split("").map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: 0.7 + index * 0.1 
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-[#E7E7E8] text-sm tracking-wide opacity-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            Loading your stories...
          </motion.p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          className="w-64 h-1 bg-gray-700 rounded-full mt-8 overflow-hidden"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.8 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#F1592A] via-[#FF8C94] to-[#F1592A] rounded-full"
            animate={{ 
              x: ["-100%", "100%"],
              backgroundPosition: ["0% 50%", "100% 50%"]
            }}
            transition={{ 
              x: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              backgroundPosition: { duration: 1, repeat: Infinity, ease: "linear" }
            }}
            style={{
              backgroundSize: "200% 100%"
            }}
          />
        </motion.div>

        {/* Loading dots */}
        <motion.div
          className="flex space-x-2 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-[#F1592A] rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default InitialLoader; 
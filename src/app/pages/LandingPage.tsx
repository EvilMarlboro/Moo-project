import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionTemplate } from 'motion/react';
import { useNavigate } from 'react-router';
import imgCow from "figma:asset/6316add42ccca59a60d0bddbe5aa1b477fd16b09.png";
import { supabase } from '../lib/supabase';

export function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledPast, setHasScrolledPast] = useState(false);
  
  // Auto-redirect logged-in users to activity hub
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/activity-hub', { replace: true });
      }
    });
  }, [navigate]);

  // Track window scroll instead of container scroll
  const { scrollY } = useScroll();

  // Add spring physics for smooth friction effect
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Transform values for smooth animations with friction
  const opacity = useTransform(smoothScrollY, [0, 400], [1, 0]);
  const scale = useTransform(smoothScrollY, [0, 400], [1, 0.85]);
  const y = useTransform(smoothScrollY, [0, 400], [0, -150]);
  const blurValue = useTransform(smoothScrollY, [0, 400], [0, 8]);
  const filter = useMotionTemplate`blur(${blurValue}px)`;

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      const scrollPercent = (latest / 500) * 100;
      if (scrollPercent > 50 && !hasScrolledPast) {
        setHasScrolledPast(true);
        // Navigate to Browse Hub after scrolling threshold with slight delay
        setTimeout(() => {
          navigate('/browse-hub');
        }, 200);
      }
    });

    return () => unsubscribe();
  }, [scrollY, navigate, hasScrolledPast]);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-[150vh] overflow-x-hidden"
    >
      {/* Landing Page Content */}
      <motion.div 
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden relative"
        style={{ 
          opacity, 
          scale, 
          y,
          filter
        }}
      >
        {/* Container for centered content - moved up */}
        <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto px-8 -mt-40">
          {/* MOO Title with Eyes and Cow side by side */}
          <div className="relative flex items-center gap-0">
            {/* Cow Image - Next to the M, not overlapping */}
            <motion.div 
              className="size-[200px] flex-shrink-0"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <img 
                src={imgCow} 
                alt="MOO Cow Mascot" 
                className="w-full h-full object-contain pointer-events-none"
              />
            </motion.div>

            {/* MOO Title with Eyes */}
            <div className="relative h-[350px] w-[550px]">
              <motion.div 
                className="relative w-full h-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {/* Large M */}
                <p className="absolute font-['Galindo',sans-serif] inset-[16.2%_43.02%_-19.86%_14.19%] leading-[normal] not-italic text-[#f5f5f5] text-[200px] whitespace-pre-wrap">
                  M
                </p>
                
                {/* Right Eye (smaller white background) */}
                <div className="absolute inset-[32.31%_33.78%_39.17%_47.75%]">
                  <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 115.059 113.509">
                    <ellipse cx="57.5293" cy="56.7545" fill="#F5F5F5" rx="57.5293" ry="56.7545" />
                  </svg>
                </div>
                
                {/* Right Eye Pupil */}
                <div className="absolute inset-[43.14%_42.12%_44.58%_50.45%]">
                  <motion.div
                    className="w-full h-full"
                    animate={{
                      x: [0, 5, -5, 0],
                      y: [0, -5, 5, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 46.3041 48.852">
                      <ellipse cx="23.152" cy="24.426" fill="black" rx="23.152" ry="24.426" />
                    </svg>
                  </motion.div>
                </div>

                {/* Left Eye (larger white background) */}
                <div className="absolute inset-[23.29%_0_30.14%_70.27%]">
                  <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 185.216 185.35">
                    <ellipse cx="92.6081" cy="92.6751" fill="#F5F5F5" rx="92.6081" ry="92.6751" />
                  </svg>
                </div>
                
                {/* Left Eye Pupil */}
                <div className="absolute inset-[27.26%_5.18%_51.08%_80.86%]">
                  <motion.div
                    className="w-full h-full"
                    animate={{
                      x: [0, -5, 5, 0],
                      y: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.2
                    }}
                  >
                    <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 86.9955 86.2094">
                      <ellipse cx="43.4977" cy="43.1047" fill="black" rx="43.4977" ry="43.1047" />
                    </svg>
                  </motion.div>
                </div>
                
                {/* Left Eye Reflection */}
                <div className="absolute inset-[32.31%_7.21%_63.36%_90.09%]">
                  <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16.8378 17.2419">
                    <ellipse cx="8.41892" cy="8.62094" fill="#D9D9D9" rx="8.41892" ry="8.62094" />
                  </svg>
                </div>
                
                {/* Right Eye Reflection */}
                <div className="absolute inset-[46.39%_44.14%_51.08%_54.28%]">
                  <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 9.82207 10.0578">
                    <ellipse cx="4.91104" cy="5.02888" fill="#D9D9D9" rx="4.91104" ry="5.02888" />
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Tagline - Centered below MOO icon and cow */}
          <motion.div 
            className="text-center max-w-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <p className="font-['Galindo',sans-serif] text-[#f5f5f5] text-[16px] leading-relaxed drop-shadow-md">
              Match instantly with verified USC students for gaming, sports, studying, campus events, or casual hangouts — all in real time.
            </p>
          </motion.div>
        </div>

        {/* Scroll Down Prompt - Fixed at bottom */}
        <motion.div 
          className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <motion.div
            animate={{
              y: [0, 10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <p className="font-['Galindo',sans-serif] text-[#f5f5f5] text-[28px] leading-tight drop-shadow-lg mb-0">
              Scroll Down To
            </p>
            <p className="font-['Galindo',sans-serif] text-[#f5f5f5] text-[28px] leading-tight drop-shadow-lg">
              Start
            </p>
            <motion.div 
              className="mt-4 mx-auto w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
              animate={{
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <motion.div 
                className="w-1.5 h-2 bg-white/70 rounded-full mt-2"
                animate={{
                  y: [0, 12, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll trigger area with friction */}
      <div className="relative h-[50vh] bg-transparent" />
    </div>
  );
}
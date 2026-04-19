import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionTemplate } from 'motion/react';
import { useNavigate } from 'react-router';
import imgCow from "figma:asset/6316add42ccca59a60d0bddbe5aa1b477fd16b09.png";
import { useAuth } from '../context/AuthContext';

// Natural pixel dimensions of the hero logo (cow + MOO letters side-by-side)
const HERO_W = 750;
const HERO_H = 350;

function computeHeroScale(vw: number) {
  // Leave 32px of horizontal padding (16px each side); never exceed 1
  return Math.min(1, Math.max(0.36, (vw - 32) / HERO_W));
}

export function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledPast, setHasScrolledPast] = useState(false);

  // Compute hero scale from live viewport width so layout never overflows
  const [heroScale, setHeroScale] = useState(() =>
    typeof window !== 'undefined' ? computeHeroScale(window.innerWidth) : 1
  );
  useEffect(() => {
    const update = () => setHeroScale(computeHeroScale(window.innerWidth));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Auto-scroll logged-in users down after a brief delay so the landing page
  // is always seen before navigation, then the scroll listener handles routing.
  useEffect(() => {
    if (loading || !user) return;
    const timer = setTimeout(() => {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, loading]);

  const { scrollY } = useScroll();

  const smoothScrollY = useSpring(scrollY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const opacity = useTransform(smoothScrollY, [0, 400], [1, 0]);
  const exitScale = useTransform(smoothScrollY, [0, 400], [1, 0.85]);
  // Reduce upward travel on small screens so content doesn't clip early
  const yTravel = typeof window !== 'undefined' && window.innerWidth < 640 ? -60 : -150;
  const y = useTransform(smoothScrollY, [0, 400], [0, yTravel]);
  const blurValue = useTransform(smoothScrollY, [0, 400], [0, 8]);
  const filter = useMotionTemplate`blur(${blurValue}px)`;

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest) => {
      const scrollPercent = (latest / 500) * 100;
      if (scrollPercent > 50 && !hasScrolledPast) {
        setHasScrolledPast(true);
        setTimeout(() => {
          if (user && user.username === '') {
            navigate('/profile-setup');
          } else if (user) {
            navigate('/activity-hub');
          } else {
            navigate('/browse-hub');
          }
        }, 200);
      }
    });
    return () => unsubscribe();
  }, [scrollY, navigate, hasScrolledPast, user]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[150vh]"
      style={{ overflowX: 'hidden' }}
    >
      {/* Sticky hero — fills viewport, fades/scales/moves on scroll */}
      <motion.div
        className="sticky top-0 w-full flex flex-col items-center justify-center overflow-hidden relative"
        style={{
          // 100dvh accounts for iOS Safari's collapsible toolbar;
          // fall back to 100vh in browsers that don't support dvh
          height: 'min(100dvh, 100vh)' as any,
          opacity,
          scale: exitScale,
          y,
          filter,
        }}
      >
        {/* Central content block: hero logo + tagline */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 px-4 -mt-10 sm:-mt-16 lg:-mt-20">

          {/*
            Scaling wrapper: gives the hero the correct VISUAL dimensions as
            its LAYOUT dimensions so nothing overflows or misaligns.
            The inner div is always at natural size (750 × 350 px) and scaled
            down via transform; the outer div clips it to the visual footprint.
          */}
          <div
            style={{
              width: HERO_W * heroScale,
              height: HERO_H * heroScale,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: HERO_W,
                height: HERO_H,
                transform: `scale(${heroScale})`,
                transformOrigin: 'top left',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Cow image — slides in from the left */}
              <motion.div
                style={{ width: 200, height: 200, flexShrink: 0 }}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <img
                  src={imgCow}
                  alt="MOO Cow Mascot"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </motion.div>

              {/* MOO letters with animated eye pupils */}
              <div style={{ position: 'relative', width: 550, height: 350 }}>
                <motion.div
                  style={{ position: 'relative', width: '100%', height: '100%' }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  {/* Large M */}
                  <p className="absolute font-['Galindo',sans-serif] inset-[16.2%_43.02%_-19.86%_14.19%] leading-[normal] not-italic text-[#f5f5f5] text-[200px] whitespace-pre-wrap">
                    M
                  </p>

                  {/* Right Eye — white background */}
                  <div className="absolute inset-[32.31%_33.78%_39.17%_47.75%]">
                    <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 115.059 113.509">
                      <ellipse cx="57.5293" cy="56.7545" fill="#F5F5F5" rx="57.5293" ry="56.7545" />
                    </svg>
                  </div>

                  {/* Right Eye Pupil */}
                  <div className="absolute inset-[43.14%_42.12%_44.58%_50.45%]">
                    <motion.div
                      className="w-full h-full"
                      animate={{ x: [0, 5, -5, 0], y: [0, -5, 5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 46.3041 48.852">
                        <ellipse cx="23.152" cy="24.426" fill="black" rx="23.152" ry="24.426" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Left Eye — white background */}
                  <div className="absolute inset-[23.29%_0_30.14%_70.27%]">
                    <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 185.216 185.35">
                      <ellipse cx="92.6081" cy="92.6751" fill="#F5F5F5" rx="92.6081" ry="92.6751" />
                    </svg>
                  </div>

                  {/* Left Eye Pupil */}
                  <div className="absolute inset-[27.26%_5.18%_51.08%_80.86%]">
                    <motion.div
                      className="w-full h-full"
                      animate={{ x: [0, -5, 5, 0], y: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
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
          </div>

          {/* Tagline */}
          <motion.div
            className="text-center max-w-[min(90vw,36rem)] px-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <p className="font-['Galindo',sans-serif] text-[#f5f5f5] leading-relaxed drop-shadow-md"
              style={{ fontSize: `clamp(11px, 2.2vw, 16px)` }}>
              Match instantly with verified USC students for gaming, sports, studying, campus events,
              or casual hangouts — all in real time.
            </p>
          </motion.div>
        </div>

        {/* Scroll Down prompt — pinned to bottom */}
        <motion.div
          className="absolute bottom-6 sm:bottom-14 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <p className="font-['Galindo',sans-serif] text-[#f5f5f5] leading-tight drop-shadow-lg mb-0"
              style={{ fontSize: 'clamp(16px, 4vw, 28px)' }}>
              Scroll Down To
            </p>
            <p className="font-['Galindo',sans-serif] text-[#f5f5f5] leading-tight drop-shadow-lg"
              style={{ fontSize: 'clamp(16px, 4vw, 28px)' }}>
              Start
            </p>
            <motion.div
              className="mt-3 sm:mt-4 mx-auto border-2 border-white/50 rounded-full flex justify-center"
              style={{ width: 'clamp(18px, 4vw, 24px)', height: 'clamp(28px, 6vw, 40px)' }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="bg-white/70 rounded-full mt-2"
                style={{ width: 6, height: 6 }}
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll trigger area — scroll into this to navigate */}
      <div className="relative h-[50vh] bg-transparent" />
    </div>
  );
}

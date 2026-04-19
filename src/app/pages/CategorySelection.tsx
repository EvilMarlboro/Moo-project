import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

type MainCategory = 'gaming' | 'sports' | 'studying' | 'campusEvents';

const CATEGORY_META: Record<MainCategory, { emoji: string; bgEmoji: string; description: string }> = {
  gaming:       { emoji: '🎮', bgEmoji: '🕹️', description: 'Find teammates for competitive and casual gaming sessions' },
  sports:       { emoji: '⚽', bgEmoji: '🏀', description: 'Connect with others for pickup games and athletic activities' },
  studying:     { emoji: '📚', bgEmoji: '✏️', description: 'Study with fellow students in libraries, cafes, or quiet spaces' },
  campusEvents: { emoji: '🎉', bgEmoji: '🎊', description: 'Join others for campus events, clubs, and social activities' },
};

export function CategorySelection() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<MainCategory[]>([]);

  const handleToggleCategory = (category: MainCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleContinue = () => {
    updateUser({ selectedCategories });
    navigate('/activity-selection');
  };

  const handleVibing = () => {
    updateUser({ selectedCategories: [], enabledActivities: [], vibingMode: true });
    navigate('/activity-hub');
  };

  return (
    <div className="relative min-h-screen p-4 py-12 overflow-x-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-400/20 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-pink-400/15 blur-[80px]" />
        <div className="absolute -bottom-32 left-1/4 w-[450px] h-[450px] rounded-full bg-amber-300/15 blur-[100px]" />
        <div className="absolute top-2/3 left-10 w-64 h-64 rounded-full bg-green-400/10 blur-[60px]" />
      </div>

      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-12"
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <motion.span
              className="text-4xl"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >🐮</motion.span>
            <h1 className="text-5xl font-bold text-[#9333EA]">What brings you here?</h1>
            <motion.span
              className="text-4xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.3 }}
            >🐮</motion.span>
          </div>
          <p className="text-muted-foreground text-lg">Select the main categories you're interested in</p>
          {selectedCategories.length > 0 && (
            <motion.p
              className="text-sm font-medium text-purple-600 mt-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              ✨ {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'} selected
            </motion.p>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {(Object.entries(CATEGORY_META) as [MainCategory, typeof CATEGORY_META[MainCategory]][]).map(([key, meta], i) => {
            const isSelected = selectedCategories.includes(key);
            const color = CATEGORY_COLORS[key];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <Card
                  onClick={() => handleToggleCategory(key)}
                  className="relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-2 p-0"
                  style={{
                    borderColor: isSelected ? color : 'transparent',
                    boxShadow: isSelected ? `0 4px 24px ${color}30` : undefined,
                    background: isSelected
                      ? `linear-gradient(135deg, ${color}18 0%, rgba(255,255,255,0.95) 60%)`
                      : 'rgba(243,244,246,0.9)',
                  }}
                >
                  {/* Decorative bg emoji */}
                  <div className="absolute -right-3 -bottom-4 text-[90px] opacity-[0.07] select-none pointer-events-none rotate-[15deg] leading-none">
                    {meta.bgEmoji}
                  </div>

                  <div className="relative p-6 flex items-start gap-4">
                    {/* Emoji badge */}
                    <div
                      className="w-14 h-14 flex items-center justify-center rounded-2xl flex-shrink-0 text-3xl shadow-sm"
                      style={{ backgroundColor: color + '22', border: `2px solid ${color}40` }}
                    >
                      {meta.emoji}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isSelected ? (
                          <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color }} />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-border flex-shrink-0" />
                        )}
                        <h3 style={{ color }}>{key === 'campusEvents' ? 'Campus Events' : key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Vibing Mode */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="relative overflow-hidden p-6 bg-secondary/80 border-2 border-dashed border-border/50">
            <div className="absolute -right-4 -bottom-4 text-[90px] opacity-[0.06] select-none pointer-events-none rotate-[15deg] leading-none">🎵</div>
            <div className="text-center">
              <h3 className="mb-2">Not sure yet? Just Vibing? 🎵</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Skip activity selection and explore the hub freely. You'll be marked as "Vibing" and can browse all activities without committing to any specific ones.
              </p>
              <Button onClick={handleVibing} variant="outline" size="lg" className="px-8">
                Start Vibing
              </Button>
            </div>
          </Card>
        </motion.div>

        <div className="flex justify-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} size="lg">Back</Button>
          <Button onClick={handleContinue} disabled={selectedCategories.length === 0} size="lg" className="px-12">
            Continue to Activity Selection →
          </Button>
        </div>
      </div>
    </div>
  );
}

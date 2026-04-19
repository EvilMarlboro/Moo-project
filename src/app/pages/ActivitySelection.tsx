import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';
import { ACTIVITIES, CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Category = keyof typeof ACTIVITIES;

const CATEGORY_EMOJI: Record<string, string> = {
  gaming: '🎮',
  sports: '⚽',
  studying: '📚',
  campusEvents: '🎉',
};

export function ActivitySelection() {
  const navigate = useNavigate();
  const { user, supabaseUserId, updateUser } = useAuth();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  useEffect(() => {
    if (user?.enabledActivities && user.enabledActivities.length > 0) {
      setSelectedActivities(user.enabledActivities);
    }
  }, [user?.enabledActivities]);

  const selectedCategories = (user?.selectedCategories || []) as Category[];

  const handleToggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleContinue = async () => {
    updateUser({ enabledActivities: selectedActivities });
    if (supabaseUserId) {
      await supabase.from('profiles').upsert({ id: supabaseUserId, enabled_activities: selectedActivities });
    }
    navigate('/activity-profile');
  };

  const allCategories: { key: Category; name: string }[] = [
    { key: 'gaming', name: 'Gaming' },
    { key: 'sports', name: 'Sports' },
    { key: 'studying', name: 'Studying' },
    { key: 'campusEvents', name: 'Campus Events' },
  ];

  const categories = selectedCategories.length > 0
    ? allCategories.filter(cat => selectedCategories.includes(cat.key))
    : allCategories;

  const renderActivities = (categoryKey: Category) => {
    const activities = ACTIVITIES[categoryKey];
    const color = CATEGORY_COLORS[categoryKey];

    if (categoryKey === 'gaming' && typeof activities === 'object' && !Array.isArray(activities)) {
      return (
        <div className="space-y-6">
          {Object.entries(activities).map(([gameType, games]) => (
            <div key={gameType}>
              <h4 className="mb-3 text-muted-foreground font-medium">{gameType}</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(games as string[]).map(game => {
                  const isSelected = selectedActivities.includes(game);
                  return (
                    <button
                      key={game}
                      onClick={() => handleToggleActivity(game)}
                      className={`p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3 hover:scale-[1.02] ${
                        isSelected ? 'bg-secondary border-current' : 'border-border bg-secondary/30 hover:border-current/50'
                      }`}
                      style={isSelected ? { borderColor: color, boxShadow: `0 2px 12px ${color}25` } : {}}
                    >
                      <div className="pt-0.5">
                        {isSelected
                          ? <CheckCircle className="h-5 w-5" style={{ color }} />
                          : <div className="h-5 w-5 rounded-full border-2 border-border" />}
                      </div>
                      <span className="flex-1">{game}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(activities as string[]).map(activity => {
          const isSelected = selectedActivities.includes(activity);
          return (
            <button
              key={activity}
              onClick={() => handleToggleActivity(activity)}
              className={`p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3 hover:scale-[1.02] ${
                isSelected ? 'bg-secondary border-current' : 'border-border bg-secondary/30 hover:border-current/50'
              }`}
              style={isSelected ? { borderColor: color, boxShadow: `0 2px 12px ${color}25` } : {}}
            >
              <div className="pt-0.5">
                {isSelected
                  ? <CheckCircle className="h-5 w-5" style={{ color }} />
                  : <div className="h-5 w-5 rounded-full border-2 border-border" />}
              </div>
              <span className="flex-1">{activity}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen p-4 py-12 overflow-x-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] rounded-full bg-blue-400/15 blur-[100px]" />
        <div className="absolute top-1/2 -left-24 w-96 h-96 rounded-full bg-purple-400/12 blur-[80px]" />
        <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full bg-green-300/12 blur-[90px]" />
      </div>

      <div className="container mx-auto max-w-5xl">
        <motion.div
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <h1 className="mb-2">Select Your Activities</h1>
          <p className="text-muted-foreground">Choose specific activities you're interested in. You can change these later.</p>
          {selectedActivities.length > 0 && (
            <motion.p
              className="text-sm font-medium text-primary mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✨ {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} selected
            </motion.p>
          )}
        </motion.div>

        <div className="space-y-6 mb-8">
          {categories.map(({ key, name }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
            >
              <Card className="relative overflow-hidden p-6 bg-card border-2" style={{ borderColor: CATEGORY_COLORS[key] }}>
                {/* Faint bg emoji */}
                <div className="absolute -right-4 -bottom-4 text-[100px] opacity-[0.06] select-none pointer-events-none rotate-[15deg] leading-none">
                  {CATEGORY_EMOJI[key]}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{CATEGORY_EMOJI[key]}</span>
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                  <h2 style={{ color: CATEGORY_COLORS[key] }}>{name}</h2>
                </div>

                {renderActivities(key)}
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} size="lg">Back</Button>
          <Button onClick={handleContinue} disabled={selectedActivities.length === 0} size="lg" className="px-12">
            Continue to Profile Setup →
          </Button>
        </div>
      </div>
    </div>
  );
}
